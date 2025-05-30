import { ipcMain } from 'electron';
import OpenAI from 'openai';
import { OnylsaidKBService, QueryKnowledgeBaseParams } from '@/service/knowledge_base/onlysaid_kb';
import { Readable } from 'stream';

interface KBStreamData {
  token?: string;
  content?: string;
  error?: string;
  is_final?: boolean;
}

const activeStreams: Record<string, AbortController> = {};

const KB_BASE_URL = process.env.KB_BASE_URL || 'http://localhost:8000';
let kbServiceInstance: OnylsaidKBService | null = null;
const getKBService = () => {
  if (!kbServiceInstance) {
    if (!KB_BASE_URL) {
      console.error("KB_BASE_URL is not configured. KB functionality will not work.");
      throw new Error("Knowledge Base API URL is not configured.");
    }
    kbServiceInstance = new OnylsaidKBService(KB_BASE_URL);
  }
  return kbServiceInstance;
}

export function setupSSEHandlers() {
  ipcMain.handle('streaming:chat_stream_complete', async (event, { messages, options }) => {
    const streamId = options?.streamId;
    let accumulatedResponse = '';
    try {
      console.log("chat_stream_complete received by main process. Messages:", messages, "Options:", options);
      const {
        model,
        temperature = 0.7,
        maxTokens,
        provider,
        kbIds,
        workspaceId,
        topK,
        preferredLanguage,
        messageIdToProcess
      } = options;

      const controller = new AbortController();
      activeStreams[streamId] = controller;

      let buffer = '';

      const sendChunkToRenderer = (contentChunk: string, isFinalChunk = false) => {
        if (contentChunk) {
          buffer += contentChunk;
          accumulatedResponse += contentChunk;

          if (buffer.length >= 5 || (isFinalChunk && buffer.length > 0)) {
            event.sender.send('streaming:chunk', {
              streamId: streamId,
              chunk: {
                content: buffer,
                full: accumulatedResponse,
                timestamp: Date.now()
              }
            });
            buffer = '';
          }
        } else if (isFinalChunk && buffer.length > 0) {
          event.sender.send('streaming:chunk', {
            streamId: streamId,
            chunk: {
              content: buffer,
              full: accumulatedResponse,
              timestamp: Date.now()
            }
          });
          buffer = '';
        }
      };

      if (provider === 'onlysaid-kb') {
        console.log(`Handling 'onlysaid-kb' provider for streamId: ${streamId}`);
        if (!kbIds || kbIds.length === 0) {
          throw new Error("Knowledge Base IDs (kbIds) are required for 'onlysaid-kb' provider.");
        }
        if (!workspaceId) {
          throw new Error("Workspace ID (workspaceId) is required for 'onlysaid-kb' provider.");
        }

        const kbService = getKBService();

        const conversationHistoryMessages = messages.slice(0, -1);
        const currentQueryMessage = messages[messages.length - 1];

        if (!currentQueryMessage || currentQueryMessage.role !== 'user' || !currentQueryMessage.content) {
          throw new Error("Valid user query not found in the last message for 'onlysaid-kb'.");
        }
        const userQueryText = currentQueryMessage.content;

        const queryParams: QueryKnowledgeBaseParams = {
          workspaceId: workspaceId,
          queryText: userQueryText,
          kbIds: kbIds,
          model: model,
          conversationHistory: conversationHistoryMessages,
          topK: topK,
          preferredLanguage: preferredLanguage,
          messageId: messageIdToProcess,
        };

        console.log("Querying KB with params:", queryParams);
        const kbResponse = await kbService.queryKnowledgeBase(queryParams);
        const sseStream = kbResponse.data as Readable;

        return new Promise((resolve, reject) => {
          let lineBuffer = '';
          sseStream.on('data', (chunk: Buffer) => {
            if (controller.signal.aborted) {
              sseStream.destroy();
              return;
            }
            lineBuffer += chunk.toString();
            let EOL_index;
            while ((EOL_index = lineBuffer.indexOf('\n')) >= 0) {
              const line = lineBuffer.substring(0, EOL_index).trim();
              lineBuffer = lineBuffer.substring(EOL_index + 1);

              if (line.startsWith('data:')) {
                const jsonData = line.substring(5).trim();
                if (jsonData) {
                  try {
                    const parsedData: KBStreamData = JSON.parse(jsonData);
                    const content = parsedData.token || parsedData.content || '';
                    if (parsedData.error) {
                      console.error(`Error from KB stream: ${parsedData.error}`);
                      sendChunkToRenderer(`\n[KB Error: ${parsedData.error}]\n`);
                    }
                    if (content) {
                      sendChunkToRenderer(content, parsedData.is_final);
                    }
                    if (parsedData.is_final) {
                      console.log("KB stream marked as final.");
                      sendChunkToRenderer("", true);
                    }
                  } catch (parseError) {
                    console.error('Error parsing JSON from KB SSE stream:', parseError, 'Data:', jsonData);
                  }
                }
              }
            }
          });

          sseStream.on('end', () => {
            console.log(`KB SSE stream ended for streamId: ${streamId}`);
            if (lineBuffer.trim().startsWith('data:')) {
              const jsonData = lineBuffer.trim().substring(5).trim();
              if (jsonData) {
                try {
                  const parsedData: KBStreamData = JSON.parse(jsonData);
                  const content = parsedData.token || parsedData.content || '';
                  if (content) sendChunkToRenderer(content, true);
                } catch (e) {/* ignore */ }
              }
            } else {
              sendChunkToRenderer("", true);
            }
            resolve({ success: true, fullResponse: accumulatedResponse });
          });

          sseStream.on('error', (err) => {
            console.error(`KB SSE stream error for streamId: ${streamId}:`, err);
            reject(err);
          });

          controller.signal.addEventListener('abort', () => {
            console.log(`Aborting KB SSE stream for streamId: ${streamId}`);
            sseStream.destroy();
            resolve({ success: true, aborted: true, fullResponse: accumulatedResponse });
          });
        });

      } else {
        let openai;
        let completionStream;

        const selectedProvider = provider || (model.startsWith('gpt-') ? 'openai' : model.startsWith('deepseek-') ? 'deepseek' : model.startsWith('oneasia-') ? 'oneasia' : 'ollama');
        console.log(`Using provider: ${selectedProvider} for model: ${model}`);

        switch (selectedProvider) {
          case 'openai':
            openai = new OpenAI({
              baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
              apiKey: options.apiKeys.openAI,
            });
            completionStream = await openai.chat.completions.create({
              model: model,
              messages,
              temperature,
              max_tokens: maxTokens,
              stream: true,
            }, { signal: controller.signal });
            break;
          case 'deepseek':
            openai = new OpenAI({
              baseURL: "https://api.deepseek.com",
              apiKey: options.apiKeys.deepSeek,
            });
            completionStream = await openai.chat.completions.create({
              model: model,
              messages: messages,
              temperature,
              max_tokens: maxTokens,
              stream: true,
            }, { signal: controller.signal });
            break;
          case 'oneasia':
            if (!options.apiKeys.oneasia) {
              throw new Error("Oneasia vLLM API key is missing.");
            }

            // Map model ID to actual model path
            let actualModel = model;
            if (model === 'oneasia-llama') {
              actualModel = '/pfss/cm/shared/llm_models/Llama-3.3-70B-Instruct';
            }

            // Use custom fetch for Oneasia vLLM since it uses different auth
            const oneasiaResponse = await fetch("https://vllm.oasishpc.hk/v1/chat/completions", {
              method: 'POST',
              headers: {
                'apiKey': options.apiKeys.oneasia,
                'accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: actualModel, // Use the mapped model path
                messages: messages,
                temperature,
                max_tokens: maxTokens,
                stream: true,
              }),
              signal: controller.signal,
            });

            if (!oneasiaResponse.ok) {
              throw new Error(`Oneasia vLLM API error: ${oneasiaResponse.status} ${oneasiaResponse.statusText}`);
            }

            const reader = oneasiaResponse.body?.getReader();
            if (!reader) {
              throw new Error("Failed to get response reader from Oneasia vLLM");
            }

            const decoder = new TextDecoder();
            let buffer = '';

            try {
              while (true) {
                if (controller.signal.aborted) break;

                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmedLine = line.trim();
                  if (trimmedLine.startsWith('data: ')) {
                    const data = trimmedLine.slice(6);
                    if (data === '[DONE]') {
                      sendChunkToRenderer("", true);
                      return { success: true, fullResponse: accumulatedResponse };
                    }

                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices?.[0]?.delta?.content || '';
                      if (content) {
                        sendChunkToRenderer(content);
                      }
                    } catch (e) {
                      console.warn('Failed to parse Oneasia vLLM SSE data:', data);
                    }
                  }
                }
              }
            } finally {
              reader.releaseLock();
            }

            sendChunkToRenderer("", true);
            return { success: true, fullResponse: accumulatedResponse };
          case 'ollama':
          default:
            if (!options.ollamaConfig || !options.ollamaConfig.baseUrl) {
              throw new Error("Ollama base URL is not configured.");
            }
            openai = new OpenAI({
              baseURL: options.ollamaConfig.baseUrl,
              apiKey: 'ollama',
            });
            completionStream = await openai.chat.completions.create({
              model,
              messages,
              temperature,
              max_tokens: maxTokens,
              stream: true,
            }, { signal: controller.signal });
            break;
        }

        for await (const chunk of completionStream) {
          if (controller.signal.aborted) break;
          const content = chunk.choices[0]?.delta?.content || '';
          sendChunkToRenderer(content);
        }
        sendChunkToRenderer("", true);
        return { success: true, fullResponse: accumulatedResponse };
      }

    } catch (error: any) {
      console.error(`Error in chat_stream_complete for streamId ${streamId}:`, error);
      const controllerForStream = streamId ? activeStreams[streamId] : null;
      if (error.name === 'AbortError' || controllerForStream?.signal.aborted) {
        return { success: true, aborted: true, fullResponse: accumulatedResponse || "" };
      }
      return { success: false, error: error.message, fullResponse: accumulatedResponse || "" };
    } finally {
      if (streamId && activeStreams[streamId]) {
        delete activeStreams[streamId];
        console.log(`Cleaned up activeStream for ${streamId}`);
      }
    }
  });

  ipcMain.handle('streaming:abort_stream', async (event, { streamId }) => {
    console.log("abort_stream requested for streamId:", streamId);
    if (activeStreams[streamId]) {
      activeStreams[streamId].abort();
      console.log(`Abort signal sent for streamId ${streamId}.`);
      return { success: true, message: `Stream ${streamId} abortion initiated.` };
    }
    return { success: false, message: `Stream ${streamId} not found or already completed.` };
  });

  ipcMain.handle('ai:get_completion', async (event, { messages, options }) => {
    console.log("ai:get_completion received by main process. Messages:", messages, "Options:", options);
    try {
      const {
        model,
        temperature = 0.7,
        maxTokens,
        provider,
        apiKeys,
        ollamaConfig,
        tools,
        tool_choice
      } = options;

      if (!provider || !model) {
        throw new Error("Provider and model are required for ai:get_completion.");
      }

      let openai;
      const selectedProvider = provider;

      console.log(`Using provider: ${selectedProvider} for model: ${model} in ai:get_completion`);

      switch (selectedProvider) {
        case 'openai':
          if (!apiKeys?.openAI) throw new Error("OpenAI API key is missing.");
          openai = new OpenAI({
            baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
            apiKey: apiKeys.openAI,
          });
          break;
        case 'deepseek':
          if (!apiKeys?.deepSeek) throw new Error("DeepSeek API key is missing.");
          openai = new OpenAI({
            baseURL: "https://api.deepseek.com",
            apiKey: apiKeys.deepSeek,
          });
          break;
        case 'oneasia':
          if (!apiKeys?.oneasia) throw new Error("Oneasia vLLM API key is missing.");
          openai = new OpenAI({
            baseURL: "https://vllm.oasishpc.hk/v1",
            apiKey: "dummy", // Oneasia uses apiKey header instead
            defaultHeaders: {
              'apiKey': apiKeys.oneasia,
            },
          });
          break;
        case 'ollama':
          if (!ollamaConfig?.baseUrl) {
            throw new Error("Ollama base URL is not configured in options for ai:get_completion.");
          }
          openai = new OpenAI({
            baseURL: ollamaConfig.baseUrl,
            apiKey: 'ollama',
          });
          break;
        default:
          throw new Error(`Unsupported provider: ${selectedProvider} for ai:get_completion.`);
      }

      const completionPayload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: model,
        messages: messages,
        temperature: temperature,
        stream: false,
      };

      if (maxTokens) {
        completionPayload.max_tokens = maxTokens;
      }
      if (tools && tools.length > 0) {
        completionPayload.tools = tools;
        completionPayload.tool_choice = tool_choice || "auto";
      }

      const completion = await openai.chat.completions.create(completionPayload);

      return { success: true, completion };

    } catch (error: any) {
      console.error(`Error in ai:get_completion:`, error.message, error.stack);
      return { success: false, error: error.message };
    }
  });
}

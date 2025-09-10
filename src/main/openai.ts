import { ipcMain } from 'electron';
import OpenAI from 'openai';
import { LightRAGService, QueryKnowledgeBaseParams } from '@/service/knowledge_base/lightrag_kb'; // Updated import
import { Readable } from 'stream';
import https from 'https';

interface LightRAGStreamData {
  response?: string; // ✅ LightRAG uses "response" field, not "token" or "content"
  error?: string;
  is_final?: boolean;
}

const activeStreams: Record<string, AbortController> = {};

// Update to use LightRAG URL
const LIGHTRAG_BASE_URL = process.env.KB_BASE_URL || 'http://lightrag.onlysaid-dev.com';
let lightragServiceInstance: LightRAGService | null = null;

const getLightRAGService = () => {
  if (!lightragServiceInstance) {
    if (!LIGHTRAG_BASE_URL) {
      console.error("LIGHTRAG_BASE_URL is not configured. LightRAG functionality will not work.");
      throw new Error("LightRAG API URL is not configured.");
    }
    lightragServiceInstance = new LightRAGService(LIGHTRAG_BASE_URL);
  }
  return lightragServiceInstance;
}

export function setupSSEHandlers() {
  ipcMain.handle('streaming:chat_stream_complete', async (event, { messages, options }) => {
    const streamId = options?.streamId;
    let accumulatedResponse = '';
    let totalChunksReceived = 0;
    let totalBytesSent = 0;
    
    try {
      console.log("🚀 [Main] chat_stream_complete received");
      console.log("📥 [Main] Messages count:", messages?.length);
      
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

      console.log(`🔍 [Main] Provider: ${provider}, Model: ${model}`);

      const controller = new AbortController();
      activeStreams[streamId] = controller;

      let buffer = '';

      const sendChunkToRenderer = (contentChunk: string, isFinalChunk = false) => {
        if (contentChunk) {
          buffer += contentChunk;
          accumulatedResponse += contentChunk;
          totalBytesSent += contentChunk.length;
          totalChunksReceived++;

          if (buffer.length >= 1 || (isFinalChunk && buffer.length > 0)) {
            const chunkData = {
              streamId: streamId,
              chunk: {
                content: buffer,
                full: accumulatedResponse,
                timestamp: Date.now()
              }
            };
            
            event.sender.send('streaming:chunk', chunkData);
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

      // Update provider check from 'onlysaid-kb' to 'lightrag'
      if (provider === 'lightrag' || provider === 'onlysaid-kb') {
        console.log(`🎯 [Main] Using LightRAG provider`);
        
        const lightragService = getLightRAGService();

        const conversationHistoryMessages = messages.slice(0, -1);
        const currentQueryMessage = messages[messages.length - 1];

        if (!currentQueryMessage || currentQueryMessage.role !== 'user' || !currentQueryMessage.content) {
          throw new Error("Valid user query not found in the last message for LightRAG.");
        }
        const userQueryText = currentQueryMessage.content;

        const queryParams: QueryKnowledgeBaseParams = {
          workspaceId: workspaceId || 'default',
          queryText: userQueryText,
          kbIds: kbIds,
          model: model,
          conversationHistory: conversationHistoryMessages,
          topK: topK,
          preferredLanguage: preferredLanguage,
          messageId: messageIdToProcess,
          mode: "hybrid"
        };

        console.log("🔧 [Main] Querying LightRAG with query:", userQueryText.substring(0, 100) + "...");
        
        try {
          const lightragResponse = await lightragService.queryKnowledgeBase(queryParams);
          console.log("✅ [Main] LightRAG response received");
          
          const sseStream = lightragResponse.data as Readable;

          return new Promise((resolve, reject) => {
            let lineBuffer = '';
            let chunkCount = 0;
            let totalBytesReceived = 0;
            
            sseStream.on('data', (chunk: Buffer) => {
              if (controller.signal.aborted) {
                sseStream.destroy();
                return;
              }
              
              totalBytesReceived += chunk.length;
              const chunkStr = chunk.toString();
              chunkCount++;
              
              lineBuffer += chunkStr;
              let EOL_index;
              
              while ((EOL_index = lineBuffer.indexOf('\n')) >= 0) {
                const line = lineBuffer.substring(0, EOL_index).trim();
                lineBuffer = lineBuffer.substring(EOL_index + 1);

                // ✅ Handle direct JSON responses (LightRAG format)
                if (line.startsWith('{') && line.endsWith('}')) {
                  try {
                    const parsedData: LightRAGStreamData = JSON.parse(line);
                    
                    if (parsedData.response) {
                      sendChunkToRenderer(parsedData.response);
                    } else if (parsedData.error) {
                      console.error(`❌ [Main] Error from LightRAG stream: ${parsedData.error}`);
                      sendChunkToRenderer(`\n[LightRAG Error: ${parsedData.error}]\n`);
                    }
                  } catch (parseError) {
                    console.error('❌ [Main] Error parsing JSON from LightRAG stream:', parseError);
                    // If JSON parsing fails, treat as plain text
                    if (line.trim()) {
                      sendChunkToRenderer(line);
                    }
                  }
                }
                // ✅ Handle SSE format (data: prefix)
                else if (line.startsWith('data:')) {
                  const jsonData = line.substring(5).trim();
                  
                  if (jsonData && jsonData !== '[DONE]') {
                    try {
                      const parsedData: LightRAGStreamData = JSON.parse(jsonData);
                      
                      if (parsedData.response) {
                        sendChunkToRenderer(parsedData.response);
                      } else if (parsedData.error) {
                        console.error(`❌ [Main] Error from LightRAG SSE stream: ${parsedData.error}`);
                        sendChunkToRenderer(`\n[LightRAG Error: ${parsedData.error}]\n`);
                      }
                    } catch (parseError) {
                      console.error('❌ [Main] Error parsing JSON from LightRAG SSE stream:', parseError);
                      // If JSON parsing fails, treat as plain text
                      if (jsonData) {
                        sendChunkToRenderer(jsonData);
                      }
                    }
                  } else if (jsonData === '[DONE]') {
                    sendChunkToRenderer("", true);
                  }
                }
                // ✅ Handle plain text responses
                else if (line.trim()) {
                  sendChunkToRenderer(line);
                }
              }
            });

            sseStream.on('end', () => {
              console.log(`🏁 [Main] LightRAG stream completed - ${totalChunksReceived} chunks, ${accumulatedResponse.length} chars`);
              
              // Process any remaining data in buffer
              if (lineBuffer.trim()) {
                if (lineBuffer.trim().startsWith('{')) {
                  try {
                    const parsedData: LightRAGStreamData = JSON.parse(lineBuffer.trim());
                    if (parsedData.response) {
                      sendChunkToRenderer(parsedData.response, true);
                    }
                  } catch (e) {
                    sendChunkToRenderer(lineBuffer.trim(), true);
                  }
                } else {
                  sendChunkToRenderer(lineBuffer.trim(), true);
                }
              } else {
                sendChunkToRenderer("", true);
              }
              
              resolve({ success: true, fullResponse: accumulatedResponse });
            });

            sseStream.on('error', (err) => {
              console.error(`❌ [Main] LightRAG SSE stream error:`, err.message);
              reject(err);
            });

            controller.signal.addEventListener('abort', () => {
              console.log(`🛑 [Main] Aborting LightRAG SSE stream`);
              sseStream.destroy();
              resolve({ success: true, aborted: true, fullResponse: accumulatedResponse });
            });
          });
        } catch (lightragError) {
          console.error(`❌ [Main] LightRAG service error:`, lightragError);
          throw lightragError;
        }

      } else {
        console.log(`🔄 [Main] Using provider: ${provider}`);
        let openai;
        let completionStream;

        const selectedProvider = provider || (model.startsWith('gpt-') ? 'openai' : model.startsWith('deepseek-') ? 'deepseek' : model.startsWith('oneasia-') ? 'oneasia' : 'ollama');

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
          case 'h20':
            let h20Model = model;
            if (model === 'Llama-4-Maverick-17B-128E-Instruct-FP8') {
              h20Model = 'Llama-4-Maverick-17B-128E-Instruct-FP8'; // Keep the exact model name
            }

            const h20Payload = JSON.stringify({
              model: h20Model,
              messages: messages,
              temperature,
              max_tokens: maxTokens,
              stream: true,
            });

            const h20Headers: Record<string, string> = {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'OnlySaid/1.0.0',
              'Content-Length': Buffer.byteLength(h20Payload).toString()
            };

            // Only add Authorization if API key exists
            if (options.apiKeys.h20) {
              h20Headers['Authorization'] = `Bearer ${options.apiKeys.h20}`;
            }

            const h20Options = {
              hostname: 'askgenie-api.oagpuservices.com',
              port: 443,
              path: '/v1/chat/completions',
              method: 'POST',
              headers: h20Headers,
              rejectUnauthorized: false
            };

            return new Promise((resolve, reject) => {
              const h20Req = https.request(h20Options, (h20Res) => {
                if (h20Res.statusCode !== 200) {
                  let errorBody = '';
                  h20Res.on('data', chunk => errorBody += chunk);
                  h20Res.on('end', () => {
                    console.error(`H20 API error response: ${errorBody}`);
                    reject(new Error(`H20 API error: ${h20Res.statusCode} ${h20Res.statusMessage} - ${errorBody}`));
                  });
                  return;
                }

                let h20Buffer = '';
                
                h20Res.on('data', (chunk) => {
                  if (controller.signal.aborted) {
                    h20Res.destroy();
                    return;
                  }
                  
                  h20Buffer += chunk.toString();
                  const lines = h20Buffer.split('\n');
                  h20Buffer = lines.pop() || '';

                  for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                      const data = trimmedLine.slice(6);
                      if (data === '[DONE]') {
                        sendChunkToRenderer("", true);
                        resolve({ success: true, fullResponse: accumulatedResponse });
                        return;
                      }

                      try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content || '';
                        if (content) {
                          sendChunkToRenderer(content);
                        }
                      } catch (e) {
                        console.warn('Failed to parse H20 SSE data:', data);
                      }
                    }
                  }
                });

                h20Res.on('end', () => {
                  sendChunkToRenderer("", true);
                  resolve({ success: true, fullResponse: accumulatedResponse });
                });

                h20Res.on('error', (error) => {
                  console.error('H20 response error:', error);
                  reject(error);
                });
              });

              h20Req.on('error', (error) => {
                console.error('H20 request error:', error);
                reject(error);
              });

              controller.signal.addEventListener('abort', () => {
                h20Req.destroy();
                resolve({ success: true, aborted: true, fullResponse: accumulatedResponse });
              });

              h20Req.write(h20Payload);
              h20Req.end();
            });
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
      console.error(`💥 [Main] Error in chat_stream_complete for streamId ${streamId}:`, error.message);
      
      const controllerForStream = streamId ? activeStreams[streamId] : null;
      if (error.name === 'AbortError' || controllerForStream?.signal.aborted) {
        return { success: true, aborted: true, fullResponse: accumulatedResponse || "" };
      }
      return { success: false, error: error.message, fullResponse: accumulatedResponse || "" };
    } finally {
      if (streamId && activeStreams[streamId]) {
        delete activeStreams[streamId];
        console.log(`🧹 [Main] Cleaned up activeStream for ${streamId}`);
      }
    }
  });

  ipcMain.handle('streaming:abort_stream', async (event, { streamId }) => {
    if (activeStreams[streamId]) {
      activeStreams[streamId].abort();
      console.log(`🛑 [Main] Stream ${streamId} aborted`);
      return { success: true, message: `Stream ${streamId} abortion initiated.` };
    }
    return { success: false, message: `Stream ${streamId} not found or already completed.` };
  });

  ipcMain.handle('ai:get_completion', async (event, { messages, options }) => {
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

      console.log(`🤖 [Main] ai:get_completion - Provider: ${selectedProvider}, Model: ${model}`);

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
      console.error(`❌ [Main] Error in ai:get_completion:`, error.message);
      return { success: false, error: error.message };
    }
  });
}

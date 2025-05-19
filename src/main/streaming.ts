import { ipcMain } from 'electron';
import OpenAI from 'openai';

const activeStreams: Record<string, AbortController> = {};

export function setupSSEHandlers() {
  ipcMain.handle('streaming:chat_stream_complete', async (event, { messages, options }) => {
    try {
      const { model = 'gpt-4', temperature = 0.7, maxTokens, streamId } = options;
      console.log("chat_stream_complete", model, temperature, maxTokens);

      let stream;
      let openai;

      const controller = new AbortController();
      activeStreams[streamId] = controller;

      switch (model) {
        case 'gpt-4':
          openai = new OpenAI({
            baseURL: process.env.OPENAI_API_BASE_URL,
            apiKey: options.apiKeys.openAI,
          });
          stream = await openai.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }, {
            signal: controller.signal,
          });
          break;
        case 'deepseek-chat':
          openai = new OpenAI({
            baseURL: "https://api.deepseek.com",
            apiKey: options.apiKeys.deepSeek,
            dangerouslyAllowBrowser: true
          });
          stream = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: messages,
            stream: true
          }, {
            signal: controller.signal,
          });
          break;
        default:
          openai = new OpenAI({
            baseURL: options.ollamaConfig.baseUrl,
            apiKey: options.apiKeys.ollama,
          });
          stream = await openai.chat.completions.create({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }, {
            signal: controller.signal,
          });
          break;
      }

      let accumulatedResponse = '';
      let buffer = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          buffer += content;
          accumulatedResponse += content;

          if (buffer.length >= 5) {
            event.sender.send('streaming:chunk', {
              streamId: options.streamId,
              chunk: {
                content: buffer,
                full: accumulatedResponse,
                timestamp: Date.now()
              }
            });
            buffer = '';
          }
        }
      }

      if (buffer.length > 0) {
        event.sender.send('streaming:chunk', {
          streamId: options.streamId,
          chunk: {
            content: buffer,
            full: accumulatedResponse,
            timestamp: Date.now()
          }
        });
        buffer = '';
      }

      return { success: true, fullResponse: accumulatedResponse };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: true, aborted: true };
      }
      return { success: false, error: error.message };
    } finally {
      if (activeStreams[options.streamId]) {
        delete activeStreams[options.streamId];
      }
    }
  });


  ipcMain.handle('streaming:abort_stream', (event, { streamId }) => {
    if (activeStreams[streamId]) {
      console.log("abortStream", streamId);
      activeStreams[streamId].abort();
      delete activeStreams[streamId];
      return { success: true };
    }
    return { success: false, error: 'No active stream found' };
  });

  ipcMain.handle('streaming:query_stream_complete', async (event, { query, options }) => {
    // This is a dummy handler for query_stream_complete
    console.log("streaming:query_stream_complete", query, options);
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 100));
    // Simulate sending a chunk
    event.sender.send('streaming:chunk', {
      streamId: options.streamId,
      chunk: {
        content: "Dummy query response chunk.",
        full: "Dummy query response chunk.",
        timestamp: Date.now()
      }
    });
    return { success: true, fullResponse: "Dummy query full response." };
  });
}

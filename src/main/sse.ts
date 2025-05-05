import { ipcMain } from 'electron';
import OpenAI from 'openai';

export function setupSSEHandlers() {
  // Handle chat completion streaming
  ipcMain.handle('sse:chat_stream_complete', async (event, { messages, options }) => {
    try {
      const { model = 'gpt-4', temperature = 0.7, maxTokens, streamId } = options;
      console.log("chat_stream_complete", model, temperature, maxTokens);

      let stream;
      let openai;

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
          });
          break;
        case 'deepseek-chat':
          console.log("deepseek", options.apiKeys.deepSeek);
          console.log(messages);
          openai = new OpenAI({
            baseURL: "https://api.deepseek.com",
            apiKey: options.apiKeys.deepSeek,
            dangerouslyAllowBrowser: true
          });
          console.log("deepseek", openai);
          stream = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: messages,
            stream: true
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
          });
          break;
      }

      // Set up variables to track response
      let accumulatedResponse = '';

      // Start streaming chunks in real-time
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          accumulatedResponse += content;

          // Explicitly send with streamId
          const chunkData = {
            content,
            full: accumulatedResponse,
            timestamp: Date.now()
          };

          event.sender.send('sse:chunk', {
            streamId: options.streamId,
            chunk: chunkData
          });
        }
      }

      // Return success when done
      return { success: true, fullResponse: accumulatedResponse };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Regular chat completion
  ipcMain.handle('sse:chat_complete', async (event, { messages, options }) => {
    try {
      const { model = 'gpt-4', temperature = 0.7, maxTokens } = options;

      let openai;

      switch (model) {
        case 'gpt-4':
          openai = new OpenAI({
            baseURL: process.env.OPENAI_API_BASE_URL,
            apiKey: options.apiKeys.openAI,
          });
          break;
        case 'deepseek-chat':
          openai = new OpenAI({
            baseURL: "https://api.deepseek.com",
            apiKey: options.apiKeys.deepSeek,
          });
          break;
        default:
          openai = new OpenAI({
            baseURL: options.ollamaConfig.baseUrl,
            apiKey: options.apiKeys.ollama,
          });
          break;
      }

      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      return {
        success: true,
        content: response.choices[0]?.message.content || ''
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Image generation
  ipcMain.handle('sse:generate_image', async (event, { prompt, options = {} }) => {
    try {
      const { model = 'gpt-4', size = '1024x1024' } = options;

      let openai;

      switch (model) {
        case 'gpt-4':
          openai = new OpenAI({
            baseURL: process.env.OPENAI_API_BASE_URL,
            apiKey: options.apiKeys.openAI,
          });
          break;
        default:
          openai = new OpenAI({
            baseURL: options.ollamaConfig.baseUrl,
            apiKey: options.apiKeys.ollama,
          });
          break;
      }


      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        size,
        n: 1,
      });

      return { success: true, url: response.data[0]?.url };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

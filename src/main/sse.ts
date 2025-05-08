import { ipcMain } from 'electron';
import OpenAI from 'openai';

const activeStreams: Record<string, AbortController> = {};

export function setupSSEHandlers() {
    // Handle chat completion streaming
    ipcMain.handle('sse:chat_stream_complete', async (event, { messages, options }) => {
        try {
            const { model = 'gpt-4', temperature = 0.7, maxTokens, streamId } = options;
            console.log("chat_stream_complete", model, temperature, maxTokens);

            let stream;
            let openai;

            // Create an AbortController for this stream
            const controller = new AbortController();
            activeStreams[streamId] = controller;

            // OpenAI calls with abort signal
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

            // Set up variables to track response
            let accumulatedResponse = '';
            let buffer = '';

            // Start streaming chunks in real-time
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    buffer += content;
                    accumulatedResponse += content;

                    // Send in smaller chunks (e.g., 5)
                    if (buffer.length >= 5) { // Changed from 20
                        event.sender.send('sse:chunk', {
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

            // Send any remaining buffered content when the stream ends
            if (buffer.length > 0) {
                event.sender.send('sse:chunk', {
                    streamId: options.streamId,
                    chunk: {
                        content: buffer,
                        full: accumulatedResponse,
                        timestamp: Date.now()
                    }
                });
                buffer = ''; // Clear buffer after sending
            }

            // Return success when done
            return { success: true, fullResponse: accumulatedResponse };
        } catch (error: any) {
            // Check if this is an abort error
            if (error.name === 'AbortError') {
                return { success: true, aborted: true };
            }
            return { success: false, error: error.message };
        } finally {
            // Clean up the controller
            if (activeStreams[options.streamId]) {
                delete activeStreams[options.streamId];
            }
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

            return { success: true, url: response.data?.[0]?.url };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('sse:abort_stream', (event, { streamId }) => {
        if (activeStreams[streamId]) {
            console.log("abortStream", streamId);
            activeStreams[streamId].abort();
            delete activeStreams[streamId];
            return { success: true };
        }
        return { success: false, error: 'No active stream found' };
    });
}

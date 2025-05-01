import OpenAI from 'openai';
import { useSSEStore } from '../providers/SSEProvider';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: "Your API key",
  dangerouslyAllowBrowser: true,
});

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenAIStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streamId: string;
}

export const OpenAIService = {
  /**
   * Stream a chat completion from OpenAI
   */
  async streamChatCompletion(
    messages: OpenAIMessage[],
    options: OpenAIStreamOptions
  ) {
    const { streamId, model = 'gpt-4', temperature = 0.7, maxTokens } = options;
    const { clearMessages } = useSSEStore.getState();

    // Clear previous messages for this stream
    clearMessages(streamId);

    // Set connecting state
    useSSEStore.setState((state) => ({
      isConnecting: { ...state.isConnecting, [streamId]: true },
      errors: { ...state.errors, [streamId]: null }
    }));

    try {
      const stream = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      let accumulatedResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          accumulatedResponse += content;

          // Update the store with the new chunk
          useSSEStore.setState((state) => ({
            messages: {
              ...state.messages,
              [streamId]: [...(state.messages[streamId] || []), {
                content,
                full: accumulatedResponse,
                timestamp: Date.now()
              }]
            }
          }));
        }
      }

      return accumulatedResponse;
    } catch (error) {
      // Handle errors
      useSSEStore.setState((state) => ({
        errors: { ...state.errors, [streamId]: error as Error }
      }));
      throw error;
    } finally {
      // Mark as not connecting anymore
      useSSEStore.setState((state) => ({
        isConnecting: { ...state.isConnecting, [streamId]: false }
      }));
    }
  },

  /**
   * Non-streaming chat completion
   */
  async chatCompletion(
    messages: OpenAIMessage[],
    options: Omit<OpenAIStreamOptions, 'streamId'> = {}
  ) {
    const { model = 'gpt-4', temperature = 0.7, maxTokens } = options;

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message.content || '';
  },

  /**
   * Generate an image with DALL-E
   */
  async generateImage(
    prompt: string,
    options: { size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792' } = {}
  ) {
    const { size = '1024x1024' } = options;

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size,
      n: 1,
    });

    return response.data[0]?.url;
  }
};

import { create } from 'zustand';
import { useLLMConfigurationStore } from '../LLM/LLMConfiguration';

interface StreamMessage {
  content: string;
  full: string;
  timestamp: number;
}

interface StreamState {
  // State
  connections: Record<string, EventSource | null>;
  messages: Record<string, StreamMessage>;
  isConnecting: Record<string, boolean>;
  errors: Record<string, Error | null>;

  // Actions
  connect: (id: string, url: string) => void;
  disconnect: (id: string) => void;
  disconnectAll: () => void;
  clearMessages: (id: string) => void;

  // Add new abort action
  abortStream: (streamId: string) => void;

  // OpenAI Streaming via IPC
  streamChatCompletion: (
    messages: OpenAIMessage[],
    options: OpenAIStreamOptions
  ) => Promise<string>;
}

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenAIStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streamId: string;
  provider?: "openai" | "deepseek" | "ollama" | "onlysaid-kb" | "lightrag" | null; // ✅ Added "lightrag"
  kbIds?: string[];
}

export const useStreamStore = create<StreamState>((set, get) => {
  // Add batching mechanism
  let batchedChunks: Record<string, StreamMessage[]> = {};
  let batchUpdateTimers: Record<string, NodeJS.Timeout> = {};
  const BATCH_INTERVAL = 50; // Reduce from 60ms to 50ms
  let lastBatchTime = 0;

  // Helper to flush remaining chunks and finalize stream state
  const flushAndFinalizeStream = (streamId: string) => {
    if (batchUpdateTimers[streamId]) {
      clearTimeout(batchUpdateTimers[streamId]);
    }

    const pendingChunks = batchedChunks[streamId];
    let finalStateUpdate: Partial<StreamState> = {
      isConnecting: { ...get().isConnecting, [streamId]: false }
    };

    if (pendingChunks?.length > 0) {
      const latestOverallChunk = pendingChunks[pendingChunks.length - 1];
      finalStateUpdate.messages = { ...get().messages, [streamId]: latestOverallChunk };
    }

    set(state => ({
      ...state,
      messages: finalStateUpdate.messages || state.messages,
      isConnecting: finalStateUpdate.isConnecting || state.isConnecting,
    }));

    if (batchedChunks[streamId]) {
      delete batchedChunks[streamId];
    }
    if (batchUpdateTimers[streamId]) {
      delete batchUpdateTimers[streamId];
    }
  };

  if (typeof window !== 'undefined' && window.electron) {
    window.electron.ipcRenderer.on('streaming:chunk', (...args) => {
      if (!args || args.length === 0) return;

      const payload = args[1];

      if (!payload || typeof payload !== 'object' ||
        !('streamId' in payload) || !('chunk' in payload)) {
        console.error('Invalid streaming:chunk payload:', payload);
        return;
      }

      const { streamId, chunk } = payload as { streamId: string; chunk: StreamMessage };
      if (!streamId || !chunk) return;

      if (!batchedChunks[streamId]) {
        batchedChunks[streamId] = [];
      }
      batchedChunks[streamId].push(chunk);

      if (batchUpdateTimers[streamId]) {
        clearTimeout(batchUpdateTimers[streamId]);
      }

      batchUpdateTimers[streamId] = setTimeout(() => {
        if (batchedChunks[streamId]?.length > 0) {
          const latestOverallChunk = batchedChunks[streamId][batchedChunks[streamId].length - 1];
          set((state) => ({
            messages: {
              ...state.messages,
              [streamId]: latestOverallChunk
            }
          }));
          batchedChunks[streamId] = [];
        }
      }, BATCH_INTERVAL);
    });
  }

  return {
    connections: {},
    messages: {},
    isConnecting: {},
    errors: {},

    connect: (id: string, url: string) => {
      get().disconnect(id);

      set((state) => ({
        isConnecting: { ...state.isConnecting, [id]: true },
        errors: { ...state.errors, [id]: null }
      }));

      try {
        const eventSource = new EventSource(url);

        eventSource.onopen = () => {
          set((state) => ({
            isConnecting: { ...state.isConnecting, [id]: false }
          }));
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            set((state) => ({
              messages: {
                ...state.messages,
                [id]: data
              }
            }));
          } catch (error) {
            set((state) => ({
              messages: {
                ...state.messages,
                [id]: {
                  content: event.data,
                  full: event.data,
                  timestamp: Date.now()
                }
              }
            }));
          }
        };

        eventSource.onerror = () => {
          set((state) => ({
            errors: { ...state.errors, [id]: new Error('SSE connection error') },
            isConnecting: { ...state.isConnecting, [id]: false }
          }));
          eventSource.close();
        };

        set((state) => ({
          connections: { ...state.connections, [id]: eventSource }
        }));
      } catch (error) {
        set((state) => ({
          errors: { ...state.errors, [id]: error as Error },
          isConnecting: { ...state.isConnecting, [id]: false }
        }));
      }
    },

    disconnect: (id: string) => {
      const connection = get().connections[id];
      if (connection) {
        connection.close();
        set((state) => ({
          connections: { ...state.connections, [id]: null }
        }));
      }
    },

    disconnectAll: () => {
      Object.entries(get().connections).forEach(([id, connection]) => {
        if (connection) {
          connection.close();
        }
      });
      set({ connections: {} });
    },

    clearMessages: (id: string) => {
      set((state) => {
        const newMessages = { ...state.messages };
        delete newMessages[id];
        return { messages: newMessages };
      });
    },

    abortStream: (streamId: string) => {
      if (typeof window !== 'undefined' && window.electron) {
        console.log("abortStream", streamId);
        window.electron.streaming.abort_stream({ streamId })
          .then(result => {
            console.log("abortStream result", result);
            flushAndFinalizeStream(streamId);
          })
          .catch(err => {
            console.error("Error aborting stream:", err);
            flushAndFinalizeStream(streamId);
          });
      }
    },

    streamChatCompletion: async (messages, options) => {
      console.log("streamChatCompletion called with messages:", messages, "and options:", options);
      const { streamId, model = 'gpt-4', temperature, provider = "openai", ...restOptions } = options;
      const { clearMessages } = get();
      const config = useLLMConfigurationStore.getState();

      clearMessages(streamId);

      set((state) => ({
        isConnecting: { ...state.isConnecting, [streamId]: true },
        errors: { ...state.errors, [streamId]: null }
      }));

      try {
        const backendOptions = {
          model,
          temperature: temperature ?? config.temperature,
          maxTokens: options.maxTokens,
          provider,
          streamId,
          ...restOptions,
          apiKeys: {
            openAI: config.openAIKey,
            deepSeek: config.deepSeekKey,
            oneasia: config.oneasiaKey
          },
          ollamaConfig: {
            baseUrl: config.ollamaBaseURL,
            model: config.ollamaModel
          },
          providerStatus: {
            openAIEnabled: config.openAIEnabled && config.openAIVerified,
            deepSeekEnabled: config.deepSeekEnabled && config.deepSeekVerified,
            oneasiaEnabled: config.oneasiaEnabled && config.oneasiaVerified,
            ollamaEnabled: config.ollamaEnabled && config.ollamaVerified
          }
        };
        console.log("Sending options to backend (chat_stream_complete):", backendOptions);

        const result = await window.electron.streaming.chat_stream_complete({
          messages,
          options: backendOptions,
        });

        if (!result.success && !result.aborted) {
          throw new Error(result.error || 'Streaming failed');
        }

        // Chunks will arrive via IPC listener
        return result.fullResponse || "";
      } catch (error) {
        set((state) => ({
          errors: { ...state.errors, [streamId]: error as Error }
        }));
        throw error;
      } finally {
        flushAndFinalizeStream(streamId);
      }
    },
  };
});

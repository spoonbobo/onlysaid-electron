import { create } from 'zustand';
import { useLLMConfigurationStore } from '../LLM/LLMConfiguration';
import { useAgentSettingsStore } from '../Agent/AgentSettingStore';

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

  // OSSwarm streaming
  osswarmUpdates: Record<string, string[]>;
  activeOSSwarmTasks: Record<string, boolean>;
  osswarmTaskStatus: Record<string, 'idle' | 'initializing' | 'running' | 'completing' | 'completed' | 'failed' | 'aborted'>;
  
  executeOSSwarmTask: (
    task: string,
    options: any,
    chatId?: string,
    workspaceId?: string
  ) => Promise<{ success: boolean; result?: string; error?: string }>;
  abortOSSwarmTask: (taskId?: string) => Promise<void>;
  clearOSSwarmUpdates: (taskId: string) => void;
  forceStopOSSwarmTask: (taskId: string) => void;
  setOSSwarmTaskStatus: (taskId: string, status: StreamState['osswarmTaskStatus'][string]) => void;
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
  provider?: "openai" | "deepseek" | "ollama" | "onlysaid-kb" | null;
  kbIds?: string[];
}

// Helper function to get API configuration based on provider
const getProviderConfig = () => {
  const config = useLLMConfigurationStore.getState();
  return {
    openai: {
      key: config.openAIKey,
      enabled: config.openAIEnabled && config.openAIVerified,
    },
    deepseek: {
      key: config.deepSeekKey,
      enabled: config.deepSeekEnabled && config.deepSeekVerified,
    },
    oneasia: {
      key: config.oneasiaKey,
      enabled: config.oneasiaEnabled && config.oneasiaVerified,
    },
    ollama: {
      baseUrl: config.ollamaBaseURL,
      model: config.ollamaModel,
      enabled: config.ollamaEnabled && config.ollamaVerified,
    },
    temperature: config.temperature,
  };
};

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

    window.electron.ipcRenderer.on('osswarm:stream_update', (...args) => {
      const payload = args[1] as { update?: string };
      if (payload?.update) {
        const taskId = 'current';
        
        // Update status based on stream content
        let newStatus: StreamState['osswarmTaskStatus'][string] = 'running';
        if (payload.update.includes('initializing') || payload.update.includes('analyzing')) {
          newStatus = 'initializing';
        } else if (payload.update.includes('completed') || payload.update.includes('success')) {
          newStatus = 'completing';
        } else if (payload.update.includes('error') || payload.update.includes('failed')) {
          newStatus = 'failed';
        } else if (payload.update.includes('aborted')) {
          newStatus = 'aborted';
        }
        
        set(state => ({
          osswarmUpdates: {
            ...state.osswarmUpdates,
            [taskId]: [...(state.osswarmUpdates[taskId] || []), payload.update!]
          },
          osswarmTaskStatus: {
            ...state.osswarmTaskStatus,
            [taskId]: newStatus
          }
        }));
      }
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

    osswarmUpdates: {},
    activeOSSwarmTasks: {},
    osswarmTaskStatus: {},

    executeOSSwarmTask: async (task: string, options: any, chatId?: string, workspaceId?: string) => {
      const taskId = 'current';
      
      const { swarmLimits } = useAgentSettingsStore.getState();
      
      console.log('[StreamStore] Executing OSSwarm task with context:', { chatId, workspaceId });
      
      // Set initial state
      set(state => ({
        osswarmUpdates: { ...state.osswarmUpdates, [taskId]: [] },
        activeOSSwarmTasks: { ...state.activeOSSwarmTasks, [taskId]: true },
        osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: 'initializing' }
      }));

      try {
        const result = await window.electron.osswarm.executeTask({
          task,
          options: {
            ...options,
            chatId,
            workspaceId
          },
          limits: swarmLimits
        });

        // Update final status
        const finalStatus = result.success ? 'completed' : 'failed';
        set(state => ({
          activeOSSwarmTasks: { ...state.activeOSSwarmTasks, [taskId]: false },
          osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: finalStatus }
        }));

        // Clear updates after delay only if completed successfully
        if (result.success) {
          setTimeout(() => {
            set(state => ({
              osswarmUpdates: { ...state.osswarmUpdates, [taskId]: [] },
              osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: 'idle' }
            }));
          }, 5000); // Longer delay to show completion status
        }

        return result;
      } catch (error: any) {
        set(state => ({
          activeOSSwarmTasks: { ...state.activeOSSwarmTasks, [taskId]: false },
          osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: 'failed' }
        }));
        
        // Don't auto-clear on error - let user see the error
        return { success: false, error: error.message };
      }
    },

    abortOSSwarmTask: async (taskId = 'current') => {
      console.log('[StreamStore] Aborting OSSwarm task:', taskId);
      
      try {
        // Set aborting status immediately
        set(state => ({
          osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: 'aborted' }
        }));

        await window.electron.osswarm.abortTask({ taskId });
        
        set(state => ({
          activeOSSwarmTasks: { ...state.activeOSSwarmTasks, [taskId]: false },
          osswarmUpdates: { 
            ...state.osswarmUpdates, 
            [taskId]: [...(state.osswarmUpdates[taskId] || []), '[OSSwarm] Task aborted by user'] 
          }
        }));

        // Clear after showing abort message
        setTimeout(() => {
          set(state => ({
            osswarmUpdates: { ...state.osswarmUpdates, [taskId]: [] },
            osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: 'idle' }
          }));
        }, 3000);

      } catch (error: any) {
        console.error('[StreamStore] Error aborting OSSwarm task:', error);
        set(state => ({
          osswarmUpdates: { 
            ...state.osswarmUpdates, 
            [taskId]: [...(state.osswarmUpdates[taskId] || []), `[OSSwarm] Abort failed: ${error.message}`] 
          },
          osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: 'failed' }
        }));
      }
    },

    clearOSSwarmUpdates: (taskId: string) => {
      set(state => ({
        osswarmUpdates: { ...state.osswarmUpdates, [taskId]: [] },
        osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: 'idle' }
      }));
    },

    forceStopOSSwarmTask: (taskId: string) => {
      console.log('[StreamStore] Force stopping OSSwarm task:', taskId);
      
      set(state => ({
        activeOSSwarmTasks: { ...state.activeOSSwarmTasks, [taskId]: false },
        osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: 'aborted' },
        osswarmUpdates: { 
          ...state.osswarmUpdates, 
          [taskId]: [...(state.osswarmUpdates[taskId] || []), '[OSSwarm] Task forcefully stopped'] 
        }
      }));

      // Clear after a short delay
      setTimeout(() => {
        set(state => ({
          osswarmUpdates: { ...state.osswarmUpdates, [taskId]: [] },
          osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: 'idle' }
        }));
      }, 2000);
    },

    setOSSwarmTaskStatus: (taskId: string, status: StreamState['osswarmTaskStatus'][string]) => {
      set(state => ({
        osswarmTaskStatus: { ...state.osswarmTaskStatus, [taskId]: status }
      }));
    },

  };
});

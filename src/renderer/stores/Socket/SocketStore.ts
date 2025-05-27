import { create } from 'zustand';
import { IUser } from '@/../../types/User/User';
import { IChatMessage } from '@/../../types/Chat/Message';
import { useChatStore } from '@/renderer/stores/Chat/ChatStore';

interface SocketState {
  isConnected: boolean;
  listenersReady: boolean;
  lastPongReceived: number | null;
  socketId: string | null;
  currentUser: IUser | null;
  isConnecting: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  initialize: (user: IUser) => void;
  close: () => void;
  sendMessage: (message: IChatMessage, workspaceId: string) => void;
  deleteMessage: (roomId: string, messageId: string) => void;
  sendPing: () => void;
  joinWorkspace: (workspaceId: string) => void;
  attemptReconnect: () => void;
  handleNewMessage: (message: IChatMessage) => void;
  handleMessageDeleted: (data: { roomId: string, messageId: string }) => void;
  handlePong: (timestamp: number) => void;
  handleConnectionDetails: (details: { socketId: string }) => void;
  fileProgress: Record<string, { progress: number, stage?: 'network' | 'server' | 'complete' }>;
  handleFileProgress: (data: { operationId: string, progress: number, stage?: 'network' | 'server' | 'complete' }) => void;
  handleFileCompleted: (data: { operationId: string, result?: any }) => void;
  handleFileError: (data: { operationId: string, error: string }) => void;
  setFileProgress: (progress: Record<string, { progress: number, stage?: 'network' | 'server' | 'complete' }>) => void;
}

let connectedListener: (() => void) | null = null;
let disconnectedListener: (() => void) | null = null;
let messageListener: (() => void) | null = null;
let messageDeletedListener: (() => void) | null = null;
let pongListener: (() => void) | null = null;
let connectionDetailsListener: (() => void) | null = null;
let pingIntervalId: NodeJS.Timeout | null = null;
let pongTimeoutId: NodeJS.Timeout | null = null;
let reconnectTimeoutId: NodeJS.Timeout | null = null;
let fileProgressListener: (() => void) | null = null;
let fileCompletedListener: (() => void) | null = null;
let fileErrorListener: (() => void) | null = null;

const PING_INTERVAL = 30000;
const PONG_TIMEOUT_DURATION = PING_INTERVAL + 15000;

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 3000;
const RECONNECT_DELAY_MULTIPLIER = 2;
const MAX_RECONNECT_DELAY = 60000;

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  listenersReady: false,
  lastPongReceived: null,
  socketId: null,
  currentUser: null,
  isConnecting: false,
  isReconnecting: false,
  reconnectAttempts: 0,
  fileProgress: {},

  initialize: (user: IUser) => {
    if (get().isConnecting) {
      return;
    }

    if (!get().isReconnecting && reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }

    set({ isConnecting: true, currentUser: user });

    window.electron.socket.initialize(user)
      .then(() => {
        if (!get().listenersReady) {
          if (!connectedListener) {
            connectedListener = window.electron.ipcRenderer.on('socket:connected', (_event, ...args) => {
              set({
                isConnected: true,
                lastPongReceived: Date.now(),
                isConnecting: false,
                isReconnecting: false,
                reconnectAttempts: 0
              });

              if (reconnectTimeoutId) {
                clearTimeout(reconnectTimeoutId);
                reconnectTimeoutId = null;
              }

              if (pongTimeoutId) clearTimeout(pongTimeoutId);
              pongTimeoutId = setTimeout(() => {
                if (get().isConnected) {
                  set({ isConnected: false });
                  if (get().currentUser) get().attemptReconnect();
                }
              }, PONG_TIMEOUT_DURATION);

              if (pingIntervalId) clearInterval(pingIntervalId);
              pingIntervalId = setInterval(() => {
                if (get().isConnected) {
                  get().sendPing();
                }
              }, PING_INTERVAL);
            });
          }

          if (!disconnectedListener) {
            disconnectedListener = window.electron.ipcRenderer.on('socket:disconnected', (_event, ...args) => {
              const hadCurrentUser = !!get().currentUser;
              set({ isConnected: false, isConnecting: false, socketId: null });

              if (pingIntervalId) { clearInterval(pingIntervalId); pingIntervalId = null; }
              if (pongTimeoutId) { clearTimeout(pongTimeoutId); pongTimeoutId = null; }
              if (reconnectTimeoutId) { clearTimeout(reconnectTimeoutId); reconnectTimeoutId = null; }

              if (hadCurrentUser) {
                get().attemptReconnect();
              }
            });
          }

          if (!messageListener) {
            messageListener = window.electron.ipcRenderer.on('socket:new-message', (_event, ...args) => {
              get().handleNewMessage(args[0] as IChatMessage);
            });
          }

          if (!messageDeletedListener) {
            messageDeletedListener = window.electron.ipcRenderer.on('socket:message-deleted', (_event, ...args) => {
              get().handleMessageDeleted(args[0] as { roomId: string, messageId: string });
            });
          }

          if (!pongListener) {
            pongListener = window.electron.ipcRenderer.on('socket:pong', (_event, ...args) => {
              const data = args[0] as { timestamp: number };
              get().handlePong(data.timestamp);
            });
          }

          if (!connectionDetailsListener) {
            connectionDetailsListener = window.electron.ipcRenderer.on('socket:connection-details', (_event, ...args) => {
              get().handleConnectionDetails(args[0] as { socketId: string });
            });
          }

          if (!fileProgressListener) {
            fileProgressListener = window.electron.ipcRenderer.on('file:progress-update', (_event, ...args) => {
              get().handleFileProgress(args[0] as { operationId: string, progress: number, stage?: 'network' | 'server' | 'complete' });
            });
          }

          if (!fileCompletedListener) {
            fileCompletedListener = window.electron.ipcRenderer.on('file:completed', (_event, ...args) => {
              get().handleFileCompleted(args[0] as { operationId: string, result?: any });
            });
          }

          if (!fileErrorListener) {
            fileErrorListener = window.electron.ipcRenderer.on('file:error', (_event, ...args) => {
              get().handleFileError(args[0] as { operationId: string, error: string });
            });
          }
          set({ listenersReady: true });
        }
      })
      .catch(err => {
        set({ isConnecting: false });
        if (get().currentUser) {
          get().attemptReconnect();
        }
      });
  },

  attemptReconnect: () => {
    const { currentUser, isConnecting, reconnectAttempts } = get();

    if (!currentUser) {
      set({ isReconnecting: false, reconnectAttempts: 0 });
      return;
    }
    if (isConnecting) {
      return;
    }
    if (reconnectTimeoutId) {
      return;
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      set({ isReconnecting: false, reconnectAttempts: 0 });
      return;
    }

    set({ isReconnecting: true });
    const nextAttempt = reconnectAttempts + 1;
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(RECONNECT_DELAY_MULTIPLIER, nextAttempt - 1),
      MAX_RECONNECT_DELAY
    );

    reconnectTimeoutId = setTimeout(() => {
      reconnectTimeoutId = null;
      if (get().currentUser) {
        set({ reconnectAttempts: nextAttempt });
        get().initialize(get().currentUser!);
      } else {
        set({ isReconnecting: false, reconnectAttempts: 0 });
      }
    }, delay);
  },

  close: () => {
    window.electron.socket.close();

    if (connectedListener) { connectedListener(); connectedListener = null; }
    if (disconnectedListener) { disconnectedListener(); disconnectedListener = null; }
    if (messageListener) { messageListener(); messageListener = null; }
    if (messageDeletedListener) { messageDeletedListener(); messageDeletedListener = null; }
    if (pongListener) { pongListener(); pongListener = null; }
    if (connectionDetailsListener) { connectionDetailsListener(); connectionDetailsListener = null; }

    if (pingIntervalId) { clearInterval(pingIntervalId); pingIntervalId = null; }
    if (pongTimeoutId) { clearTimeout(pongTimeoutId); pongTimeoutId = null; }
    if (reconnectTimeoutId) { clearTimeout(reconnectTimeoutId); reconnectTimeoutId = null; }
    if (fileProgressListener) { fileProgressListener(); fileProgressListener = null; }
    if (fileCompletedListener) { fileCompletedListener(); fileCompletedListener = null; }
    if (fileErrorListener) { fileErrorListener(); fileErrorListener = null; }

    set({
      isConnected: false,
      listenersReady: false,
      lastPongReceived: null,
      socketId: null,
      currentUser: null,
      isConnecting: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      fileProgress: {}
    });
  },

  sendMessage: (message: IChatMessage, workspaceId: string) => {
    if (get().isConnected) {
      window.electron.socket.sendMessage(message, workspaceId);
    }
  },

  deleteMessage: (roomId: string, messageId: string) => {
    if (get().isConnected) {
      window.electron.socket.deleteMessage(roomId, messageId);
    }
  },

  sendPing: () => {
    if (get().isConnected) {
      window.electron.socket.sendPing();
    }
  },

  joinWorkspace: (workspaceId: string) => {
    if (get().isConnected) {
      window.electron.socket.joinWorkspace(workspaceId);
    }
  },

  handleNewMessage: (message: IChatMessage) => {
    useChatStore.getState().appendMessage(message.chat_id, message);
  },

  handleMessageDeleted: (data: { roomId: string, messageId: string }) => {
    // useChatStore.getState().removeMessage(data.roomId, data.messageId);
  },

  handlePong: (timestamp: number) => {
    set({ lastPongReceived: timestamp, isConnected: true });

    if (pongTimeoutId) clearTimeout(pongTimeoutId);
    pongTimeoutId = setTimeout(() => {
      if (get().isConnected) {
        set({ isConnected: false });
        if (get().currentUser) get().attemptReconnect();
      }
    }, PONG_TIMEOUT_DURATION);
  },

  handleConnectionDetails: (details: { socketId: string }) => {
    set({ socketId: details.socketId });
    if (get().isConnected) {
      set({ isConnecting: false, isReconnecting: false, reconnectAttempts: 0 });
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }
    }
  },

  handleFileProgress: (data) => {
    set(state => ({
      fileProgress: {
        ...state.fileProgress,
        [data.operationId]: { progress: data.progress, stage: data.stage }
      }
    }));
  },

  handleFileCompleted: (data) => {
    // Clean up progress tracking
    set(state => {
      const newProgress = { ...state.fileProgress };
      delete newProgress[data.operationId];
      return { fileProgress: newProgress };
    });
  },

  handleFileError: (data) => {
    // Clean up progress tracking on error
    set(state => {
      const newProgress = { ...state.fileProgress };
      delete newProgress[data.operationId];
      return { fileProgress: newProgress };
    });
  },

  setFileProgress: (progress) => {
    // Clear completed operations after 5 seconds
    Object.keys(progress).forEach(opId => {
      if (progress[opId].progress === 100) {
        setTimeout(() => {
          set(state => {
            const newProgress = { ...state.fileProgress };
            delete newProgress[opId];
            return { fileProgress: newProgress };
          });
        }, 5000);
      }
    });

    set({ fileProgress: progress });
  }
}));

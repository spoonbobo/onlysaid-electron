import { create } from 'zustand';
import { IUser } from '@/../../types/User/User';
import { IChatMessage } from '@/../../types/Chat/Message';
import { useChatStore } from '@/stores/Chat/ChatStore';

interface SocketState {
  // Socket state
  isConnected: boolean;
  isInitialized: boolean;
  lastPongReceived: number | null;
  socketId: string | null;

  // Socket actions
  initialize: (user: IUser) => void;
  close: () => void;
  sendMessage: (message: IChatMessage, workspaceId: string) => void;
  deleteMessage: (roomId: string, messageId: string) => void;
  sendPing: () => void;
  joinWorkspace: (workspaceId: string) => void;

  // Event handlers (internal)
  handleNewMessage: (message: IChatMessage) => void;
  handleMessageDeleted: (data: { roomId: string, messageId: string }) => void;
  handlePong: (timestamp: number) => void;
  handleConnectionDetails: (details: { socketId: string }) => void;
}

// Keep listeners references at module level so they can be properly cleaned up
let connectedListener: (() => void) | null = null;
let disconnectedListener: (() => void) | null = null;
let messageListener: (() => void) | null = null;
let messageDeletedListener: (() => void) | null = null;
let pongListener: (() => void) | null = null;
let connectionDetailsListener: (() => void) | null = null;
let pingIntervalId: NodeJS.Timeout | null = null;
let pongTimeoutId: NodeJS.Timeout | null = null;

const PING_INTERVAL = 30000;
const PONG_TIMEOUT_DURATION = PING_INTERVAL + 15000; // 45 seconds

export const useSocketStore = create<SocketState>((set, get) => ({
  // Socket state
  isConnected: false,
  isInitialized: false,
  lastPongReceived: null,
  socketId: null,

  // Socket actions
  initialize: (user: IUser) => {
    // Only initialize once
    if (get().isInitialized) return;

    try {
      // Initialize socket with user data
      window.electron.socket.initialize(user)
        .then(() => {
          // Set up event listeners (only once)
          if (!connectedListener) {
            connectedListener = window.electron.ipcRenderer.on('socket:connected', (_event, ...args) => {
              set({ isConnected: true, lastPongReceived: Date.now() });

              if (pongTimeoutId) clearTimeout(pongTimeoutId);
              pongTimeoutId = setTimeout(() => {
                if (get().isConnected) {
                  console.warn("SocketStore: Pong timeout. Setting isConnected to false.");
                  set({ isConnected: false });
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
              set({ isConnected: false });
              if (pingIntervalId) {
                clearInterval(pingIntervalId);
                pingIntervalId = null;
              }
              if (pongTimeoutId) {
                clearTimeout(pongTimeoutId);
                pongTimeoutId = null;
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

          set({ isInitialized: true });
          get().sendPing();
        })
        .catch(err => {
          console.error("Failed to initialize socket:", err);
          // Try again after delay
          setTimeout(() => get().initialize(user), 3000);
        });
    } catch (error) {
      console.error("Error initializing socket:", error);
      setTimeout(() => get().initialize(user), 3000);
    }
  },

  close: () => {
    window.electron.socket.close();

    // Clean up listeners
    if (connectedListener) {
      connectedListener();
      connectedListener = null;
    }

    if (disconnectedListener) {
      disconnectedListener();
      disconnectedListener = null;
    }

    if (messageListener) {
      messageListener();
      messageListener = null;
    }

    if (messageDeletedListener) {
      messageDeletedListener();
      messageDeletedListener = null;
    }

    if (pongListener) {
      pongListener();
      pongListener = null;
    }

    if (connectionDetailsListener) {
      connectionDetailsListener();
      connectionDetailsListener = null;
    }

    if (pingIntervalId) {
      clearInterval(pingIntervalId);
      pingIntervalId = null;
    }
    if (pongTimeoutId) {
      clearTimeout(pongTimeoutId);
      pongTimeoutId = null;
    }

    set({ isConnected: false, isInitialized: false, lastPongReceived: null, socketId: null });
  },

  sendMessage: (message: IChatMessage, workspaceId: string) => {
    window.electron.socket.sendMessage(message, workspaceId);
  },

  deleteMessage: (roomId: string, messageId: string) => {
    window.electron.socket.deleteMessage(roomId, messageId);
  },

  sendPing: () => {
    if (get().isConnected) {
      window.electron.socket.sendPing();
    }
  },

  joinWorkspace: (workspaceId: string) => {
    if (get().isConnected) {
      window.electron.socket.joinWorkspace(workspaceId);
    } else {
      console.warn("SocketStore: Socket not connected, cannot join workspace");
    }
  },

  // Empty handlers
  handleNewMessage: (message: IChatMessage) => {
    // Empty implementation as requested
    console.log("SocketStore: Received message", message);
    useChatStore.getState().appendMessage(message.chat_id, message);
  },

  handleMessageDeleted: (data: { roomId: string, messageId: string }) => {
    // Empty implementation as requested
  },

  handlePong: (timestamp: number) => {
    set({ lastPongReceived: timestamp, isConnected: true });

    if (pongTimeoutId) clearTimeout(pongTimeoutId);
    pongTimeoutId = setTimeout(() => {
      if (get().isConnected) {
        console.warn("SocketStore: Pong timeout after successful pong. Setting isConnected to false.");
        set({ isConnected: false });
      }
    }, PONG_TIMEOUT_DURATION);
  },

  handleConnectionDetails: (details: { socketId: string }) => {
    set({ socketId: details.socketId });
  }
}));

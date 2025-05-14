import { create } from 'zustand';
import { IUser } from '@/../../types/User/User';
import { IChatMessage } from '@/../../types/Chat/Message';

interface SocketState {
  // Socket state
  isConnected: boolean;
  isInitialized: boolean;

  // Socket actions
  initialize: (user: IUser) => void;
  close: () => void;
  sendMessage: (message: IChatMessage) => void;
  deleteMessage: (roomId: string, messageId: string) => void;

  // Event handlers (internal)
  handleNewMessage: (message: IChatMessage) => void;
  handleMessageDeleted: (data: { roomId: string, messageId: string }) => void;
}

// Keep listeners references at module level so they can be properly cleaned up
let connectedListener: (() => void) | null = null;
let disconnectedListener: (() => void) | null = null;
let messageListener: (() => void) | null = null;
let messageDeletedListener: (() => void) | null = null;
let roomUpdateListener: (() => void) | null = null;

export const useSocketStore = create<SocketState>((set, get) => ({
  // Socket state
  isConnected: false,
  isInitialized: false,

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
            connectedListener = window.electron.ipcRenderer.on('socket:connected', () => {
              set({ isConnected: true });
            });
          }

          if (!disconnectedListener) {
            disconnectedListener = window.electron.ipcRenderer.on('socket:disconnected', () => {
              set({ isConnected: false });
            });
          }

          if (!messageListener) {
            messageListener = window.electron.ipcRenderer.on('socket:new-message', (_event, message) => {
              get().handleNewMessage(message);
            });
          }

          if (!messageDeletedListener) {
            messageDeletedListener = window.electron.ipcRenderer.on('socket:message-deleted', (_event, data) => {
              get().handleMessageDeleted(data);
            });
          }

          set({ isInitialized: true });
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

    set({ isConnected: false, isInitialized: false });
  },

  sendMessage: (message: IChatMessage) => {
    window.electron.socket.sendMessage(message);
  },

  deleteMessage: (roomId: string, messageId: string) => {
    window.electron.socket.deleteMessage(roomId, messageId);
  },

  // Empty handlers
  handleNewMessage: (message: IChatMessage) => {
    // Empty implementation as requested
  },

  handleMessageDeleted: (data: { roomId: string, messageId: string }) => {
    // Empty implementation as requested
  }
}));

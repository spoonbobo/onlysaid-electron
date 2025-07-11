import { create } from 'zustand';
import { IUser } from '@/../../types/User/User';
import { IChatMessage } from '@/../../types/Chat/Message';
import { useChatStore } from '@/renderer/stores/Chat/ChatStore';
import { useUserStore } from '@/renderer/stores/User/UserStore';
import { useUserTokenStore } from '@/renderer/stores/User/UserToken';
import { getUserFromStore } from '@/utils/user';
import { addWorkspaceNotification, addHomeNotification } from '@/utils/notifications';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';

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
  leaveWorkspace: (workspaceId: string) => void;
  attemptReconnect: () => void;
  handleNewMessage: (data: { message: IChatMessage, workspaceId: string }) => Promise<void>;
  handleMessageDeleted: (data: { roomId: string, messageId: string }) => void;
  handlePong: (timestamp: number) => void;
  handleConnectionDetails: (details: { socketId: string }) => void;
  fileProgress: Record<string, { progress: number, stage?: 'network' | 'server' | 'complete' }>;
  handleFileProgress: (data: { operationId: string, progress: number, stage?: 'network' | 'server' | 'complete' }) => void;
  handleFileCompleted: (data: { operationId: string, result?: any }) => void;
  handleFileError: (data: { operationId: string, error: string }) => void;
  setFileProgress: (progress: Record<string, { progress: number, stage?: 'network' | 'server' | 'complete' }>) => void;
  handleWorkspaceJoined: (data: { workspaceId: string, userId: string }) => void;
  handleWorkspaceLeft: (data: { workspaceId: string, userId: string }) => void;
  handleUnreadMessage: (data: { message: IChatMessage, workspaceId: string }) => Promise<void>;
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
let workspaceJoinedListener: (() => void) | null = null;
let workspaceLeftListener: (() => void) | null = null;
let unreadMessageListener: (() => void) | null = null;

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

    const { token } = useUserTokenStore.getState();
    window.electron.socket.initialize(user, token)
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
              get().handleNewMessage(args[0] as { message: IChatMessage, workspaceId: string });
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

          if (!workspaceJoinedListener) {
            workspaceJoinedListener = window.electron.ipcRenderer.on('socket:workspace-joined', (_event, ...args) => {
              get().handleWorkspaceJoined(args[0] as { workspaceId: string, userId: string });
            });
          }

          if (!workspaceLeftListener) {
            workspaceLeftListener = window.electron.ipcRenderer.on('socket:workspace-left', (_event, ...args) => {
              get().handleWorkspaceLeft(args[0] as { workspaceId: string, userId: string });
            });
          }

          if (!unreadMessageListener) {
            unreadMessageListener = window.electron.ipcRenderer.on('socket:unread-message', (_event, ...args) => {
              get().handleUnreadMessage(args[0] as { message: IChatMessage, workspaceId: string });
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
    if (workspaceJoinedListener) { workspaceJoinedListener(); workspaceJoinedListener = null; }
    if (workspaceLeftListener) { workspaceLeftListener(); workspaceLeftListener = null; }
    if (unreadMessageListener) { unreadMessageListener(); unreadMessageListener = null; }

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

  leaveWorkspace: (workspaceId: string) => {
    if (get().isConnected) {
      window.electron.socket.leaveWorkspace(workspaceId);
    }
  },

  handleNewMessage: async (data: { message: IChatMessage, workspaceId: string }) => {
    console.log("message received", data);

    const currentUser = getUserFromStore();
    const { selectedContext, selectedTopics } = useTopicStore.getState();
    
    // Check if this message is from someone else (not the current user)
    const isFromOther = data.message.sender !== currentUser?.id;
    
    // Check if this is the currently active chat
    const isCurrentlyActiveChat = selectedContext?.section && 
      selectedTopics[selectedContext.section] === data.message.chat_id;

    // Set read status based on whether user is currently viewing this chat
    const messageWithReadStatus = {
      ...data.message,
      isRead: Boolean(!isFromOther || isCurrentlyActiveChat)
    };

    // Append message to chat store
    useChatStore.getState().appendMessage(data.message.chat_id, messageWithReadStatus);

    // Create notification for unread messages from others
    if (isFromOther && !isCurrentlyActiveChat) {
      const senderName = data.message.sender_object?.username || 
                        data.message.sender_object?.display_name || 
                        'Someone';
      
      const messagePreview = data.message.text?.substring(0, 50) || 
                            (data.message.files?.length ? '[File attachment]' : '[Message]');
      
      console.log('🔔 Creating live notification for:', {
        sender: senderName,
        chatId: data.message.chat_id,
        workspaceId: data.workspaceId,
        preview: messagePreview
      });
      
      if (data.workspaceId) {
        addWorkspaceNotification(
          data.workspaceId,
          'chatroom',
          {
            type: 'message',
            title: `${senderName}`,
            content: messagePreview
          },
          data.message.chat_id
        );
      } else {
        addHomeNotification(
          'agents',
          {
            type: 'message',
            title: `${senderName}`,
            content: messagePreview
          },
          data.message.chat_id
        );
      }
    }
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
      
      // Auto-register device when socket connects
      useUserStore.getState().autoRegisterDeviceOnConnect();
      
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
  },

  handleWorkspaceJoined: (data: { workspaceId: string, userId: string }) => {
    // console.log(`✅ Joined workspace: ${data.workspaceId}`);
    // You can add any UI updates here if needed
  },

  handleWorkspaceLeft: (data: { workspaceId: string, userId: string }) => {
    console.log(`❌ Left workspace: ${data.workspaceId}`);
    // You can add any UI updates here if needed
  },

  handleUnreadMessage: async (data: { message: IChatMessage, workspaceId: string }) => {
    console.log("unread message received (no notification)", data);
    
    // Mark as unread since these are historical messages
    const messageWithReadStatus = {
      ...data.message,
      isRead: false
    };
    
    // Only append to chat store, don't create notifications 
    useChatStore.getState().appendMessage(data.message.chat_id, messageWithReadStatus);
  }
}));

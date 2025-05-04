import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { IChatMessage } from "@/models/Chat/Message";
import { IChatRoom } from "@/models/Chat/Chatroom";
import { getUserTokenFromStore, getUserFromStore } from "@/utils/user";
import { v4 as uuidv4 } from 'uuid';
interface ChatState {
  activeRoomId: string | null;
  messages: Record<string, IChatMessage[]>;
  rooms: IChatRoom[];
  currentInput: Record<string, string>;
  isLoading: boolean;
  error: string | null;

  // chat
  createChat: (userId: string, type: string) => Promise<void>;
  getChat: (userId: string, type: string) => Promise<void>;
  updateChat: (roomId: string, data: Partial<IChatRoom>) => Promise<void>;
  setActiveChat: (roomId: string) => void;
  markAsRead: (roomId: string) => void;

  // message
  sendMessage: (roomId: string, messageData: Partial<IChatMessage>) => Promise<string | void>;
  updateMessage: (roomId: string, messageId: string, data: Partial<IChatMessage>) => Promise<void>;
  fetchMessages: (roomId: string) => Promise<void>;
  deleteMessage: (roomId: string, messageId: string) => Promise<void>;
  editMessage: (roomId: string, messageId: string, content: string) => Promise<void>;

  setInput: (roomId: string, input: string) => void;
}

const NewChat = (userId: string, type: string) => {
  return {
    name: `New Chat`,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    unread: 0,
    active_users: [userId],
    type: type,
  }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      activeRoomId: null,
      messages: {},
      rooms: [],
      currentInput: {},
      isLoading: false,
      error: null,

      setActiveChat: (roomId) => {
        set({ activeRoomId: roomId });
        get().markAsRead(roomId);
      },

      createChat: async (userId: string, type: string) => {
        set({ isLoading: true, error: null });
        try {
          const newChat = NewChat(userId, type);
          const response = await window.electron.chat.create({
            token: getUserTokenFromStore(),
            request: newChat
          });

          await get().getChat(userId, type);
          get().setActiveChat(response.data.data[0].id);

        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error(error);
        }
      },

      getChat: async (userId: string, type: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await window.electron.chat.get({
            token: getUserTokenFromStore(),
            userId: userId,
            type: type
          });

          if (response.data && response.data.data && Array.isArray(response.data.data)) {
            set({ rooms: [...response.data.data], isLoading: false });
          } else {
            set({ isLoading: false });
          }
          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error(error);
        }
      },

      updateChat: async (roomId, data) => {
        set({ isLoading: true, error: null });
        try {
          // Update chatroom locally first
          set((state) => ({
            rooms: state.rooms.map(room =>
              room.id === roomId
                ? { ...room, ...data, last_updated: new Date().toISOString() }
                : room
            )
          }));
          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error("Error updating chatroom:", error);
          throw error;
        }
      },

      sendMessage: async (roomId, messageData) => {
        set({ isLoading: true, error: null });
        try {
          const messageId = uuidv4();

          await window.electron.db.query({
            query: `
            insert into messages
            (id, room_id, sender, text, created_at)
            values
            (@id, @roomId, @sender, @text, @createdAt)
            `,
            params: {
              id: messageId,
              roomId,
              sender: getUserFromStore()?.id || "",
              text: messageData.text || "",
              createdAt: messageData.created_at
            }
          });


          set({ isLoading: false });
          return messageId;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error("Error sending message:", error);
          throw error;
        }
      },

      updateMessage: async (roomId, messageId, data) => {
        set({ isLoading: true, error: null });
        try {
          // Update message locally first
          set((state) => ({
            messages: {
              ...state.messages,
              [roomId]: (state.messages[roomId] || []).map(msg =>
                msg.id === messageId ? { ...msg, ...data } : msg
              )
            }
          }));

          // In a real app, update on server
          // await window.electron.chat.updateMessage({
          //   roomId,
          //   messageId,
          //   data,
          //   token: 'token',
          //   cookieName: 'cookieName'
          // });

          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error("Error updating message:", error);
          throw error;
        }
      },

      fetchMessages: async (roomId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await window.electron.db.query({
            query: `
              SELECT * FROM messages
              WHERE room_id = @roomId
              ORDER BY created_at ASC
            `,
            params: { roomId }
          });

          if (response && Array.isArray(response)) {
            set(state => ({
              messages: {
                ...state.messages,
                [roomId]: response
              },
              isLoading: false
            }));
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error("Error fetching messages:", error);
        }
      },

      setInput: (roomId, input) => {
        console.log("Dummy setInput function called with:", roomId, input);
      },

      markAsRead: (roomId) => {
        console.log("Dummy markAsRead function called with:", roomId);
      },

      deleteMessage: async (roomId, messageId) => {
        console.log("Dummy deleteMessage function called with:", roomId, messageId);
        return;
      },

      editMessage: async (roomId, messageId, content) => {
        console.log("Dummy editMessage function called with:", roomId, messageId, content);
        return;
      }
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { IChatMessage } from "@/models/Chat/Message";
import { IChatRoom } from "@/models/Chat/Chatroom";
import { getUserTokenFromStore } from "@/utils/user";

interface ChatState {
  // State
  activeRoomId: string | null;
  messages: Record<string, IChatMessage[]>;
  rooms: IChatRoom[];
  currentInput: Record<string, string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveRoom: (roomId: string) => void;
  createNewChat: (users: string[]) => Promise<string>;
  createChatroom: () => Promise<void>;
  updateChatroom: (roomId: string, data: Partial<IChatRoom>) => Promise<void>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  updateMessage: (roomId: string, messageId: string, data: Partial<IChatMessage>) => Promise<void>;
  fetchMessages: (roomId: string) => Promise<void>;
  fetchRooms: () => Promise<void>;
  setInput: (roomId: string, input: string) => void;
  markAsRead: (roomId: string) => void;
  deleteMessage: (roomId: string, messageId: string) => Promise<void>;
  editMessage: (roomId: string, messageId: string, content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // State
      activeRoomId: null,
      messages: {},
      rooms: [],
      currentInput: {},
      isLoading: false,
      error: null,

      // Actions
      setActiveRoom: (roomId) => {
        set({ activeRoomId: roomId });
        // Mark as read when setting active room
        get().markAsRead(roomId);
      },

      createChatroom: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await window.electron.chatroom.create({
            created_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            name: 'New Chatroom',
            unread: 0,
            active_users: [],
            token: getUserTokenFromStore()
          });
          console.log(response);
          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error(error);
        }
      },

      updateChatroom: async (roomId, data) => {
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

          // In a real app, update on server
          // await window.electron.chatroom.update({
          //   roomId,
          //   data,
          //   token: 'token',
          //   cookieName: 'cookieName'
          // });

          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error("Error updating chatroom:", error);
          throw error;
        }
      },

      createNewChat: async (users) => {
        set({ isLoading: true, error: null });
        try {
          // Generate a temporary ID for the room
          const tempId = `new-room-${Date.now()}`;
          const now = new Date().toISOString();

          // Create a new chat room locally first for immediate UI feedback
          set((state) => ({
            rooms: [
              ...state.rooms,
              {
                id: tempId,
                name: users.join(", "), // Temporary name
                created_at: now,
                last_updated: now,
                unread: 0,
                active_users: users
              }
            ]
          }));

          // In a real app, you would call an API here
          // const response = await window.electron.chatroom.create({
          //   users,
          //   token: 'token',
          //   cookieName: 'cookieName'
          // });

          // if (response.error) throw new Error(response.error);

          set({ isLoading: false });
          return tempId; // Eventually return the real room ID from the server
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error("Error creating new chat:", error);
          throw error;
        }
      },

      sendMessage: async (roomId, content) => {
        console.log("Dummy sendMessage function called with:", roomId, content);
        return;
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
          // await window.electron.chatroom.updateMessage({
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
        console.log("Dummy fetchMessages function called with:", roomId);
        return;
      },

      fetchRooms: async () => {
        console.log("Dummy fetchRooms function called");
        return;
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

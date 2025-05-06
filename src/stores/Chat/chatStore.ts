import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { IChatMessage, IReaction } from "@/models/Chat/Message";
import { IChatRoom } from "@/models/Chat/Chatroom";
import { getUserTokenFromStore, getUserFromStore } from "@/utils/user";
import { v4 as uuidv4 } from 'uuid';
import { WindowTab } from "../Topic/WindowStore";
import * as R from 'ramda';
import { IUser } from "@/models/User/User";
import { validate } from 'uuid';

// Define the message limit
const MESSAGE_FETCH_LIMIT = 50;

// update to be dynamic later -- TODO:
export const DeepSeekUser: IUser = {
  id: "d8585d79-795d-4956-8061-ee082e202d98",
  username: "DeepSeek",
  email: "deepseek@llm.com",
  avatar: "https://diplo-media.s3.eu-central-1.amazonaws.com/2025/01/deepseek-italy-ban-garante.png",
  active_rooms: [],
  archived_rooms: [],
  teams: [],
  settings: {
    theme: "light",
  },
}

const defaultSenderId = "d8585d79-795d-4956-8061-ee082e202d98"

interface ChatState {
  // State properties
  activeRoomByTab: Record<string, string>;
  messages: Record<string, IChatMessage[]>;
  messageOffsets: Record<string, number>;
  rooms: IChatRoom[];
  inputByTabRoom: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;

  // Room/Chat operations
  createChat: (userId: string, type: string, tabId?: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  getChat: (userId: string, type: string) => Promise<void>;
  updateChat: (chatId: string, data: Partial<IChatRoom>) => Promise<void>;
  setActiveChat: (chatId: string, tabId?: string) => void;
  markAsRead: (chatId: string) => void;
  getActiveRoomIdForTab: (tabId: string) => string | null;
  cleanupTabReferences: (tabId: string) => void;
  cleanupOrphanedRooms: () => void;
  cleanupChatReferences: (chatId: string) => void;

  // Message operations
  sendMessage: (chatId: string, messageData: Partial<IChatMessage>) => Promise<string | void>;
  updateMessage: (chatId: string, messageId: string, data: Partial<IChatMessage>) => Promise<void>;
  fetchMessages: (chatId: string, loadMore?: boolean, preserveHistory?: boolean) => Promise<boolean>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  editMessage: (chatId: string, messageId: string, content: string) => Promise<void>;
  appendMessage: (chatId: string, message: IChatMessage) => void;
  getMessageById: (chatId: string, messageId: string) => Promise<IChatMessage | null>;

  // Input/UI operations
  setInput: (chatId: string, input: string, tabId?: string) => void;
  getInput: (chatId: string, tabId?: string) => string;
  setTyping: (typing: boolean) => void;

  // Reaction operations
  toggleReaction: (chatId: string, messageId: string, reaction: string) => Promise<void>;
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
      activeRoomByTab: {},
      messages: {},
      messageOffsets: {},
      rooms: [],
      inputByTabRoom: {},
      isLoading: false,
      error: null,
      isTyping: false,

      getActiveRoomIdForTab: (tabId) => {
        return get().activeRoomByTab[tabId] || null;
      },

      setActiveChat: (chatId, tabId = '') => {
        set(state => ({
          activeRoomByTab: {
            ...state.activeRoomByTab,
            [tabId]: chatId
          }
        }));
        get().markAsRead(chatId);
      },

      createChat: async (userId: string, type: string, tabId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const newChat = NewChat(userId, type);
          const response = await window.electron.chat.create({
            token: getUserTokenFromStore(),
            request: newChat
          });

          await get().getChat(userId, type);
          if (response.data.data[0]?.id) {
            get().setActiveChat(response.data.data[0].id, tabId);
          }

        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error(error);
        }
      },

      deleteChat: async (chatId: string) => {
        console.log("deleteChat", chatId);
        set({ isLoading: true, error: null });
        try {
          await window.electron.chat.delete({
            token: getUserTokenFromStore(),
            id: chatId
          });

          // Clean up chat references after successful deletion
          get().cleanupChatReferences(chatId);
          set({ isLoading: false });
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

      updateChat: async (chatId, data) => {
        set({ isLoading: true, error: null });
        try {
          // Update chatroom locally first
          set((state) => ({
            rooms: state.rooms.map(room =>
              room.id === chatId
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

      sendMessage: async (chatId, messageData) => {
        set({ isLoading: true, error: null });
        try {
          const messageId = uuidv4();

          await window.electron.db.query({
            query: `
            insert into messages
            (id, room_id, sender, text, created_at, reply_to, files)
            values
            (@id, @chatId, @sender, @text, @createdAt, @replyTo, @files)
            `,
            params: {
              id: messageId,
              chatId,
              sender: getUserFromStore()?.id || "",
              text: messageData.text || "",
              createdAt: messageData.created_at,
              replyTo: messageData.reply_to || null,
              files: JSON.stringify(messageData.files) || null
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

      updateMessage: async (chatId, messageId, data) => {
        set({ isLoading: true, error: null });
        try {
          // Update message locally first
          set((state) => ({
            messages: {
              ...state.messages,
              [chatId]: (state.messages[chatId] || []).map(msg =>
                msg.id === messageId ? { ...msg, ...data } : msg
              )
            }
          }));

          // First check if message exists
          const checkQuery = `
            select count(*) as count from messages
            where id = @messageId and room_id = @chatId
          `;

          const result = await window.electron.db.query({
            query: checkQuery,
            params: { messageId, chatId }
          });

          if (result && result[0] && result[0].count > 0) {
            // Message exists, update it
            const updateQuery = `
              update messages
              set text = @text, created_at = @createdAt
              where id = @messageId
              and room_id = @chatId
            `;

            await window.electron.db.query({
              query: updateQuery,
              params: { messageId, chatId, text: data.text, createdAt: data.created_at }
            });
          } else {
            // Message doesn't exist, insert it
            const insertQuery = `
              insert into messages (id, room_id, sender, text, created_at)
              values (@messageId, @chatId, @sender, @text, @createdAt)
            `;

            // Find the message in state to get the sender
            const message = get().messages[chatId]?.find(msg => msg.id === messageId);
            const sender = message?.sender || defaultSenderId;

            await window.electron.db.query({
              query: insertQuery,
              params: {
                messageId,
                chatId,
                sender,
                text: data.text,
                createdAt: data.created_at || new Date().toISOString()
              }
            });
          }

          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error("Error updating message:", error);
          throw error;
        }
      },

      fetchMessages: async (chatId, loadMore = false, preserveHistory = false) => {
        set({ isLoading: true, error: null });
        try {
          const currentOffset = loadMore ? (get().messageOffsets[chatId] || 0) : 0;
          const existingMessages = (preserveHistory || loadMore) ?
            (get().messages[chatId] || []) : [];

          // Create a Set of existing message IDs for quick lookup
          const existingMessageIds = new Set(existingMessages.map(msg => msg.id));

          const response = await window.electron.db.query({
            query: `
              select * from messages
              where room_id = @chatId
              order by created_at desc
              limit @limit offset @offset
            `,
            params: { chatId, limit: MESSAGE_FETCH_LIMIT, offset: currentOffset }
          });

          if (response && Array.isArray(response)) {
            const fetchedMessages = response.reverse();
            const numFetched = fetchedMessages.length;

            if (numFetched === 0) {
              set({ isLoading: false });
              return false;
            }

            const msgIds = fetchedMessages.map(msg => msg.id);
            const placeholders = msgIds.map((_, i) => `@id${i}`).join(',');
            const params = msgIds.reduce((acc, id, i) => ({ ...acc, [`id${i}`]: id }), {});

            const reactions = await window.electron.db.query({
              query: `
              select * from reactions
              where message_id in (${placeholders})
              `,
              params: params
            });

            // Access reactions data directly like we do with messages
            // The structure appears different between responses
            const reactionData = Array.isArray(reactions) ? reactions : (reactions?.data?.data || []);
            const reactionsByMessageId = R.groupBy(R.prop('message_id'), reactionData as IReaction[]);

            const uniqueSenderIds = R.uniq(R.pluck('sender', fetchedMessages));
            const validUUIDs = uniqueSenderIds.filter(id => validate(id));
            let userMap: Record<string, IUser> = {};

            try {
              const userInfos = await window.electron.user.get({
                token: getUserTokenFromStore(),
                args: {
                  ids: validUUIDs
                }
              });

              // Add null checks to handle undefined data
              if (userInfos && userInfos.data && userInfos.data.data) {
                userMap = R.indexBy(
                  R.prop('id') as (user: IUser) => string,
                  userInfos.data.data as IUser[]
                );
              }
            } catch (error) {
              console.error("Error fetching user information:", error);
            }

            // Add reactions to messages
            const messagesWithUsersAndReactions = R.map(msg => ({
              ...msg,
              sender_object: userMap[msg.sender] || null,
              reactions: reactionsByMessageId[msg.id] || []
            }), fetchedMessages).filter(msg => !existingMessageIds.has(msg.id));

            set(state => {
              const currentMessages = state.messages[chatId] || [];

              return {
                messages: {
                  ...state.messages,
                  [chatId]: loadMore
                    ? [...messagesWithUsersAndReactions, ...currentMessages]
                    : preserveHistory
                      ? [...currentMessages, ...messagesWithUsersAndReactions.filter(msg =>
                        !currentMessages.some(m => m.id === msg.id))]
                      : messagesWithUsersAndReactions
                },
                messageOffsets: {
                  ...state.messageOffsets,
                  [chatId]: currentOffset + numFetched
                },
                isLoading: false
              };
            });
            return true;
          } else {
            set({ isLoading: false });
            return false;
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error("Error fetching messages:", error);
          return false;
        }
      },

      setInput: (chatId, input, tabId = '') => {
        set(state => ({
          inputByTabRoom: {
            ...state.inputByTabRoom,
            [`${tabId}:${chatId}`]: input
          }
        }));
      },

      getInput: (chatId, tabId = '') => {
        return get().inputByTabRoom[`${tabId}:${chatId}`] || '';
      },

      markAsRead: (chatId) => {
        console.log("Dummy markAsRead function called with:", chatId);
      },

      deleteMessage: async (chatId, messageId) => {
        console.log("Dummy deleteMessage function called with:", chatId, messageId);
        return;
      },

      editMessage: async (chatId, messageId, content) => {
        console.log("Dummy editMessage function called with:", chatId, messageId, content);
        return;
      },

      cleanupTabReferences: (tabId) => {
        set((state) => {
          // Remove references to this tab in activeRoomByTab
          const newActiveRoomByTab = { ...state.activeRoomByTab };
          delete newActiveRoomByTab[tabId];

          // Clean up input state for this tab
          const newInputByTabRoom = { ...state.inputByTabRoom };
          Object.keys(newInputByTabRoom).forEach(key => {
            if (key.startsWith(`${tabId}:`)) {
              delete newInputByTabRoom[key];
            }
          });

          return {
            activeRoomByTab: newActiveRoomByTab,
            inputByTabRoom: newInputByTabRoom
          };
        });
      },

      cleanupOrphanedRooms: () => {
        const { useWindowStore } = require("../Topic/WindowStore");
        const validTabIds = useWindowStore.getState().tabs.map((tab: WindowTab) => tab.id);

        set((state) => {
          const newActiveRoomByTab: Record<string, string> = {};
          Object.entries(state.activeRoomByTab).forEach(([tabId, chatId]) => {
            if (tabId === "" || validTabIds.includes(tabId)) {
              newActiveRoomByTab[tabId] = chatId;
            }
          });

          const newInputByTabRoom: Record<string, string> = {};
          Object.entries(state.inputByTabRoom).forEach(([key, input]) => {
            const tabId = key.split(":")[0];
            if (tabId === "" || validTabIds.includes(tabId)) {
              newInputByTabRoom[key] = input;
            }
          });

          const newMessageOffsets: Record<string, number> = {};
          Object.entries(state.messageOffsets).forEach(([chatId, offset]) => {
            newMessageOffsets[chatId] = offset;
          });

          return {
            activeRoomByTab: newActiveRoomByTab,
            inputByTabRoom: newInputByTabRoom,
            messageOffsets: newMessageOffsets
          };
        });
      },

      setTyping: (typing) => set({ isTyping: typing }),

      appendMessage: (chatId, message) => {
        set(state => {
          const currentMessages = state.messages[chatId] || [];

          // Check if message already exists
          if (currentMessages.some(msg => msg.id === message.id)) {
            return state; // No change needed
          }

          return {
            messages: {
              ...state.messages,
              [chatId]: [...currentMessages, message]
            }
          };
        });
      },

      // Add the implementation
      getMessageById: async (chatId, messageId) => {
        const query = `
          select * from messages
          where id = @messageId
          and room_id = @chatId
        `;

        const result = await window.electron.db.query({
          query,
          params: { messageId, chatId }
        });

        return result.data[0] || null;
      },

      // Add this implementation inside the store
      toggleReaction: async (chatId, messageId, reaction) => {
        console.log("toggleReaction", chatId, messageId, reaction);
        try {
          const currentUser = getUserFromStore();
          if (!currentUser || !currentUser.id) return;

          // Check if reaction already exists in database
          const existingReaction = await window.electron.db.query({
            query: `
              select id from reactions
              where message_id = @messageId
              and user_id = @userId
              and reaction = @reaction
            `,
            params: {
              messageId,
              userId: currentUser.id,
              reaction
            }
          });

          const reactionExists = Array.isArray(existingReaction) && existingReaction.length > 0;
          const reactionId = reactionExists ? existingReaction[0]?.id : uuidv4();
          const createdAt = new Date().toISOString();

          // Get current message for UI update
          const messages = get().messages[chatId] || [];
          const message = messages.find(m => m.id === messageId);
          if (!message) return;

          const currentReactions = message.reactions || [];

          // Update local state
          set((state) => {
            const messages = state.messages[chatId] || [];
            const messageIndex = messages.findIndex(m => m.id === messageId);

            if (messageIndex === -1) return state;

            const updatedReactions = reactionExists
              ? currentReactions.filter(r => !(r.reaction === reaction && r.user_id === currentUser.id))
              : [...currentReactions, {
                id: reactionId,
                message_id: messageId,
                user_id: currentUser.id as string,
                reaction,
                created_at: createdAt
              }];

            const updatedMessages = R.update(
              messageIndex,
              { ...message, reactions: updatedReactions as IReaction[] },
              messages
            );

            return {
              messages: {
                ...state.messages,
                [chatId]: updatedMessages
              }
            };
          });

          if (!reactionExists) {
            await window.electron.db.query({
              query: `
                insert into reactions
                (id, message_id, user_id, reaction, created_at)
                values
                (@id, @messageId, @userId, @reaction, @createdAt)
              `,
              params: {
                id: reactionId,
                messageId,
                userId: currentUser.id,
                reaction,
                createdAt
              }
            });
          } else {
            await window.electron.db.query({
              query: `
                delete from reactions
                where message_id = @messageId
                and user_id = @userId
                and reaction = @reaction
              `,
              params: {
                messageId,
                userId: currentUser.id,
                reaction
              }
            });
          }
        } catch (error: any) {
          console.error("Error toggling reaction:", error);
        }
      },

      // Add this helper function to the store
      cleanupChatReferences: (chatId: string) => {
        set(state => {
          const updatedRooms = state.rooms.filter(room => room.id !== chatId);

          const { [chatId]: removedMessages, ...restMessages } = state.messages;

          const { [chatId]: removedOffset, ...restOffsets } = state.messageOffsets;

          const newActiveRoomByTab = { ...state.activeRoomByTab };
          Object.entries(newActiveRoomByTab).forEach(([tabId, roomChatId]) => {
            if (roomChatId === chatId) {
              delete newActiveRoomByTab[tabId];
            }
          });

          const newInputByTabRoom = { ...state.inputByTabRoom };
          Object.keys(newInputByTabRoom).forEach(key => {
            if (key.includes(`:${chatId}`)) {
              delete newInputByTabRoom[key];
            }
          });

          return {
            rooms: updatedRooms,
            messages: restMessages,
            messageOffsets: restOffsets,
            activeRoomByTab: newActiveRoomByTab,
            inputByTabRoom: newInputByTabRoom
          };
        });
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Limit each room's messages to 100 most recent
        const limitedMessages: Record<string, IChatMessage[]> = {};
        Object.entries(state.messages).forEach(([chatId, messages]) => {
          limitedMessages[chatId] = messages.slice(-100);
        });

        return {
          activeRoomByTab: state.activeRoomByTab,
          messages: limitedMessages,
          messageOffsets: state.messageOffsets,
          rooms: state.rooms,
          inputByTabRoom: state.inputByTabRoom,
        };
      },
    }
  )
);
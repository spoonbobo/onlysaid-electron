import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getUserTokenFromStore, getUserFromStore } from "@/utils/user";
import { v4 as uuidv4 } from 'uuid';
import * as R from 'ramda';
import { validate } from 'uuid';
import { IChatMessage, IReaction } from "@/../../types/Chat/Message";
import { IChatRoom, IUpdateChatArgs } from "@/../../types/Chat/Chatroom";
import { IUser } from "@/../../types/User/User";

// Define the message limit
const MESSAGE_FETCH_LIMIT = 30;

// update to be dynamic later -- TODO:
export const DeepSeekUser: IUser = {
  id: "a0382833-7932-4d23-8094-75681edb7160",
  username: "DeepSeek",
  email: "deepseek@llm.com",
  avatar: "https://diplo-media.s3.eu-central-1.amazonaws.com/2025/01/deepseek-italy-ban-garante.png",
  settings: {
    theme: "light",
  },
}

const DBTABLES = {
  CHATROOM: 'chat',
  PLANS: 'plans',
  TASKS: 'tasks',
  LOGS: 'logs',
  SKILLS: 'skills',
  USERS: 'users',
  WORKSPACES: 'workspaces',
  WORKSPACE_USERS: 'workspace_users',
}

const defaultSenderId = "a0382833-7932-4d23-8094-75681edb7160"

interface ChatState {
  // State properties
  activeChatByContext: Record<string, string | null>;
  messages: Record<string, IChatMessage[]>;
  messageOffsets: Record<string, number>;
  chats: IChatRoom[];
  inputByContextChat: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  chatOverlayMinimized: boolean;

  // Chat operations
  createChat: (userId: string, type: string, contextId?: string, local?: boolean) => Promise<IChatRoom | null>;
  deleteChat: (chatId: string, local?: boolean) => Promise<void>;
  getChat: (userId: string, type: string, workspaceId?: string, local?: boolean) => Promise<void>;
  updateChat: (chatId: string, data: Partial<IChatRoom>, local?: boolean) => Promise<void>;
  setActiveChat: (chatId: string, contextId?: string) => void;
  markAsRead: (chatId: string) => void;
  getActiveChatIdForContext: (contextId: string) => string | null;
  cleanupContextReferences: (contextId: string) => void;
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
  setInput: (chatId: string, input: string, contextId?: string) => void;
  getInput: (chatId: string, contextId?: string) => string;

  // Reaction operations
  toggleReaction: (chatId: string, messageId: string, reaction: string) => Promise<void>;

  // UI operations for chat overlay
  setChatOverlayMinimized: (minimized: boolean) => void;
}

const NewChat = (userId: string, type: string, workspaceId?: string) => {
  return {
    name: `New Chat`,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    unread: 0,
    workspace_id: workspaceId,
    type: type,
    user_id: userId,
  }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      activeChatByContext: {},
      messages: {},
      messageOffsets: {},
      chats: [],
      inputByContextChat: {},
      isLoading: false,
      error: null,
      isTyping: false,
      chatOverlayMinimized: false,

      getActiveChatIdForContext: (contextId) => {
        return get().activeChatByContext[contextId] || null;
      },

      setActiveChat: (chatId, contextId = '') => {
        // First verify that the chatId exists in chats
        const { chats } = get();

        // Allow empty chatId to clear the active chat
        if (!chatId) {
          set(state => ({
            activeChatByContext: {
              ...state.activeChatByContext,
              [contextId]: null
            }
          }));
          return;
        }

        const chatExists = chats.some(chat => chat.id === chatId);

        if (chatExists) {
          set(state => ({
            activeChatByContext: {
              ...state.activeChatByContext,
              [contextId]: chatId
            }
          }));
          get().markAsRead(chatId);
        } else {
          console.warn(`Attempted to set active chat to non-existent chat ID: ${chatId}`);
        }
      },

      createChat: async (
        userId: string,
        type: string,
        contextId?: string,
        local?: boolean
      ) => {
        set({ isLoading: true, error: null });
        try {
          const newChat = NewChat(userId, type, contextId);
          const chatId = uuidv4();

          if (local) {
            // Use direct DB query for local operation
            await window.electron.db.query({
              query: `
                insert into ${DBTABLES.CHATROOM}
                (id, name, created_at, last_updated, unread, workspace_id, type, user_id)
                values
                (@id, @name, @createdAt, @lastUpdated, @unread, @workspaceId, @type, @userId)
              `,
              params: {
                id: chatId,
                name: newChat.name,
                createdAt: newChat.created_at,
                lastUpdated: newChat.last_updated,
                unread: newChat.unread,
                workspaceId: newChat.workspace_id || null,
                type: newChat.type,
                userId: newChat.user_id
              }
            });

            const localChat = {
              ...newChat,
              id: chatId
            };

            set(state => ({
              chats: [...state.chats, localChat],
              isLoading: false
            }));

            get().setActiveChat(chatId, contextId);
            return localChat;
          } else {
            // Use API for remote operation
            const response = await window.electron.chat.create({
              token: getUserTokenFromStore(),
              request: newChat
            });

            await get().getChat(userId, type, contextId);
            if (response.data?.data?.[0]?.id) {
              get().setActiveChat(response.data.data[0].id, contextId);
            }

            return response.data?.data?.[0];
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error(error);
          return null;
        }
      },

      deleteChat: async (chatId: string, local?: boolean) => {
        set({ isLoading: true, error: null });
        try {
          if (local) {
            console.log('Deleting chat locally');
            // Use direct DB query for local operation
            await window.electron.db.query({
              query: `
                delete from ${DBTABLES.CHATROOM}
                where id = @id
              `,
              params: { id: chatId }
            });

            // Also delete associated messages
            await window.electron.db.query({
              query: `
                delete from messages
                where chat_id = @chatId
              `,
              params: { chatId }
            });

            get().cleanupChatReferences(chatId);
          } else {
            // Use API for remote operation
            await window.electron.chat.delete({
              token: getUserTokenFromStore(),
              id: chatId
            });

            get().cleanupChatReferences(chatId);
          }

          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error(error);
        }
      },

      getChat: async (userId: string, type: string, workspaceId?: string, local?: boolean) => {
        set({ isLoading: true, error: null });
        try {
          if (local) {
            // Use direct DB query for local operation
            let query = `
              select * from ${DBTABLES.CHATROOM}
              where type = @type
              and user_id = @userId
            `;

            const params: any = { type, userId };

            if (workspaceId && workspaceId !== 'undefined') {
              query += ` and workspace_id = @workspaceId`;
              params.workspaceId = workspaceId;
            }

            const chats = await window.electron.db.query({
              query,
              params
            });

            if (Array.isArray(chats)) {
              set({ chats, isLoading: false });
            } else {
              set({ isLoading: false });
            }
          } else {
            // Use API for remote operation
            const response = await window.electron.chat.get({
              token: getUserTokenFromStore(),
              userId,
              type,
              workspaceId
            });

            if (response.data && response.data.data && Array.isArray(response.data.data)) {
              set({ chats: [...response.data.data], isLoading: false });
            } else {
              set({ isLoading: false });
            }
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error(error);
        }
      },

      updateChat: async (chatId, data, local?: boolean) => {
        set({ isLoading: true, error: null });
        try {
          // Update in local state first for UI responsiveness
          set((state) => ({
            chats: state.chats.map(chat =>
              chat.id === chatId
                ? { ...chat, ...data, last_updated: new Date().toISOString() }
                : chat
            )
          }));

          if (local) {
            // Prepare fields for update
            const updateFields = Object.entries(data)
              .filter(([key]) => key !== 'id') // Skip ID
              .map(([key, _]) => {
                // Convert camelCase keys to snake_case for SQL
                const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                return `${snakeKey} = @${key}`;
              })
              .join(', ');

            if (updateFields) {
              // Add last_updated to params
              const params = {
                ...data,
                id: chatId,
                lastUpdated: new Date().toISOString()
              };

              await window.electron.db.query({
                query: `
                  update ${DBTABLES.CHATROOM}
                  set ${updateFields}, last_updated = @lastUpdated
                  where id = @id
                `,
                params
              });
            }
          } else {
            // Use existing API flow
            const existingChat = get().chats.find(chat => chat.id === chatId);

            const updateChatArgs = {
              token: getUserTokenFromStore() || "",
              request: {
                ...existingChat,
                ...data,
                id: chatId,
                last_updated: new Date().toISOString()
              }
            };

            await window.electron.chat.update(updateChatArgs);
          }

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

          // @ts-ignore
          await window.electron.db.query({
            query: `
            insert into messages
            (id, chat_id, sender, text, created_at, reply_to, files)
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
            where id = @messageId and chat_id = @chatId
          `;

          // @ts-ignore
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
              and chat_id = @chatId
            `;

            // @ts-ignore
            await window.electron.db.query({
              query: updateQuery,
              params: { messageId, chatId, text: data.text, createdAt: data.created_at }
            });
          } else {
            // Message doesn't exist, insert it
            const insertQuery = `
              insert into messages (id, chat_id, sender, text, created_at)
              values (@messageId, @chatId, @sender, @text, @createdAt)
            `;

            // Find the message in state to get the sender
            const message = get().messages[chatId]?.find(msg => msg.id === messageId);
            const sender = message?.sender || defaultSenderId;

            // @ts-ignore
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

          // @ts-ignore
          const response = await window.electron.db.query({
            query: `
              select * from messages
              where chat_id = @chatId
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

            // @ts-ignore
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
              // @ts-ignore
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

      setInput: (chatId, input, contextId = '') => {
        set(state => ({
          inputByContextChat: {
            ...state.inputByContextChat,
            [`${contextId}:${chatId}`]: input
          }
        }));
      },

      getInput: (chatId, contextId = '') => {
        return get().inputByContextChat[`${contextId}:${chatId}`] || '';
      },

      markAsRead: (chatId) => {
        // TODO: Implement markAsRead
      },

      deleteMessage: async (chatId, messageId) => {
        set({ isLoading: true, error: null });
        try {
          // Update local state to remove the message (this can happen first for UX responsiveness)
          set((state) => ({
            messages: {
              ...state.messages,
              [chatId]: (state.messages[chatId] || []).filter(msg => msg.id !== messageId)
            }
          }));

          await window.electron.db.query({
            query: `
                            delete from reactions
                            where message_id = @messageId
                        `,
            params: {
              messageId
            }
          });

          await window.electron.db.query({
            query: `
                            delete from messages
                            where id = @messageId
                            and chat_id = @chatId
                        `,
            params: {
              messageId,
              chatId
            }
          });

          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error("Error deleting message:", error);
          throw error;
        }
      },

      editMessage: async (chatId, messageId, content) => {
        // TODO: Implement editMessage
      },

      cleanupContextReferences: (contextId) => {
        set((state) => {
          // Remove references to this context in activeChatByContext
          const newActiveChatByContext = { ...state.activeChatByContext };
          delete newActiveChatByContext[contextId];

          // Clean up input state for this context
          const newInputByContextChat = { ...state.inputByContextChat };
          Object.keys(newInputByContextChat).forEach(key => {
            if (key.startsWith(`${contextId}:`)) {
              delete newInputByContextChat[key];
            }
          });

          return {
            activeChatByContext: newActiveChatByContext,
            inputByContextChat: newInputByContextChat
          };
        });
      },


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
          and chat_id = @chatId
        `;

        // @ts-ignore
        const result = await window.electron.db.query({
          query,
          params: { messageId, chatId }
        });

        return result.data[0] || null;
      },

      // Add this implementation inside the store
      toggleReaction: async (chatId, messageId, reaction) => {
        try {
          const currentUser = getUserFromStore();
          if (!currentUser || !currentUser.id) return;

          // Check if reaction already exists in database
          // @ts-ignore
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
            // @ts-ignore
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
            // @ts-ignore
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
          const updatedChats = state.chats.filter(chat => chat.id !== chatId);

          const { [chatId]: removedMessages, ...restMessages } = state.messages;

          const { [chatId]: removedOffset, ...restOffsets } = state.messageOffsets;

          // Create a new activeChatByContext object with valid chat references
          const newActiveChatByContext = { ...state.activeChatByContext };

          // First pass: remove references to the deleted chat
          Object.entries(newActiveChatByContext).forEach(([contextId, activeChatId]) => {
            if (activeChatId === chatId) {
              delete newActiveChatByContext[contextId];
            }
          });

          // Second pass: validate all remaining references
          Object.entries(newActiveChatByContext).forEach(([contextId, activeChatId]) => {
            // If chatId doesn't exist in chats array, remove it
            if (!updatedChats.some(chat => chat.id === activeChatId)) {
              delete newActiveChatByContext[contextId];
            }
          });

          const newInputByContextChat = { ...state.inputByContextChat };
          Object.keys(newInputByContextChat).forEach(key => {
            if (key.includes(`:${chatId}`)) {
              delete newInputByContextChat[key];
            }
          });

          return {
            chats: updatedChats,
            messages: restMessages,
            messageOffsets: restOffsets,
            activeChatByContext: newActiveChatByContext,
            inputByContextChat: newInputByContextChat
          };
        });
      },

      // Add the new setter function
      setChatOverlayMinimized: (minimized) => set({ chatOverlayMinimized: minimized }),
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Limit each chat's messages to 100 most recent
        const limitedMessages: Record<string, IChatMessage[]> = {};
        Object.entries(state.messages).forEach(([chatId, messages]) => {
          limitedMessages[chatId] = messages.slice(-100);
        });

        return {
          activeChatByContext: state.activeChatByContext,
          messages: limitedMessages,
          messageOffsets: state.messageOffsets,
          chats: state.chats,
          inputByContextChat: state.inputByContextChat,
        };
      },
    }
  )
);

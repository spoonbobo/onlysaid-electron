import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getUserTokenFromStore, getUserFromStore } from "@/utils/user";
import { v4 as uuidv4 } from 'uuid';
import * as R from 'ramda';
import { validate } from 'uuid';
import { IChatMessage, IReaction } from "@/../../types/Chat/Message";
import { IChatRoom, IUpdateChatArgs } from "@/../../types/Chat/Chatroom";
import { IUser } from "@/../../types/User/User";
import { useSocketStore } from "../Socket/SocketStore";
import { useLLMStore } from '@/stores/LLM/LLMStore';
import { IChatMessageToolCall } from '@/../../types/Chat/Message';
import { DBTABLES } from '@/../../constants/db';

const MESSAGE_FETCH_LIMIT = 35;


interface ChatState {
  activeChatByContext: Record<string, string | null>;
  messages: Record<string, IChatMessage[]>;
  messageOffsets: Record<string, number>;
  chats: IChatRoom[];
  inputByContextChat: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  chatOverlayMinimized: boolean;

  createChat: (userId: string, type: string, workspaceId?: string) => Promise<IChatRoom | null>;
  deleteChat: (chatId: string, local?: boolean) => Promise<void>;
  getChat: (userId: string, type: string, workspaceId?: string) => Promise<void>;
  updateChat: (chatId: string, data: Partial<IChatRoom>, local?: boolean) => Promise<void>;
  setActiveChat: (chatId: string, contextId?: string) => void;
  markAsRead: (chatId: string) => void;
  getActiveChatIdForContext: (contextId: string) => string | null;
  cleanupContextReferences: (contextId: string) => void;
  cleanupChatReferences: (chatId: string) => void;

  sendMessage: (chatId: string, messageData: Partial<IChatMessage>, workspaceId?: string) => Promise<string | void>;
  updateMessage: (chatId: string, messageId: string, data: Partial<IChatMessage>) => Promise<void>;
  fetchMessages: (chatId: string, loadMore?: boolean, preserveHistory?: boolean) => Promise<boolean>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  editMessage: (chatId: string, messageId: string, content: string) => Promise<void>;
  appendMessage: (chatId: string, message: IChatMessage) => void;
  getMessageById: (chatId: string, messageId: string) => Promise<IChatMessage | null>;
  refreshMessage: (chatId: string, messageId: string) => Promise<void>;

  setInput: (chatId: string, input: string, contextId?: string) => void;
  getInput: (chatId: string, contextId?: string) => string;

  toggleReaction: (chatId: string, messageId: string, reaction: string) => Promise<void>;

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

const messagesByIdCache = new Map<string, Map<string, IChatMessage>>();

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
        const { chats } = get();

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
        workspaceId?: string,
      ) => {
        set({ isLoading: true, error: null });
        try {
          const newChat = NewChat(userId, type, workspaceId);
          const chatId = uuidv4();

          if (!workspaceId || workspaceId === 'undefined') {
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

            get().setActiveChat(chatId, workspaceId);
            return localChat;
          } else {
            const response = await window.electron.chat.create({
              token: getUserTokenFromStore(),
              request: newChat
            });

            await get().getChat(userId, type, workspaceId);
            if (response.data?.data?.[0]?.id) {
              get().setActiveChat(response.data.data[0].id, workspaceId);
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
            await window.electron.db.query({
              query: `
                delete from ${DBTABLES.CHATROOM}
                where id = @id
              `,
              params: { id: chatId }
            });

            await window.electron.db.query({
              query: `
                delete from messages
                where chat_id = @chatId
              `,
              params: { chatId }
            });

            get().cleanupChatReferences(chatId);
          } else {
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

      getChat: async (userId: string, type: string, workspaceId?: string) => {
        set({ isLoading: true, error: null });
        try {
          if (!workspaceId || workspaceId === 'undefined') {
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
          set((state) => ({
            chats: state.chats.map(chat =>
              chat.id === chatId
                ? { ...chat, ...data, last_updated: new Date().toISOString() }
                : chat
            )
          }));

          if (local) {
            const updateFields = Object.entries(data)
              .filter(([key]) => key !== 'id')
              .map(([key, _]) => {
                const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                return `${snakeKey} = @${key}`;
              })
              .join(', ');

            if (updateFields) {
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

      sendMessage: async (chatId, messageData, workspaceId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const messageId = uuidv4();
          const status = workspaceId ? "pending" : "sent"
          const sent_at = workspaceId ? null : messageData.sent_at || new Date().toISOString()
          const message: IChatMessage = {
            id: messageId,
            chat_id: chatId,
            sender: getUserFromStore()?.id || "",
            text: messageData.text || "",
            created_at: messageData.created_at || new Date().toISOString(),
            reply_to: messageData.reply_to || undefined,
            files: messageData.files || undefined,
            sent_at: sent_at || new Date().toISOString(),
            status: status
          }

          await window.electron.db.query({
            query: `
            insert into messages
            (id, chat_id, sender, text, created_at, reply_to, files, sent_at, status)
            values
            (@id, @chat_id, @sender, @text, @created_at, @reply_to, @files, @sent_at, @status)
            `,
            params: message
          });

          if (workspaceId) {
            useSocketStore.getState().sendMessage(message, workspaceId);
          }

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
          set((state) => ({
            messages: {
              ...state.messages,
              [chatId]: (state.messages[chatId] || []).map(msg =>
                msg.id === messageId ? {
                  ...msg,
                  ...data,
                  reactions: data.reactions !== undefined ? data.reactions : (msg.reactions || [])
                } : msg
              )
            }
          }));

          const checkQuery = `
            select count(*) as count from messages
            where id = @messageId and chat_id = @chatId
          `;

          const result = await window.electron.db.query({
            query: checkQuery,
            params: { messageId, chatId }
          });

          if (result && result[0] && result[0].count > 0) {
            const message = get().messages[chatId]?.find(msg => msg.id === messageId);
            const sender = data.sender || message?.sender || "";

            const updateQuery = `
              update messages
              set text = @text, created_at = @createdAt, sender = @sender
              where id = @messageId
              and chat_id = @chatId
            `;

            await window.electron.db.query({
              query: updateQuery,
              params: {
                messageId,
                chatId,
                text: data.text,
                sender,
                createdAt: data.created_at
              }
            });
          } else {
            const insertQuery = `
              insert into messages (id, chat_id, sender, text, created_at)
              values (@messageId, @chatId, @sender, @text, @createdAt)
            `;

            const message = get().messages[chatId]?.find(msg => msg.id === messageId);
            const sender = data.sender || message?.sender || "";

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

          const existingMessageIds = new Set(existingMessages.map(msg => msg.id));

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

            const reactions = await window.electron.db.query({
              query: `
              select * from reactions
              where message_id in (${placeholders})
              `,
              params: params
            });

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

              if (userInfos && userInfos.data && userInfos.data.data) {
                userMap = R.indexBy(
                  R.prop('id') as (user: IUser) => string,
                  userInfos.data.data as IUser[]
                );
              }
            } catch (error) {
              console.error("Error fetching user information:", error);
            }

            const messagesWithUsersAndReactions = R.map(msg => ({
              ...msg,
              sender_object: userMap[msg.sender] || null,
              reactions: reactionsByMessageId[msg.id] || []
            }), fetchedMessages).filter(msg => !existingMessageIds.has(msg.id));

            if (!messagesByIdCache.has(chatId)) {
              messagesByIdCache.set(chatId, new Map());
            }

            const chatMessageMap = messagesByIdCache.get(chatId)!;
            fetchedMessages.forEach(msg => chatMessageMap.set(msg.id, msg));

            const llmStore = useLLMStore.getState();
            const processedMessages: IChatMessage[] = [];
            const currentUser = getUserFromStore();

            for (const msg of messagesWithUsersAndReactions) {
              let fetchedToolCalls: IChatMessageToolCall[] | undefined = undefined;
              if (msg.sender !== currentUser?.id && !msg.is_tool_response) {
                const calls = await llmStore.getToolCallsByMessageId(msg.id);
                if (calls.length > 0) {
                  fetchedToolCalls = calls;
                }
              }
              processedMessages.push({
                ...msg,
                tool_calls: fetchedToolCalls,
              });
            }

            set(state => {
              const currentMessages = state.messages[chatId] || [];

              let updatedMessages;
              if (loadMore) {
                updatedMessages = [...processedMessages, ...currentMessages];
              } else if (preserveHistory) {
                updatedMessages = [...currentMessages, ...processedMessages.filter(msg =>
                  !currentMessages.some(m => m.id === msg.id))];
              } else {
                const memoryOnlyMessages = currentMessages.filter(msg =>
                  !processedMessages.some(dbMsg => dbMsg.id === msg.id)
                );
                updatedMessages = [...processedMessages, ...memoryOnlyMessages];
              }

              updatedMessages.sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );

              const limitedMessages = updatedMessages.slice(-MESSAGE_FETCH_LIMIT);

              return {
                messages: {
                  ...state.messages,
                  [chatId]: limitedMessages
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
      },

      deleteMessage: async (chatId, messageId) => {
        set({ isLoading: true, error: null });
        try {
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
      },

      cleanupContextReferences: (contextId) => {
        set((state) => {
          const newActiveChatByContext = { ...state.activeChatByContext };
          delete newActiveChatByContext[contextId];

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
          const existingMessageIndex = currentMessages.findIndex(msg => msg.id === message.id);

          if (existingMessageIndex !== -1) {
            // Message exists, update it while preserving reactions and other fields
            const existingMessage = currentMessages[existingMessageIndex];
            const updatedMessage = {
              ...existingMessage,
              ...message,
              reactions: message.reactions || existingMessage.reactions || []
            };

            const updatedMessages = [...currentMessages];
            updatedMessages[existingMessageIndex] = updatedMessage;

            return {
              messages: {
                ...state.messages,
                [chatId]: updatedMessages.slice(-MESSAGE_FETCH_LIMIT)
              }
            };
          }

          // New message, ensure it has reactions initialized
          const messageWithReactions = {
            ...message,
            reactions: message.reactions || [],
          };

          const updatedMessages = [...currentMessages, messageWithReactions];
          const limitedMessages = updatedMessages.slice(-MESSAGE_FETCH_LIMIT);

          return {
            messages: {
              ...state.messages,
              [chatId]: limitedMessages
            }
          };
        });
      },

      getMessageById: async (chatId, messageId) => {
        const query = `
          select * from messages
          where id = @messageId
          and chat_id = @chatId
        `;

        const result = await window.electron.db.query({
          query,
          params: { messageId, chatId }
        });

        return result.data[0] || null;
      },

      refreshMessage: async (chatId: string, messageId: string): Promise<void> => {
        try {
          const llmStore = useLLMStore.getState();
          const updatedToolCalls = await llmStore.getToolCallsByMessageId(messageId);

          set(state => {
            const currentMessages = state.messages[chatId] || [];
            const messageIndex = currentMessages.findIndex(m => m.id === messageId);

            if (messageIndex === -1) {
              console.warn(`[ChatStore] refreshMessage: Message ${messageId} not found in chat ${chatId}.`);
              return state;
            }

            const existingMessage = currentMessages[messageIndex];
            const refreshedMessage: IChatMessage = { // Ensure IChatMessage type
              ...existingMessage,
              tool_calls: updatedToolCalls,
            };

            const newMessagesForChat = [
              ...currentMessages.slice(0, messageIndex),
              refreshedMessage,
              ...currentMessages.slice(messageIndex + 1),
            ];

            return {
              ...state,
              messages: {
                ...state.messages,
                [chatId]: newMessagesForChat,
              },
            };
          });
        } catch (error) {
          console.error(`[ChatStore] Error refreshing message ${messageId} for chat ${chatId}:`, error);
          // Optionally, update error state in the store if needed
        }
      },

      toggleReaction: async (chatId, messageId, reaction) => {
        try {
          console.log('[ChatStore] toggleReaction called with:', { chatId, messageId, reaction });

          const currentUser = getUserFromStore();
          if (!currentUser || !currentUser.id) {
            console.log('[ChatStore] No current user found');
            return;
          }

          const messages = get().messages[chatId] || [];
          const message = messages.find(m => m.id === messageId);
          if (!message) {
            console.log('[ChatStore] Message not found:', { chatId, messageId, availableMessages: messages.map(m => m.id) });
            return;
          }

          console.log('[ChatStore] Found message:', { messageId, hasReactions: !!message.reactions, reactionsLength: message.reactions?.length });

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

          const currentReactions = message.reactions || [];

          set((state) => {
            const messages = state.messages[chatId] || [];
            const messageIndex = messages.findIndex(m => m.id === messageId);

            if (messageIndex === -1) {
              console.log('[ChatStore] Message index not found in state update');
              return state;
            }

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

            console.log('[ChatStore] Updated reactions:', { messageId, newReactionsLength: updatedReactions.length });

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

      cleanupChatReferences: (chatId: string) => {
        set(state => {
          const updatedChats = state.chats.filter(chat => chat.id !== chatId);

          const { [chatId]: removedMessages, ...restMessages } = state.messages;

          const { [chatId]: removedOffset, ...restOffsets } = state.messageOffsets;

          const newActiveChatByContext = { ...state.activeChatByContext };

          Object.entries(newActiveChatByContext).forEach(([contextId, activeChatId]) => {
            if (activeChatId === chatId) {
              delete newActiveChatByContext[contextId];
            }
          });

          Object.entries(newActiveChatByContext).forEach(([contextId, activeChatId]) => {
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

      setChatOverlayMinimized: (minimized) => set({ chatOverlayMinimized: minimized }),
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const limitedMessages: Record<string, IChatMessage[]> = {};
        Object.entries(state.messages).forEach(([chatId, messages]) => {
          limitedMessages[chatId] = messages.slice(-MESSAGE_FETCH_LIMIT);
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

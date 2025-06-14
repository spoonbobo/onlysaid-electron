import { v4 as uuidv4 } from 'uuid';
import { getUserTokenFromStore, getUserFromStore } from "@/utils/user";
import { DBTABLES } from '@/../../constants/db';
import { IChatRoom } from "@/../../types/Chat/Chatroom";
import { NewChat } from './utils';
import { ChatState } from './types';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';

export const createChatActions = (set: any, get: () => ChatState) => ({
  getActiveChatIdForContext: (contextId: string) => {
    return get().activeChatByContext[contextId] || null;
  },

  setActiveChat: (chatId: string, contextId = '') => {
    const { chats } = get();

    if (!chatId) {
      set((state: ChatState) => ({
        activeChatByContext: {
          ...state.activeChatByContext,
          [contextId]: null
        }
      }));
      return;
    }

    const chatExists = chats.some(chat => chat.id === chatId);

    if (chatExists) {
      set((state: ChatState) => ({
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

      if (!userId && (!workspaceId || workspaceId === 'undefined')) {
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

        set((state: ChatState) => ({
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
      if (!userId && (!workspaceId || workspaceId === 'undefined')) {
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

  updateChat: async (chatId: string, data: Partial<IChatRoom>, local?: boolean) => {
    set({ isLoading: true, error: null });
    try {
      set((state: ChatState) => ({
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

  markAsRead: (chatId: string) => {
    // Implementation here if needed
  },

  cleanupContextReferences: (contextId: string) => {
    set((state: ChatState) => {
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

  cleanupChatReferences: (chatId: string) => {
    set((state: ChatState) => {
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

  setChatOverlayMinimized: (minimized: boolean) => set({ chatOverlayMinimized: minimized }),
}); 
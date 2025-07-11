import { v4 as uuidv4 } from 'uuid';
import { getUserTokenFromStore, getUserFromStore } from "@/utils/user";
import { DBTABLES } from '@/../../constants/db';
import { IChatRoom } from "@/../../types/Chat/Chatroom";
import { NewChat } from './utils';
import { ChatState } from './types';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { useCryptoStore } from '../Crypto/CryptoStore';
import { useWorkspaceStore } from '@/renderer/stores/Workspace/WorkspaceStore';

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
      
      const chat = chats.find(c => c.id === chatId);
      const workspaceId = chat?.workspace_id;
      
      if (get().markChatAsRead) {
        get().markChatAsRead(chatId, workspaceId);
      }
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

      // NEW: Check if this is avatar mode - force local storage
      const topicStore = useTopicStore.getState();
      const isAvatarMode = topicStore.selectedContext?.section === 'workspace:avatar';
      const shouldUseLocal = userId === 'guest' || isAvatarMode || (!workspaceId || workspaceId === 'undefined');

      if (shouldUseLocal) {
        console.log('Creating local chat', isAvatarMode ? '(Avatar mode)' : '(Guest/No workspace)');
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
            workspaceId: isAvatarMode ? null : (newChat.workspace_id || null), // Force null for avatar mode
            type: newChat.type,
            userId: newChat.user_id
          }
        });

        const localChat = {
          ...newChat,
          id: chatId,
          workspace_id: isAvatarMode ? null : newChat.workspace_id // Force null for avatar mode
        };

        const { isUnlocked, createChatKey } = useCryptoStore.getState();
        if (isUnlocked) {
          try {
            const currentUser = getUserFromStore();
            if (currentUser?.id) {
              await createChatKey(chatId, [currentUser.id]);
              console.log('✅ Chat encryption key created for local chat');
            }
          } catch (error) {
            console.warn('⚠️ Failed to create chat encryption key:', error);
          }
        }

        set((state: ChatState) => ({
          chats: [...state.chats, localChat],
          isLoading: false
        }));

        const contextId = (workspaceId && workspaceId !== 'undefined' && !isAvatarMode) ? workspaceId : '';
        get().setActiveChat(chatId, contextId);
        return localChat;
      } else {
        const response = await window.electron.chat.create({
          token: getUserTokenFromStore(),
          request: newChat
        });

        const createdChatId = response.data?.data?.[0]?.id;
        if (createdChatId) {
          const { isUnlocked, createChatKey } = useCryptoStore.getState();
          if (isUnlocked) {
            try {
              if (workspaceId && workspaceId !== 'undefined') {
                const workspaceUsers = await useWorkspaceStore.getState().getUsersByWorkspace(workspaceId);
                const allUserIds = workspaceUsers.map(user => user.user_id);
                
                if (allUserIds.length > 0) {
                  await createChatKey(createdChatId, allUserIds);
                  console.log(`✅ Chat encryption key created for ${allUserIds.length} workspace users`);
                } else {
                  const currentUser = getUserFromStore();
                  if (currentUser?.id) {
                    await createChatKey(createdChatId, [currentUser.id]);
                    console.log('✅ Chat encryption key created for current user only (no workspace users found)');
                  }
                }
              } else {
                const currentUser = getUserFromStore();
                if (currentUser?.id) {
                  await createChatKey(createdChatId, [currentUser.id]);
                  console.log('✅ Chat encryption key created for non-workspace chat');
                }
              }
            } catch (error) {
              console.warn('⚠️ Failed to create chat encryption key:', error);
            }
          }
        }

        await get().getChat(userId, type, workspaceId);
        if (createdChatId) {
          get().setActiveChat(createdChatId, workspaceId);
          
          if (workspaceId && workspaceId !== 'undefined') {
            const topicStore = useTopicStore.getState();
            topicStore.setWorkspaceSelectedChat(workspaceId, createdChatId);
          }
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
      // NEW: Check if this is avatar mode or if the chat is local
      const topicStore = useTopicStore.getState();
      const isAvatarMode = topicStore.selectedContext?.section === 'workspace:avatar';
      const chat = get().chats.find(c => c.id === chatId);
      const shouldUseLocal = local || isAvatarMode || !chat?.workspace_id;

      if (shouldUseLocal) {
        console.log('Deleting chat locally', isAvatarMode ? '(Avatar mode)' : '');
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
      // NEW: Check if this is avatar mode - force local storage
      const topicStore = useTopicStore.getState();
      const isAvatarMode = topicStore.selectedContext?.section === 'workspace:avatar';
      const shouldUseLocal = !userId || isAvatarMode || (!workspaceId || workspaceId === 'undefined');

      if (shouldUseLocal) {
        let query = `
          select * from ${DBTABLES.CHATROOM}
          where type = @type
          and user_id = @userId
        `;

        const params: any = { type, userId };

        if (workspaceId && workspaceId !== 'undefined' && !isAvatarMode) {
          query += ` and workspace_id = @workspaceId`;
          params.workspaceId = workspaceId;
        } else if (isAvatarMode) {
          // For avatar mode, only get local chats (workspace_id is null)
          query += ` and workspace_id IS NULL`;
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
          const newChats = response.data.data;
          
          set((state: ChatState) => {
            const existingChats = state.chats;
            
            const filteredExistingChats = existingChats.filter(chat => {
              if (workspaceId && workspaceId !== 'undefined') {
                return chat.workspace_id !== workspaceId || chat.type !== type;
              } else {
                return !(chat.type === type && (!chat.workspace_id || chat.workspace_id === 'undefined'));
              }
            });
            
            const mergedChats = [...filteredExistingChats, ...newChats];
            
            return {
              chats: mergedChats,
              isLoading: false
            };
          });
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

      // NEW: Check if this is avatar mode or if the chat is local
      const topicStore = useTopicStore.getState();
      const isAvatarMode = topicStore.selectedContext?.section === 'workspace:avatar';
      const chat = get().chats.find(c => c.id === chatId);
      const shouldUseLocal = local || isAvatarMode || !chat?.workspace_id;

      if (shouldUseLocal) {
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
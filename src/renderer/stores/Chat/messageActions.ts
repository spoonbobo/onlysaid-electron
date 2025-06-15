import { v4 as uuidv4 } from 'uuid';
import * as R from 'ramda';
import { getUserTokenFromStore, getUserFromStore } from "@/utils/user";
import { getCurrentWorkspace } from "@/utils/workspace";
import { IChatMessage, IReaction } from "@/../../types/Chat/Message";
import { IChatMessageToolCall } from '@/../../types/Chat/Message';
import { IFile } from "@/../../types/File/File";
import { IUser } from "@/../../types/User/User";
import { useSocketStore } from "../Socket/SocketStore";
import { useLLMStore } from '@/renderer/stores/LLM/LLMStore';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { getUsersWithCache, messagesByIdCache } from './utils';
import { ChatState, MESSAGE_FETCH_LIMIT } from './types';

export const createMessageActions = (set: any, get: () => ChatState) => ({
  sendMessage: async (chatId: string, messageData: Partial<IChatMessage>, workspaceId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const messageId = uuidv4();
      const status = workspaceId ? "pending" : "sent"
      const sent_at = workspaceId ? null : messageData.sent_at || new Date().toISOString()

      let files: IFile[] | undefined = undefined;

      // If we have file_ids, fetch the file metadata immediately
      if (messageData.file_ids) {
        try {
          const fileIds = JSON.parse(messageData.file_ids);
          if (Array.isArray(fileIds) && fileIds.length > 0) {
            const token = getUserTokenFromStore();
            const workspace = getCurrentWorkspace();

            if (token && workspace?.id) {
              const filesResponse = await window.electron.fileSystem.getFilesMetadata({
                workspaceId: workspace.id,
                fileIds: fileIds,
                token
              });

              if (filesResponse?.data) {
                files = filesResponse.data;
                console.log('Fetched file metadata for sendMessage:', files);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching file metadata in sendMessage:', error);
        }
      }

      const message: IChatMessage = {
        id: messageId,
        chat_id: chatId,
        sender: getUserFromStore()?.id || "",
        text: messageData.text || "",
        created_at: messageData.created_at || new Date().toISOString(),
        reply_to: messageData.reply_to || undefined,
        file_ids: messageData.file_ids,
        files: files, // Add the populated files array
        sent_at: sent_at || new Date().toISOString(),
        status: status
      }

      // Store in local database
      await window.electron.db.query({
        query: `
        insert into messages
        (id, chat_id, sender, text, created_at, reply_to, file_ids, sent_at, status)
        values
        (@id, @chat_id, @sender, @text, @created_at, @reply_to, @file_ids, @sent_at, @status)
        `,
        params: message
      });

      // Add to local state immediately with files populated
      get().appendMessage(chatId, message);

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

  updateMessage: async (chatId: string, messageId: string, data: Partial<IChatMessage>) => {
    set({ isLoading: true, error: null });
    try {
      set((state: ChatState) => ({
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

        const updateFields = ['text = @text', 'sender = @sender'];
        const updateParams: any = {
          messageId,
          chatId,
          text: data.text,
          sender
        };

        if (data.created_at !== undefined && data.created_at !== null) {
          updateFields.push('created_at = @createdAt');
          updateParams.createdAt = data.created_at;
        }

        const updateQuery = `
          update messages
          set ${updateFields.join(', ')}
          where id = @messageId
          and chat_id = @chatId
        `;

        await window.electron.db.query({
          query: updateQuery,
          params: updateParams
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

  fetchMessages: async (chatId: string, loadMore = false, preserveHistory = false) => {
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

        // Use the new caching function
        const uniqueSenderIds = R.uniq(R.pluck('sender', fetchedMessages));
        const userMap = await getUsersWithCache(uniqueSenderIds);

        // Collect all file IDs from messages that have them
        const allFileIds: string[] = [];
        const messageFileIdMap: Record<string, string[]> = {};

        for (const msg of fetchedMessages) {
          if (msg.file_ids) {
            try {
              const fileIds = JSON.parse(msg.file_ids);
              if (Array.isArray(fileIds) && fileIds.length > 0) {
                messageFileIdMap[msg.id] = fileIds;
                allFileIds.push(...fileIds);
              }
            } catch (error) {
              console.error(`Error parsing file_ids for message ${msg.id}:`, error);
            }
          }
        }

        let filesMap: Record<string, IFile> = {};
        if (allFileIds.length > 0) {
          try {
            const token = getUserTokenFromStore();
            const workspace = getCurrentWorkspace();

            if (token && workspace?.id) {
              const uniqueFileIds = [...new Set(allFileIds)];
              const filesResponse = await window.electron.fileSystem.getFilesMetadata({
                workspaceId: workspace.id,
                fileIds: uniqueFileIds,
                token
              });

              if (filesResponse?.data) {
                filesMap = R.indexBy(R.prop('id'), filesResponse.data);
              }
            }
          } catch (error) {
            console.error("Error fetching file metadata:", error);
          }
        }

        const messagesWithUsersAndReactions = R.map(msg => ({
          ...msg,
          sender_object: userMap[msg.sender] || null,
          reactions: reactionsByMessageId[msg.id] || [],
          files: messageFileIdMap[msg.id] ?
            messageFileIdMap[msg.id].map(fileId => filesMap[fileId]).filter(Boolean) :
            undefined
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

        set((state: ChatState) => {
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

  deleteMessage: async (chatId: string, messageId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Check if the message being deleted is currently streaming
      const { streamingState, setStreamingState } = useTopicStore.getState();
      if (streamingState.messageId === messageId && streamingState.chatId === chatId) {
        // Clear the streaming state to prevent the UI from recreating the deleted message
        setStreamingState(null, null);
      }

      set((state: ChatState) => ({
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

  editMessage: async (chatId: string, messageId: string, content: string) => {
    // Implementation here if needed
  },

  appendMessage: (chatId: string, message: IChatMessage) => {
    set((state: ChatState) => {
      const currentMessages = state.messages[chatId] || [];

      const existingMessageIndex = currentMessages.findIndex(msg => msg.id === message.id);

      if (existingMessageIndex !== -1) {
        const existingMessage = currentMessages[existingMessageIndex];
        const updatedMessage = {
          ...existingMessage,
          ...message,
          reactions: message.reactions || existingMessage.reactions || [],
          files: message.files || existingMessage.files
        };

        const updatedMessages = [...currentMessages];
        updatedMessages[existingMessageIndex] = updatedMessage;

        // Re-sort messages by timestamp after update
        updatedMessages.sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return timeA - timeB;
        });

        return {
          messages: {
            ...state.messages,
            [chatId]: updatedMessages.slice(-MESSAGE_FETCH_LIMIT)
          }
        };
      }

      const messageWithReactions = {
        ...message,
        reactions: message.reactions || [],
      };

      // Save message to database if it doesn't exist (important for socket messages)
      (async () => {
        try {
          const checkQuery = `
            select count(*) as count from messages
            where id = @messageId and chat_id = @chatId
          `;

          const result = await window.electron.db.query({
            query: checkQuery,
            params: { messageId: message.id, chatId }
          });

          const messageExists = result && result[0] && result[0].count > 0;

          if (!messageExists) {
            // Insert message into database
            await window.electron.db.query({
              query: `
                insert into messages
                (id, chat_id, sender, text, created_at, reply_to, file_ids, sent_at, status, reactions, mentions, poll, contact, gif)
                values
                (@id, @chat_id, @sender, @text, @created_at, @reply_to, @file_ids, @sent_at, @status, @reactions, @mentions, @poll, @contact, @gif)
              `,
              params: {
                id: message.id,
                chat_id: chatId,
                sender: message.sender,
                text: message.text || '',
                created_at: message.created_at,
                reply_to: message.reply_to || null,
                file_ids: message.file_ids || null,
                sent_at: message.sent_at || message.created_at,
                status: message.status || 'sent',
                reactions: message.reactions ? JSON.stringify(message.reactions) : null,
                mentions: message.mentions ? JSON.stringify(message.mentions) : null,
                poll: message.poll || null,
                contact: message.contact || null,
                gif: message.gif || null
              }
            });
          }
        } catch (error) {
          console.error('Error saving message to database in appendMessage:', error);
        }
      })();

      // If message has file_ids but no files array, try to populate it
      if (messageWithReactions.file_ids && !messageWithReactions.files) {
        messageWithReactions.files = [];

        (async () => {
          try {
            if (messageWithReactions.file_ids) {
              const fileIds = JSON.parse(messageWithReactions.file_ids);
              if (Array.isArray(fileIds) && fileIds.length > 0) {
                const token = getUserTokenFromStore();
                const workspace = getCurrentWorkspace();

                if (token && workspace?.id) {
                  const filesResponse = await window.electron.fileSystem.getFilesMetadata({
                    workspaceId: workspace.id,
                    fileIds: fileIds,
                    token
                  });

                  if (filesResponse?.data) {
                    get().updateMessageFiles(chatId, message.id, filesResponse.data);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error fetching file metadata in appendMessage:', error);
          }
        })();
      }

      // If sender_object is missing, fetch it asynchronously
      if (!messageWithReactions.sender_object && messageWithReactions.sender) {
        (async () => {
          try {
            const userMap = await getUsersWithCache([messageWithReactions.sender]);
            if (userMap[messageWithReactions.sender]) {
              set((state: ChatState) => ({
                messages: {
                  ...state.messages,
                  [chatId]: (state.messages[chatId] || []).map(msg =>
                    msg.id === message.id
                      ? { ...msg, sender_object: userMap[messageWithReactions.sender] }
                      : msg
                  )
                }
              }));
            }
          } catch (error) {
            console.error('Error fetching sender object in appendMessage:', error);
          }
        })();
      }

      // Insert message in correct chronological position based on created_at timestamp
      const newMessageTime = new Date(messageWithReactions.created_at).getTime();
      const insertIndex = currentMessages.findIndex(msg => {
        const msgTime = new Date(msg.created_at).getTime();
        return newMessageTime < msgTime;
      });

      let updatedMessages;
      if (insertIndex === -1) {
        // Message is newest, append to end
        updatedMessages = [...currentMessages, messageWithReactions];
      } else {
        // Insert message at correct position
        updatedMessages = [
          ...currentMessages.slice(0, insertIndex),
          messageWithReactions,
          ...currentMessages.slice(insertIndex)
        ];
      }

      const limitedMessages = updatedMessages.slice(-MESSAGE_FETCH_LIMIT);

      return {
        messages: {
          ...state.messages,
          [chatId]: limitedMessages
        }
      };
    });
  },

  getMessageById: async (chatId: string, messageId: string) => {
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

      set((state: ChatState) => {
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

  toggleReaction: async (chatId: string, messageId: string, reaction: string) => {
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

      set((state: ChatState) => {
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

  updateMessageFiles: (chatId: string, messageId: string, files: IFile[]) => {
    set((state: ChatState) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map(msg =>
          msg.id === messageId ? { ...msg, files } : msg
        )
      }
    }));
  },

  populateMessageSenderObjects: async (messages: IChatMessage[]): Promise<IChatMessage[]> => {
    const uniqueSenderIds = R.uniq(
      messages
        .map(msg => msg.sender)
        .filter(senderId => senderId && !messages.find(m => m.id === senderId)?.sender_object)
    );

    if (uniqueSenderIds.length === 0) {
      return messages;
    }

    const userMap = await getUsersWithCache(uniqueSenderIds);

    return messages.map(msg => ({
      ...msg,
      sender_object: msg.sender_object || userMap[msg.sender] || null
    }));
  },
}); 
import { v4 as uuidv4 } from 'uuid';
import * as R from 'ramda';
import { getUserTokenFromStore, getUserFromStore } from "@/utils/user";
import { getCurrentWorkspace } from "@/utils/workspace";
import { IChatMessage, IReaction, IEncryptedMessage } from "@/../../types/Chat/Message";
import { IChatMessageToolCall } from '@/../../types/Chat/Message';
import { IFile } from "@/../../types/File/File";
import { useSocketStore } from "../Socket/SocketStore";
import { useLLMStore } from '@/renderer/stores/LLM/LLMStore';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { useCryptoStore } from '../Crypto/CryptoStore';
import { getUsersWithCache, messagesByIdCache } from './utils';
import { ChatState, MESSAGE_FETCH_LIMIT } from './types';
import { 
  clearNotificationsForContext, 
  clearNotificationsForWorkspaceSection,
  clearNotificationsForHomeSection 
} from '@/utils/notifications';

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

      // Prepare message object
      const message: IChatMessage = {
        id: messageId,
        chat_id: chatId,
        sender: getUserFromStore()?.id || "",
        text: messageData.text || "",
        created_at: messageData.created_at || new Date().toISOString(),
        reply_to: messageData.reply_to || undefined,
        file_ids: messageData.file_ids,
        files: files,
        sent_at: sent_at || new Date().toISOString(),
        status: status
      };

      // Try to encrypt the message if crypto is available
      let encryptedMessage: IEncryptedMessage | undefined;
      let isEncrypted = false;
      
      // Get fresh crypto store state
      const cryptoStore = useCryptoStore.getState();
      console.log('🔐 Crypto store state:', {
        isUnlocked: cryptoStore.isUnlocked,
        hasEncryptMessage: typeof cryptoStore.encryptMessage === 'function',
        messageText: message.text,
        chatId: chatId
      });
      
      if (cryptoStore.isUnlocked && message.text) {
        try {
          console.log('🔑 Attempting to encrypt message...');
          encryptedMessage = await cryptoStore.encryptMessage(message.text, chatId);
          isEncrypted = true;
          console.log('✅ Message encrypted successfully');
        } catch (error) {
          console.warn('⚠️ Failed to encrypt message, sending as plaintext:', error);
          // Continue with plaintext if encryption fails
        }
      } else {
        console.log('🔓 Encryption skipped:', {
          isUnlocked: cryptoStore.isUnlocked,
          hasText: !!message.text,
          reason: !cryptoStore.isUnlocked ? 'Crypto not unlocked' : 'No message text'
        });
      }

      // Prepare database parameters - convert boolean to integer for SQLite
      const dbParams: any = {
        id: message.id,
        chat_id: message.chat_id,
        sender: message.sender,
        text: message.text,
        created_at: message.created_at,
        reply_to: message.reply_to || null,
        file_ids: message.file_ids || null,
        sent_at: message.sent_at,
        status: message.status,
        is_encrypted: isEncrypted ? 1 : 0, // Convert boolean to integer
        encrypted_text: null,
        encryption_iv: null,
        encryption_key_version: null,
        encryption_algorithm: null
      };

      // Add encryption fields if message was encrypted
      if (encryptedMessage) {
        dbParams.encrypted_text = JSON.stringify(encryptedMessage);
        dbParams.encryption_iv = encryptedMessage.iv;
        dbParams.encryption_key_version = encryptedMessage.keyVersion;
        dbParams.encryption_algorithm = encryptedMessage.algorithm;
      }

      // Store in local database with encryption fields
      await window.electron.db.query({
        query: `
        insert into messages
        (id, chat_id, sender, text, created_at, reply_to, file_ids, sent_at, status, 
         encrypted_text, encryption_iv, encryption_key_version, encryption_algorithm, is_encrypted)
        values
        (@id, @chat_id, @sender, @text, @created_at, @reply_to, @file_ids, @sent_at, @status,
         @encrypted_text, @encryption_iv, @encryption_key_version, @encryption_algorithm, @is_encrypted)
        `,
        params: dbParams
      });

      // Add encryption metadata to message object for local state
      if (isEncrypted) {
        message.encrypted_text = encryptedMessage;
        message.is_encrypted = true;
        // Keep the original text for local display - don't clear it
      }

      // Add to local state immediately with files populated
      get().appendMessage(chatId, message);

      if (workspaceId) {
        // Create a network-safe version of the message for transmission
        const networkMessage: IChatMessage = {
          ...message,
          // Remove plaintext for network transmission if encrypted
          text: isEncrypted ? '' : message.text,
          // Include encryption metadata
          encrypted_text: encryptedMessage,
          is_encrypted: isEncrypted
        };
        
        useSocketStore.getState().sendMessage(networkMessage, workspaceId);
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

      // Fetch messages including encryption fields
      const response = await window.electron.db.query({
        query: `
          select id, chat_id, sender, text, created_at, reply_to, file_ids, sent_at, status,
                 encrypted_text, encryption_iv, encryption_key_version, encryption_algorithm, is_encrypted
          from messages
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

        // Get crypto store for decryption
        const { isUnlocked, decryptMessage } = useCryptoStore.getState();

        // Decrypt messages if possible
        const decryptedMessages = await Promise.all(
          fetchedMessages.map(async (msg) => {
            if (msg.is_encrypted && msg.encrypted_text && isUnlocked) {
              try {
                const encryptedData = JSON.parse(msg.encrypted_text);
                const decryptedText = await decryptMessage(encryptedData, chatId);
                
                if (decryptedText) {
                  return {
                    ...msg,
                    text: decryptedText,
                    encrypted_text: encryptedData
                  };
                } else {
                  // Decryption failed, show encrypted indicator
                  return {
                    ...msg,
                    text: '🔒 [Encrypted message - unable to decrypt]',
                    encrypted_text: encryptedData
                  };
                }
              } catch (error) {
                console.error('Failed to decrypt message:', error);
                return {
                  ...msg,
                  text: '🔒 [Encrypted message - decryption error]',
                  encrypted_text: msg.encrypted_text
                };
              }
            }
            
            // Return plaintext message as-is
            return msg;
          })
        );

        // Continue with existing logic for reactions, users, files, etc.
        const msgIds = decryptedMessages.map(msg => msg.id);
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
        const uniqueSenderIds = R.uniq(R.pluck('sender', decryptedMessages));
        const userMap = await getUsersWithCache(uniqueSenderIds);

        // Collect all file IDs from messages that have them
        const allFileIds: string[] = [];
        const messageFileIdMap: Record<string, string[]> = {};

        for (const msg of decryptedMessages) {
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
        }), decryptedMessages).filter(msg => !existingMessageIds.has(msg.id));

        if (!messagesByIdCache.has(chatId)) {
          messagesByIdCache.set(chatId, new Map());
        }

        const chatMessageMap = messagesByIdCache.get(chatId)!;
        decryptedMessages.forEach(msg => chatMessageMap.set(msg.id, msg));

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
    console.log('🔍 appendMessage called with:', {
      messageId: message.id,
      hasText: !!message.text,
      textLength: message.text?.length || 0,
      isEncrypted: message.is_encrypted,
      hasEncryptedText: !!message.encrypted_text,
      text: message.text?.substring(0, 20) + '...'
    });

    set((state: ChatState) => {
      const currentMessages = state.messages[chatId] || [];
      const existingMessageIndex = currentMessages.findIndex(msg => msg.id === message.id);

      // NEW: Set message as unread by default (unless it's from current user)
      const currentUser = getUserFromStore();
      const isFromCurrentUser = message.sender === currentUser?.id;
      
      if (existingMessageIndex !== -1) {
        console.log('🔄 Updating existing message:', message.id);
        const existingMessage = currentMessages[existingMessageIndex];
        
        const updatedMessage = {
          ...existingMessage,
          ...message,
          text: (message.text && message.text.trim()) ? message.text : 
                (existingMessage.text && existingMessage.text.trim()) ? existingMessage.text :
                message.text,
          reactions: message.reactions || existingMessage.reactions || [],
          files: message.files || existingMessage.files,
          // NEW: Preserve existing read status or set based on sender
          isRead: existingMessage.isRead !== undefined ? existingMessage.isRead : isFromCurrentUser,
          readAt: existingMessage.readAt
        };

        const updatedMessages = [...currentMessages];
        updatedMessages[existingMessageIndex] = updatedMessage;

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

      // New message handling
      console.log('✨ Adding new message:', message.id);
      let messageWithReactions = {
        ...message,
        reactions: message.reactions || [],
        // NEW: Set read status based on sender
        isRead: isFromCurrentUser, // Messages from current user are always read
        readAt: isFromCurrentUser ? new Date().toISOString() : undefined
      };

      // Handle encrypted messages immediately
      if (message.is_encrypted && message.encrypted_text) {
        const { isUnlocked, decryptMessage } = useCryptoStore.getState();
        
        if (isUnlocked) {
          if (!message.text || message.text.trim() === '') {
            console.log('🔐 Setting decrypting placeholder for:', message.id);
            messageWithReactions.text = '🔐 [Decrypting...]';
            
            decryptMessage(message.encrypted_text, chatId).then(decryptedText => {
              console.log('🔓 Decryption result for', message.id, ':', !!decryptedText);
              if (decryptedText) {
                set((state: ChatState) => ({
                  messages: {
                    ...state.messages,
                    [chatId]: (state.messages[chatId] || []).map(msg =>
                      msg.id === message.id ? { ...msg, text: decryptedText } : msg
                    )
                  }
                }));
              }
            }).catch(error => {
              console.error('❌ Decryption failed for', message.id, ':', error);
              set((state: ChatState) => ({
                messages: {
                  ...state.messages,
                  [chatId]: (state.messages[chatId] || []).map(msg =>
                    msg.id === message.id ? { ...msg, text: '🔒 [Decryption failed]' } : msg
                  )
                }
              }));
            });
          } else {
            console.log('✅ Message already has text:', message.id);
          }
        } else {
          console.log('🔒 Crypto locked for:', message.id);
          messageWithReactions.text = '🔒 [Encryption locked]';
        }
      }

      // Insert message in correct position
      const newMessageTime = new Date(messageWithReactions.created_at).getTime();
      const insertIndex = currentMessages.findIndex(msg => {
        const msgTime = new Date(msg.created_at).getTime();
        return newMessageTime < msgTime;
      });

      let updatedMessages;
      if (insertIndex === -1) {
        updatedMessages = [...currentMessages, messageWithReactions];
      } else {
        updatedMessages = [
          ...currentMessages.slice(0, insertIndex),
          messageWithReactions,
          ...currentMessages.slice(insertIndex)
        ];
      }

      return {
        messages: {
          ...state.messages,
          [chatId]: updatedMessages.slice(-MESSAGE_FETCH_LIMIT)
        }
      };
    });

    // Database save - but ONLY save after we have proper text
    (async () => {
      try {
        let textToSave: string | null = message.text;
        
        // For encrypted messages, if we don't have decrypted text, try to decrypt but don't overwrite existing data
        if (message.is_encrypted && message.encrypted_text && (!textToSave || textToSave.trim() === '')) {
          const { isUnlocked, decryptMessage } = useCryptoStore.getState();
          if (isUnlocked) {
            try {
              const decrypted = await decryptMessage(message.encrypted_text, chatId);
              textToSave = decrypted || null;
            } catch (error) {
              console.error('Failed to decrypt for database save:', error);
              // CRITICAL FIX: Don't save null/empty text if decryption fails
              // This prevents overwriting existing decrypted text in the database
              return; // Exit early, don't save to database
            }
          } else {
            // CRITICAL FIX: Don't save when crypto is locked to avoid overwriting existing data
            return; // Exit early, don't save to database
          }
        }

        // Only save to database if we have meaningful text or it's not encrypted
        // CRITICAL FIX: Also check if message already exists to avoid overwriting good data
        if (textToSave || !message.is_encrypted) {
          const checkQuery = `
            select count(*) as count from messages
            where id = @messageId and chat_id = @chatId
          `;

          const result = await window.electron.db.query({
            query: checkQuery,
            params: { messageId: message.id, chatId }
          });

          const messageExists = result && result[0] && result[0].count > 0;

          // CRITICAL FIX: If message exists and is encrypted, check if it already has text
          if (messageExists && message.is_encrypted) {
            const existingMessage = await window.electron.db.query({
              query: 'SELECT text FROM messages WHERE id = ? AND chat_id = ?',
              params: [message.id, chatId]
            });
            
            if (existingMessage && existingMessage[0] && existingMessage[0].text && existingMessage[0].text.trim()) {
              console.log('🔒 Message already has decrypted text in database, skipping save to prevent overwrite');
              return; // Don't overwrite existing decrypted text
            }
          }

          if (!messageExists) {
            const dbParams: any = {
              id: message.id,
              chat_id: chatId,
              sender: message.sender,
              text: textToSave || '', // This converts null to empty string for the database
              created_at: message.created_at,
              reply_to: message.reply_to || null,
              file_ids: message.file_ids || null,
              sent_at: message.sent_at || message.created_at,
              status: message.status || 'sent',
              reactions: message.reactions ? JSON.stringify(message.reactions) : null,
              mentions: message.mentions ? JSON.stringify(message.mentions) : null,
              poll: message.poll || null,
              contact: message.contact || null,
              gif: message.gif || null,
              is_encrypted: message.is_encrypted ? 1 : 0,
              encrypted_text: message.encrypted_text ? JSON.stringify(message.encrypted_text) : null,
              encryption_iv: message.encrypted_text?.iv || null,
              encryption_key_version: message.encrypted_text?.keyVersion || null,
              encryption_algorithm: message.encrypted_text?.algorithm || null
            };

            await window.electron.db.query({
              query: `
                insert into messages
                (id, chat_id, sender, text, created_at, reply_to, file_ids, sent_at, status, 
                 reactions, mentions, poll, contact, gif, is_encrypted, encrypted_text, 
                 encryption_iv, encryption_key_version, encryption_algorithm)
                values
                (@id, @chat_id, @sender, @text, @created_at, @reply_to, @file_ids, @sent_at, @status, 
                 @reactions, @mentions, @poll, @contact, @gif, @is_encrypted, @encrypted_text,
                 @encryption_iv, @encryption_key_version, @encryption_algorithm)
              `,
              params: dbParams
            });
          }
        }
      } catch (error) {
        console.error('Error saving message to database:', error);
      }
    })();

    // Rest of existing code for files and sender objects...
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

  // Add new method to mark chat as read and clear notifications
  markChatAsRead: async (chatId: string, workspaceId?: string) => {
    try {
      const currentUser = getUserFromStore();
      if (!currentUser?.id) return;

      // Update database - mark all unread messages in this chat as read
      await window.electron.db.query({
        query: `
          UPDATE messages 
          SET isRead = TRUE 
          WHERE chat_id = @chatId 
          AND sender != @currentUserId 
          AND isRead = FALSE
        `,
        params: { chatId, currentUserId: currentUser.id }
      });

      // Update local state
      set(state => {
        const chatMessages = state.messages[chatId] || [];
        const updatedMessages = chatMessages.map(msg => 
          msg.sender !== currentUser.id ? { ...msg, isRead: true } : msg
        );

        return {
          messages: {
            ...state.messages,
            [chatId]: updatedMessages
          }
        };
      });

      // Clear notifications for this chat
      const { clearNotificationsForContext } = await import('@/utils/notifications');
      if (workspaceId) {
        clearNotificationsForContext(workspaceId, 'chatroom', chatId);
      } else {
        clearNotificationsForContext(undefined, 'agents', chatId);
      }

      console.log(`📖 Marked chat ${chatId} as read`);
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  },

  // NEW: Enhanced methods for read tracking
  markMessagesAsRead: async (chatId: string, messageIds?: string[]) => {
    try {
      const currentUser = getUserFromStore();
      if (!currentUser?.id) return;

      const readAt = new Date().toISOString();
      
      set((state: ChatState) => {
        const messages = state.messages[chatId] || [];
        let lastReadMessageId = state.lastReadMessageIds[chatId];

        const updatedMessages = messages.map(msg => {
          // If specific messageIds provided, only mark those
          // Otherwise mark all unread messages from others as read
          const shouldMarkAsRead = messageIds 
            ? messageIds.includes(msg.id)
            : (msg.sender !== currentUser.id && !msg.isRead);

          if (shouldMarkAsRead) {
            lastReadMessageId = msg.id; // Update last read message
            return {
              ...msg,
              isRead: true,
              readAt
            };
          }
          return msg;
        });

        return {
          ...state,
          messages: {
            ...state.messages,
            [chatId]: updatedMessages
          },
          lastReadMessageIds: {
            ...state.lastReadMessageIds,
            [chatId]: lastReadMessageId || state.lastReadMessageIds[chatId]
          }
        };
      });

      // Clear notifications for this chat
      const workspace = getCurrentWorkspace();
      if (workspace?.id) {
        clearNotificationsForContext(workspace.id, 'chatroom', chatId);
      } else {
        clearNotificationsForContext(undefined, 'agents', chatId);
      }

      console.log(`✅ Marked messages as read in chat ${chatId}`);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },

  getUnreadMessages: (chatId: string): IChatMessage[] => {
    const { messages } = get();
    const chatMessages = messages[chatId] || [];
    const currentUser = getUserFromStore();
    
    return chatMessages.filter(msg => 
      msg.sender !== currentUser?.id && !msg.isRead
    );
  },

  getUnreadCount: (chatId: string): number => {
    const unreadMessages = get().getUnreadMessages(chatId);
    return unreadMessages.length;
  },

  hasUnreadMessages: (chatId: string): boolean => {
    const unreadMessages = get().getUnreadMessages(chatId);
    return unreadMessages.length > 0;
  },

  markMessageAsRead: async (chatId: string, messageId: string) => {
    try {
      const currentUser = getUserFromStore();
      if (!currentUser?.id) return;

      // Update database
      await window.electron.db.query({
        query: `UPDATE messages SET isRead = TRUE WHERE id = @messageId AND sender != @currentUserId`,
        params: { messageId, currentUserId: currentUser.id }
      });

      // Update local state
      set(state => {
        const chatMessages = state.messages[chatId] || [];
        const updatedMessages = chatMessages.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        );

        return {
          messages: {
            ...state.messages,
            [chatId]: updatedMessages
          }
        };
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  },

  getUnreadMessageCount: (chatId: string) => {
    const state = get();
    const chatMessages = state.messages[chatId] || [];
    const currentUser = getUserFromStore();
    
    return chatMessages.filter(msg => 
      msg.sender !== currentUser?.id && !msg.isRead
    ).length;
  },

  hasUnreadMessages: (chatId: string) => {
    const messageActions = createMessageActions(set, get);
    return messageActions.getUnreadMessageCount(chatId) > 0;
  },
}); 
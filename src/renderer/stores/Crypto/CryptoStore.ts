import { create } from "zustand";
import { IUserCryptoKeys } from "@/../../types/Chat/Message";
import { toast } from "@/utils/toast";
import { useWorkspaceStore } from '../Workspace/WorkspaceStore';
import { useTopicStore } from '../Topic/TopicStore';
import { DBTABLES } from '@/../../constants/db';
import { getUserTokenFromStore } from "@/utils/user";

interface CryptoStore {
  // State
  userCryptoKeys: IUserCryptoKeys | null;
  masterKey: string | null;
  isUnlocked: boolean;
  chatKeys: Record<string, string>; // chatId -> decrypted key
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;

  // Actions
  unlockForUser: (userId: string, token: string) => Promise<boolean>;
  lockCrypto: () => void;
  getChatKey: (chatId: string, workspaceId?: string) => Promise<string | null>;
  createChatKey: (chatId: string, userIds: string[]) => Promise<boolean>;
  grantWorkspaceChatKeysToUser: (workspaceId: string, userId: string) => Promise<boolean>;
  encryptMessage: (message: string, chatId: string) => Promise<any>;
  decryptMessage: (encryptedMessage: any, chatId: string) => Promise<string | null>;
  debugEncryptedMessage: (encryptedMessage: any, chatId: string) => Promise<void>;
}

// ✅ NEW: Standardized key derivation using HKDF
const deriveStandardChatKey = async (chatId: string, workspaceId: string): Promise<string> => {
  // This will call the main process to use the standardized HKDF derivation
  const response = await window.electron.crypto.deriveChatKey(chatId, workspaceId);
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
};

// ✅ LEGACY: Keep for backward compatibility
const deriveCryptoPasswordFromToken = async (userId: string, token: string): Promise<string> => {
  const combined = `${userId}:${token}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
};

export const useCryptoStore = create<CryptoStore>((set, get) => ({
  // State
  userCryptoKeys: null,
  masterKey: null,
  isUnlocked: false,
  chatKeys: {},
  isLoading: false,
  error: null,
  currentUserId: null,

  // Unlock encryption for a user (called automatically on login)
  unlockForUser: async (userId: string, token: string) => {
    console.log('[CryptoStore] 🔐 Starting unlock for user:', userId);
    
    // ✅ FIX: Check if already unlocked for the same user to avoid unnecessary re-unlocking
    const { isUnlocked, currentUserId } = get();
    if (isUnlocked && currentUserId === userId) {
      console.log('[CryptoStore] ✅ Crypto already unlocked for this user, skipping');
      return true;
    }

    set({ isLoading: true, error: null });

    try {
      // Derive password from user ID + token
      const cryptoPassword = await deriveCryptoPasswordFromToken(userId, token);
      console.log('[CryptoStore] 🔑 Crypto password derived, length:', cryptoPassword.length);
      
      // Check if user already has crypto keys
      const keysResponse = await window.electron.crypto.getUserKeys(userId);
      console.log('[CryptoStore] 🔍 Keys response:', keysResponse);
      
      if (keysResponse.success && keysResponse.data) {
        // User has existing crypto keys, unlock them
        console.log('[CryptoStore] 🔓 User has existing crypto keys, unlocking...');
        const masterKeyResponse = await window.electron.crypto.deriveMasterKey(cryptoPassword, keysResponse.data.masterKeySalt);
        console.log('[CryptoStore] 🔑 Master key derivation result:', masterKeyResponse.success);
        if (masterKeyResponse.success) {
          // ✅ FIX: Preserve existing chatKeys cache instead of clearing it
          const { chatKeys: existingChatKeys } = get();
          set({
            userCryptoKeys: { ...keysResponse.data, masterKey: masterKeyResponse.data },
            masterKey: masterKeyResponse.data,
            isUnlocked: true,
            currentUserId: userId,
            isLoading: false,
            chatKeys: existingChatKeys // ✅ Keep existing chat keys instead of clearing
          });
          console.log('[CryptoStore] ✅ Crypto unlocked successfully! Preserved', Object.keys(existingChatKeys).length, 'cached chat keys');
          return true;
        }
      } else {
        // User doesn't have crypto keys, create new ones
        console.log('[CryptoStore] 🆕 Creating new crypto keys for user...');
        const response = await window.electron.crypto.initializeUser(userId, cryptoPassword);
        console.log('[CryptoStore] 🆕 Initialize user result:', response.success);
        if (response.success) {
          set({
            userCryptoKeys: response.data,
            masterKey: response.data.masterKey || null,
            isUnlocked: true,
            currentUserId: userId,
            isLoading: false
            // ✅ Don't set chatKeys here - let it keep the default empty object for new users
          });
          console.log('[CryptoStore] ✅ Crypto initialized and unlocked successfully!');
          return true;
        }
      }
      
      throw new Error('Failed to unlock encryption');
    } catch (error: any) {
      console.error('[CryptoStore] ❌ Failed to unlock crypto:', error);
      set({ 
        error: error.message || 'Failed to unlock encryption',
        isLoading: false 
      });
      return false;
    }
  },

  lockCrypto: () => {
    console.log('[CryptoStore] 🔒 Locking crypto and clearing all cached keys');
    set({
      userCryptoKeys: null,
      masterKey: null,
      isUnlocked: false,
      chatKeys: {},
      currentUserId: null,
      isLoading: false,
      error: null
    });
  },

  getChatKey: async (chatId: string, workspaceId?: string) => {
    const { chatKeys, isUnlocked, currentUserId } = get();

    if (!currentUserId || !isUnlocked) {
      console.log('[CryptoStore] ❌ Cannot get chat key: crypto not unlocked or no user');
      return null;
    }

    // Return cached key if available
    if (chatKeys[chatId]) {
      console.log('[CryptoStore] ✅ Using cached chat key for:', chatId);
      return chatKeys[chatId];
    }

    console.log('[CryptoStore] 🔍 Chat key not cached, deriving standard key for:', chatId);

    try {
      // ✅ NEW: Get workspace ID from context if not provided
      const effectiveWorkspaceId = workspaceId || useTopicStore.getState().selectedContext?.id;
      
      if (!effectiveWorkspaceId) {
        console.error('No workspace ID available for key derivation');
        return null;
      }

      // ✅ NEW: Use standardized key derivation
      let chatKey: string;
      
      try {
        chatKey = await deriveStandardChatKey(chatId, effectiveWorkspaceId);
        console.log('✅ Successfully derived standard chat key');
      } catch (error) {
        console.warn('⚠️ Standard key derivation failed, trying legacy method:', error);
        
        // Fallback to legacy method
        chatKey = await deriveCryptoPasswordFromToken(chatId, "workspace-key");
        console.log('✅ Using legacy key derivation');
      }

      if (chatKey) {
        console.log('[CryptoStore] ✅ Successfully derived and caching chat key for:', chatId);
        set(state => ({
          chatKeys: {
            ...state.chatKeys,
            [chatId]: chatKey
          }
        }));
      }

      return chatKey;
    } catch (error: any) {
      console.error('Failed to get chat key:', error);
      return null;
    }
  },

  createChatKey: async (chatId: string, userIds: string[]) => {
    const { masterKey, isUnlocked, currentUserId } = get();

    if (!currentUserId || !masterKey || !isUnlocked) {
      set({ error: 'Encryption not available' });
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      // ✅ FIX: Use base64 key format
      const sharedWorkspaceKey = await deriveCryptoPasswordFromToken(chatId, "workspace-key");
      
      // Create same key for all users
      const userMasterKeys: Record<string, string> = {};
      userIds.forEach(userId => {
        userMasterKeys[userId] = sharedWorkspaceKey;
      });

      console.log('🔑 Creating chat key with base64 format:', {
        chatId,
        userCount: userIds.length,
        keyLength: sharedWorkspaceKey.length
      });

      const response = await window.electron.crypto.createChatKey(
        chatId,
        currentUserId,
        userIds,
        userMasterKeys
      );

      if (!response.success) {
        throw new Error(response.error);
      }

      // ✅ FIX: Clear the cache for this chat so it gets re-fetched with the new key
      set(state => {
        const newChatKeys = { ...state.chatKeys };
        delete newChatKeys[chatId];
        return {
          chatKeys: newChatKeys,
          isLoading: false
        };
      });
      
      console.log('[CryptoStore] ✅ Chat key created successfully, cleared cache for refetch');
      return true;
    } catch (error: any) {
      console.error('Failed to create chat key:', error);
      set({ 
        error: error.message || 'Failed to create chat key',
        isLoading: false 
      });
      return false;
    }
  },

  encryptMessage: async (message: string, chatId: string) => {
    const { isUnlocked, currentUserId } = get();
    
    if (!isUnlocked || !currentUserId) {
      throw new Error('Encryption not available');
    }
    
    let chatKey = await get().getChatKey(chatId);
    
    // If no chat key exists, create one for ALL workspace users
    if (!chatKey) {
      // ✅ FIX: Get workspace ID from current context, not chatId
      const { selectedContext } = useTopicStore.getState();
      const workspaceId = selectedContext?.id;
      
      if (!workspaceId) {
        console.error('No workspace context available for encryption');
        throw new Error('No workspace context available');
      }
      
      // Get all users in the workspace
      const workspaceUsers = await useWorkspaceStore.getState().getUsersByWorkspace(workspaceId);
      const allUserIds = workspaceUsers.map(user => user.user_id);
      
      console.log(`🔑 Creating chat key for ${allUserIds.length} users:`, allUserIds);
      
      if (allUserIds.length === 0) {
        console.error('No users found in workspace for encryption');
        throw new Error('No users found in workspace');
      }
      
      const success = await get().createChatKey(chatId, allUserIds);
      if (!success) {
        throw new Error('Failed to create chat key');
      }
      
      chatKey = await get().getChatKey(chatId);
      if (!chatKey) {
        throw new Error('Failed to retrieve newly created chat key');
      }
    }

    try {
      const response = await window.electron.crypto.encryptMessage(message, chatKey);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      const encrypted = response.data;
      encrypted.keyVersion = 1;
      return encrypted;
    } catch (error: any) {
      console.error('Failed to encrypt message:', error);
      throw error;
    }
  },

  decryptMessage: async (encryptedMessage: any, chatId: string) => {
    const { isUnlocked } = get();
    
    if (!isUnlocked) {
      console.error('Encryption not available');
      return null;
    }
    
    const chatKey = await get().getChatKey(chatId);
    if (!chatKey) {
      console.error('No chat key available for decryption');
      return null;
    }

    try {
      // ✅ FIX: Add validation and better error handling
      if (!encryptedMessage || !encryptedMessage.encryptedContent || !encryptedMessage.iv) {
        console.error('Invalid encrypted message format:', encryptedMessage);
        return null;
      }

      // ✅ FIX: Log the encrypted message structure for debugging
      console.log('🔍 Decrypting message:', {
        chatId,
        keyLength: chatKey.length,
        hasIv: !!encryptedMessage.iv,
        hasContent: !!encryptedMessage.encryptedContent,
        keyVersion: encryptedMessage.keyVersion,
        algorithm: encryptedMessage.algorithm
      });

      const response = await window.electron.crypto.decryptMessage(encryptedMessage, chatKey);
      
      if (!response.success) {
        // ✅ FIX: Try with different key derivation methods for backward compatibility
        console.warn('❌ Decryption failed with current key, trying fallback methods...');
        
        // Try with old key format if available
        try {
          const fallbackKey = await deriveCryptoPasswordFromToken(chatId, "workspace-key-old");
          const fallbackResponse = await window.electron.crypto.decryptMessage(encryptedMessage, fallbackKey);
          
          if (fallbackResponse.success) {
            console.log('✅ Decryption successful with fallback key');
            return fallbackResponse.data;
          }
        } catch (fallbackError) {
          console.error('❌ Fallback decryption also failed:', fallbackError);
        }
        
        console.error('Failed to decrypt message:', response.error);
        return null;
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to decrypt message:', error);
      
      // ✅ FIX: Clear the cached key if decryption fails, it might be wrong
      set(state => {
        const newChatKeys = { ...state.chatKeys };
        delete newChatKeys[chatId];
        return { chatKeys: newChatKeys };
      });
      
      return null;
    }
  },

  // NEW: Grant access to existing workspace chat keys for a new user
  grantWorkspaceChatKeysToUser: async (workspaceId: string, userId: string) => {
    const { isUnlocked, currentUserId } = get();
    
    if (!isUnlocked || !currentUserId) {
      console.error('Encryption not available for granting chat keys');
      return false;
    }

    try {
      console.log(`🔑 Granting workspace chat keys to user ${userId} in workspace ${workspaceId}`);
      
      // ✅ FIX: Get chats from remote API instead of local database
      let chatIds: string[] = [];
      
      try {
        // Get chats from remote API
        const response = await window.electron.chat.get({
          token: getUserTokenFromStore() || '',
          userId: currentUserId,
          type: 'workspace',
          workspaceId: workspaceId
        });
        
        console.log('🔍 Remote chat API response:', response);
        
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          chatIds = response.data.data.map((chat: any) => chat.id);
          console.log(`Found ${chatIds.length} chats in workspace from API:`, chatIds);
        } else {
          console.log('No chats found in workspace from API');
        }
      } catch (apiError) {
        console.error('Failed to fetch chats from API:', apiError);
        
        // Fallback: try local database
        console.log('🔄 Falling back to local database...');
        const chats = await window.electron.db.query({
          query: `SELECT id FROM ${DBTABLES.CHATROOM} WHERE workspace_id = @workspaceId`,
          params: { workspaceId }
        });
        
        if (Array.isArray(chats) && chats.length > 0) {
          chatIds = chats.map(chat => chat.id);
          console.log(`Found ${chatIds.length} chats in workspace from local DB:`, chatIds);
        }
      }

      if (chatIds.length === 0) {
        console.log('❌ No chats found to grant access to');
        return false;
      }

      // Continue with the rest of the function...
      let successCount = 0;
      for (const chatId of chatIds) {
        try {
          // Check if chat key exists
          const existingKey = await window.electron.db.query({
            query: 'SELECT id FROM chat_keys WHERE chat_id = ? AND key_version = ?',
            params: [chatId, 1]
          });

          if (!Array.isArray(existingKey) || existingKey.length === 0) {
            console.log(`No chat key found for chat ${chatId}, skipping`);
            continue;
          }

          // Check if user already has access
          const existingUserKey = await window.electron.db.query({
            query: 'SELECT id FROM user_chat_keys WHERE user_id = ? AND chat_id = ? AND key_version = ?',
            params: [userId, chatId, 1]
          });

          if (Array.isArray(existingUserKey) && existingUserKey.length > 0) {
            console.log(`User ${userId} already has access to chat ${chatId}`);
            continue;
          }

          // Grant access by creating chat key for this user
          const sharedWorkspaceKey = await deriveCryptoPasswordFromToken(chatId, "workspace-key");
          const userMasterKeys: Record<string, string> = {
            [userId]: sharedWorkspaceKey
          };

          const response = await window.electron.crypto.createChatKey(
            chatId,
            currentUserId,
            [userId],
            userMasterKeys
          );

          if (response.success) {
            console.log(`✅ Granted chat key access for chat ${chatId} to user ${userId}`);
            successCount++;
          } else {
            console.error(`❌ Failed to grant chat key access for chat ${chatId}:`, response.error);
          }
        } catch (error) {
          console.error(`Error granting access to chat ${chatId}:`, error);
        }
      }

      console.log(`✅ Completed granting workspace chat keys to user ${userId}. Success: ${successCount}/${chatIds.length}`);
      return successCount > 0;
    } catch (error: any) {
      console.error('Failed to grant workspace chat keys:', error);
      return false;
    }
  },

  // Add this helper method to debug encrypted messages
  debugEncryptedMessage: async (encryptedMessage: any, chatId: string) => {
    console.log('🔍 Debug encrypted message:', {
      chatId,
      messageStructure: {
        hasEncryptedContent: !!encryptedMessage?.encryptedContent,
        hasIv: !!encryptedMessage?.iv,
        hasKeyVersion: !!encryptedMessage?.keyVersion,
        algorithm: encryptedMessage?.algorithm,
        keyVersion: encryptedMessage?.keyVersion
      },
      contentLength: encryptedMessage?.encryptedContent?.length,
      ivLength: encryptedMessage?.iv?.length
    });
    
    const chatKey = await get().getChatKey(chatId);
    if (chatKey) {
      console.log('🔑 Chat key info:', {
        keyLength: chatKey.length,
        keyFormat: 'base64'
      });
    }
  },
})); 
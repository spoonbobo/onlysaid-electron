import { create } from "zustand";
import { IUserCryptoKeys } from "@/../../types/Chat/Message";
import { toast } from "@/utils/toast";
import { useWorkspaceStore } from '../Workspace/WorkspaceStore';

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
  getChatKey: (chatId: string) => Promise<string | null>;
  createChatKey: (chatId: string, userIds: string[]) => Promise<boolean>;
  encryptMessage: (message: string, chatId: string) => Promise<any>;
  decryptMessage: (encryptedMessage: any, chatId: string) => Promise<string | null>;
}

// Helper function to derive crypto password from user token
const deriveCryptoPasswordFromToken = async (userId: string, token: string): Promise<string> => {
  const combined = `${userId}:${token}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32);
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
          set({
            userCryptoKeys: { ...keysResponse.data, masterKey: masterKeyResponse.data },
            masterKey: masterKeyResponse.data,
            isUnlocked: true,
            currentUserId: userId,
            isLoading: false,
            chatKeys: {}
          });
          console.log('[CryptoStore] ✅ Crypto unlocked successfully!');
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

  getChatKey: async (chatId: string) => {
    const { masterKey, chatKeys, isUnlocked, currentUserId } = get();

    if (!currentUserId || !masterKey || !isUnlocked) {
      return null;
    }

    // Return cached key if available
    if (chatKeys[chatId]) {
      return chatKeys[chatId];
    }

    try {
      const response = await window.electron.crypto.getChatKey(currentUserId, chatId, masterKey);
      
      if (!response.success) {
        console.error('Failed to get chat key:', response.error);
        return null;
      }

      const chatKey = response.data;
      if (chatKey) {
        // Cache the decrypted key
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
      // Create master keys for ALL users using a shared workspace secret
      const userMasterKeys: Record<string, string> = {};
      
      for (const userId of userIds) {
        // Use workspace ID + user ID to derive a consistent key
        const workspaceSecret = await deriveCryptoPasswordFromToken(chatId, userId);
        userMasterKeys[userId] = workspaceSecret;
      }

      const response = await window.electron.crypto.createChatKey(
        chatId,
        currentUserId,
        userIds, // ✅ All users
        userMasterKeys // ✅ Keys for all users
      );

      if (!response.success) {
        throw new Error(response.error);
      }

      set({ isLoading: false });
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
      // Get all users in the workspace/chat
      const workspaceUsers = await useWorkspaceStore.getState().getUsersByWorkspace(chatId);
      const allUserIds = workspaceUsers.map(user => user.user_id);
      
      console.log(`🔑 Creating chat key for ${allUserIds.length} users:`, allUserIds);
      
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
      const response = await window.electron.crypto.decryptMessage(encryptedMessage, chatKey);
      
      if (!response.success) {
        console.error('Failed to decrypt message:', response.error);
        return null;
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to decrypt message:', error);
      return null;
    }
  },
})); 
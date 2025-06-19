import { ipcMain } from 'electron';
import { cryptoService } from './cryptoService';

export function setupCryptoHandlers() {
  console.log('[Main] Setting up crypto handlers...');

  // Initialize user crypto
  ipcMain.handle('crypto:initialize-user', async (event, userId: string, password: string) => {
    try {
      const result = await cryptoService.initializeUserCrypto(userId, password);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Derive master key
  ipcMain.handle('crypto:derive-master-key', async (event, password: string, salt: string) => {
    try {
      const masterKey = await cryptoService.deriveMasterKey(password, salt);
      return { success: true, data: masterKey };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get user crypto keys
  ipcMain.handle('crypto:get-user-keys', async (event, userId: string) => {
    try {
      const result = await cryptoService.getUserCryptoKeys(userId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Create chat key
  ipcMain.handle('crypto:create-chat-key', async (event, chatId: string, createdBy: string, userIds: string[], userMasterKeys: Record<string, string>) => {
    try {
      await cryptoService.createChatKey(chatId, createdBy, userIds, userMasterKeys);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get chat key for user
  ipcMain.handle('crypto:get-chat-key', async (event, userId: string, chatId: string, masterKey: string) => {
    try {
      const result = await cryptoService.getChatKeyForUser(userId, chatId, masterKey);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Encrypt message
  ipcMain.handle('crypto:encrypt-message', async (event, message: string, chatKey: string) => {
    try {
      const result = await cryptoService.encryptMessage(message, chatKey);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Decrypt message
  ipcMain.handle('crypto:decrypt-message', async (event, encryptedMessage: any, chatKey: string) => {
    try {
      const result = await cryptoService.decryptMessage(encryptedMessage, chatKey);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ✅ NEW: Standardized chat key derivation
  ipcMain.handle('crypto:derive-chat-key', async (event, chatId: string, workspaceId: string) => {
    try {
      const result = await cryptoService.deriveChatKey(chatId, workspaceId);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ✅ NEW: Standardized workspace key derivation
  ipcMain.handle('crypto:derive-workspace-key', async (event, workspaceId: string, context: string = 'chat-encryption') => {
    try {
      const result = await cryptoService.deriveWorkspaceKey(workspaceId, context);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  console.log('[Main] Crypto handlers set up successfully');
} 
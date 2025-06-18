import crypto from 'crypto';
import { ICryptoService, IEncryptedMessage, IWorkspaceKey, IUserCryptoKeys } from '@/../../types/Chat/Message';
import { executeQuery } from '../../service/db';

export class CryptoService implements ICryptoService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16;  // 128 bits
  private readonly SALT_LENGTH = 32; // 256 bits
  private readonly ITERATIONS = 100000; // PBKDF2 iterations

  /**
   * Generate a cryptographically secure salt for key derivation
   */
  generateKeySalt(): string {
    return crypto.randomBytes(this.SALT_LENGTH).toString('base64');
  }

  /**
   * Derive master key from user password and salt using PBKDF2
   */
  async deriveMasterKey(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, this.ITERATIONS, this.KEY_LENGTH, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey.toString('base64'));
      });
    });
  }

  /**
   * Generate a new workspace encryption key
   */
  async generateWorkspaceKey(): Promise<IWorkspaceKey> {
    const keyData = crypto.randomBytes(this.KEY_LENGTH).toString('base64');
    
    return {
      workspaceId: '', // Will be set by caller
      keyData,
      keyVersion: 1,
      createdAt: new Date().toISOString(),
      createdBy: '' // Will be set by caller
    };
  }

  /**
   * Encrypt workspace key with user's master key
   */
  async encryptWorkspaceKey(workspaceKey: string, masterKey: string): Promise<string> {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const masterKeyBuffer = Buffer.from(masterKey, 'base64');
    const cipher = crypto.createCipheriv(this.ALGORITHM, masterKeyBuffer, iv);
    cipher.setAAD(Buffer.from('workspace-key'));

    let encrypted = cipher.update(workspaceKey, 'base64', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]);
    return combined.toString('base64');
  }

  /**
   * Decrypt workspace key with user's master key
   */
  async decryptWorkspaceKey(encryptedKey: string, masterKey: string): Promise<string> {
    const combined = Buffer.from(encryptedKey, 'base64');
    const iv = combined.subarray(0, this.IV_LENGTH);
    const authTag = combined.subarray(this.IV_LENGTH, this.IV_LENGTH + 16);
    const encrypted = combined.subarray(this.IV_LENGTH + 16);

    const masterKeyBuffer = Buffer.from(masterKey, 'base64');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, masterKeyBuffer, iv);
    decipher.setAAD(Buffer.from('workspace-key'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'base64');
    decrypted += decipher.final('base64');
    
    return decrypted;
  }

  /**
   * Encrypt a message with workspace key
   */
  async encryptMessage(message: string, workspaceKey: string): Promise<IEncryptedMessage> {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const keyBuffer = Buffer.from(workspaceKey, 'base64');
    const cipher = crypto.createCipheriv(this.ALGORITHM, keyBuffer, iv);
    
    let encrypted = cipher.update(message, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine authTag + encrypted data
    const combined = Buffer.concat([authTag, Buffer.from(encrypted, 'base64')]);
    
    return {
      encryptedContent: combined.toString('base64'),
      iv: iv.toString('base64'),
      keyVersion: 1, // Will be set by caller
      algorithm: 'AES-GCM-256'
    };
  }

  /**
   * Decrypt a message with workspace key
   */
  async decryptMessage(encryptedMessage: IEncryptedMessage, workspaceKey: string): Promise<string> {
    const combined = Buffer.from(encryptedMessage.encryptedContent, 'base64');
    const authTag = combined.subarray(0, 16);
    const encrypted = combined.subarray(16);
    const iv = Buffer.from(encryptedMessage.iv, 'base64');

    const keyBuffer = Buffer.from(workspaceKey, 'base64');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Initialize user crypto keys (generate salt and store)
   */
  async initializeUserCrypto(userId: string, password: string): Promise<IUserCryptoKeys> {
    const salt = this.generateKeySalt();
    const masterKey = await this.deriveMasterKey(password, salt);

    // Store salt in database
    await executeQuery(
      `INSERT OR REPLACE INTO user_crypto_keys (user_id, master_key_salt, updated_at) 
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [userId, salt]
    );

    return {
      userId,
      masterKeySalt: salt,
      masterKey // Runtime only
    };
  }

  /**
   * Get user crypto keys from database
   */
  async getUserCryptoKeys(userId: string): Promise<IUserCryptoKeys | null> {
    const result = await executeQuery(
      'SELECT user_id, master_key_salt FROM user_crypto_keys WHERE user_id = ?',
      [userId]
    );

    if (result.length === 0) return null;

    return {
      userId: result[0].user_id,
      masterKeySalt: result[0].master_key_salt
    };
  }

  /**
   * Create chat key and distribute to users
   */
  async createChatKey(chatId: string, createdBy: string, userIds: string[], userMasterKeys: Record<string, string>): Promise<void> {
    console.log(`🔑 [createChatKey] Creating key for chat ${chatId}, users: ${userIds.join(', ')}`);
    
    // Check if chat key already exists in chat_keys table
    const existingKey = await executeQuery(
      'SELECT id, key_data FROM chat_keys WHERE chat_id = ? AND key_version = ?',
      [chatId, 1]
    );

    let chatKeyData: string;

    if (existingKey.length > 0) {
      console.log(`🔑 [createChatKey] Chat key already exists for chat ${chatId}, using existing key`);
      chatKeyData = existingKey[0].key_data;
    } else {
      // Generate new chat key
      const chatKey = await this.generateWorkspaceKey();
      chatKey.workspaceId = chatId;
      chatKey.createdBy = createdBy;
      chatKeyData = chatKey.keyData;

      console.log(`🔑 [createChatKey] Generated new chat key:`, chatKeyData ? 'YES' : 'NO');

      // Store chat key in chat_keys table
      await executeQuery(
        `INSERT INTO chat_keys (id, chat_id, key_data, key_version, created_by) 
         VALUES (?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), chatId, chatKeyData, 1, createdBy]
      );

      console.log(`✅ [createChatKey] Stored new chat key in chat_keys table`);
    }

    // Encrypt and distribute to each user (even if key already existed)
    for (const userId of userIds) {
      const masterKey = userMasterKeys[userId];
      if (!masterKey) {
        console.log(`❌ [createChatKey] No master key for user ${userId}`);
        continue;
      }

      console.log(`🔑 [createChatKey] Processing user ${userId}`);

      // Check if user already has access to this key
      const existingUserKey = await executeQuery(
        'SELECT id FROM user_chat_keys WHERE user_id = ? AND chat_id = ? AND key_version = ?',
        [userId, chatId, 1]
      );

      if (existingUserKey.length > 0) {
        console.log(`✅ [createChatKey] User ${userId} already has access to chat ${chatId}, skipping`);
        continue;
      }

      console.log(`🔐 [createChatKey] Encrypting chat key for user ${userId}`);
      const encryptedChatKey = await this.encryptWorkspaceKey(chatKeyData, masterKey);
      console.log(`🔐 [createChatKey] Encrypted key length:`, encryptedChatKey.length);
      
      // ✅ FIX: Explicitly set has_access = 1 (SQLite boolean)
      await executeQuery(
        `INSERT INTO user_chat_keys (id, user_id, chat_id, encrypted_chat_key, key_version, granted_by, has_access)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), userId, chatId, encryptedChatKey, 1, createdBy, 1]
      );

      console.log(`✅ [createChatKey] Stored encrypted key for user ${userId}`);
      
      // ✅ ADD: Verify the record was inserted correctly
      const verifyInsert = await executeQuery(
        'SELECT id, has_access FROM user_chat_keys WHERE user_id = ? AND chat_id = ? AND key_version = ?',
        [userId, chatId, 1]
      );
      console.log(`🔍 [createChatKey] Verification query result:`, verifyInsert);
    }

    console.log(`✅ [createChatKey] Completed chat key creation for ${userIds.length} users`);
  }

  /**
   * Get decrypted chat key for user with backward compatibility
   */
  async getChatKeyForUser(userId: string, chatId: string, sharedWorkspaceKey: string): Promise<string | null> {
    console.log(`🔍 [getChatKeyForUser] Looking for key: userId=${userId}, chatId=${chatId}`);
    
    let result = await executeQuery(
      `SELECT encrypted_chat_key FROM user_chat_keys 
       WHERE user_id = ? AND chat_id = ? AND has_access = 1 
       ORDER BY key_version DESC LIMIT 1`,
      [userId, chatId]
    );

    if (result.length > 0) {
      try {
        console.log(`🔍 [getChatKeyForUser] Found encrypted key, attempting decryption...`);
        const decryptedKey = await this.decryptWorkspaceKey(result[0].encrypted_chat_key, sharedWorkspaceKey);
        console.log(`✅ [getChatKeyForUser] Successfully decrypted key:`, decryptedKey ? 'YES' : 'NO');
        return decryptedKey;
      } catch (error) {
        console.error('Failed to decrypt chat key:', error);
      }
    }

    result = await executeQuery(
      `SELECT encrypted_workspace_key FROM user_workspace_keys 
       WHERE user_id = ? AND workspace_id = ? AND has_access = 1 
       ORDER BY key_version DESC LIMIT 1`,
      [userId, chatId]
    );

    if (result.length > 0) {
      try {
        console.log(`🔍 [getChatKeyForUser] Found encrypted key, attempting decryption...`);
        const decrypted = await this.decryptWorkspaceKey(result[0].encrypted_workspace_key, sharedWorkspaceKey);
        await this.migrateChatKeyToNewFormat(userId, chatId, decrypted, sharedWorkspaceKey);
        console.log(`✅ [getChatKeyForUser] Successfully decrypted key:`, decrypted ? 'YES' : 'NO');
        return decrypted;
      } catch (error) {
        console.log('New format failed, trying old format...');
        
        try {
          console.log(`🔍 [getChatKeyForUser] Trying old format...`);
          const oldFormatKey = await this.deriveOldKeyFromChatId(chatId, "workspace-key");
          const decrypted = await this.decryptWorkspaceKey(result[0].encrypted_workspace_key, oldFormatKey);
          await this.migrateChatKeyToNewFormat(userId, chatId, decrypted, sharedWorkspaceKey);
          console.log(`✅ [getChatKeyForUser] Successfully decrypted key:`, decrypted ? 'YES' : 'NO');
          return decrypted;
        } catch (oldError) {
          console.error('Both key formats failed:', { newError: error, oldError });
        }
      }
    }

    console.log(`❌ [getChatKeyForUser] No chat key found for user ${userId} in chat ${chatId}`);
    return null;
  }

  /**
   * Derive key using new base64 format
   */
  private async deriveKeyFromChatId(chatId: string, secret: string): Promise<string> {
    const combined = `${chatId}:${secret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(String.fromCharCode(...hashArray));
  }

  /**
   * Derive key using old hex format (for backward compatibility)
   */
  private async deriveOldKeyFromChatId(chatId: string, secret: string): Promise<string> {
    const combined = `${chatId}:${secret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 32);
  }

  /**
   * Migrate old chat key to new format
   */
  private async migrateChatKeyToNewFormat(userId: string, chatId: string, decryptedKey: string, sharedWorkspaceKey: string): Promise<void> {
    try {
      // Check if already migrated
      const existing = await executeQuery(
        'SELECT id FROM user_chat_keys WHERE user_id = ? AND chat_id = ?',
        [userId, chatId]
      );

      if (existing.length > 0) {
        return; // Already migrated
      }

      // ✅ FIX: Use the provided sharedWorkspaceKey for encryption
      const encryptedWithNewFormat = await this.encryptWorkspaceKey(decryptedKey, sharedWorkspaceKey);

      // Store in new table with explicit has_access = 1
      await executeQuery(
        `INSERT INTO user_chat_keys (id, user_id, chat_id, encrypted_chat_key, key_version, granted_by, has_access)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), userId, chatId, encryptedWithNewFormat, 1, userId, 1]
      );

      console.log(`✅ Migrated chat key for user ${userId} in chat ${chatId} to new format`);
    } catch (error) {
      console.error('Failed to migrate chat key:', error);
    }
  }
}

// Singleton instance
export const cryptoService = new CryptoService(); 
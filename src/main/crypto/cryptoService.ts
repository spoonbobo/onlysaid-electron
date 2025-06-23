import crypto from 'crypto';
import { ICryptoService, IEncryptedMessage, IWorkspaceKey, IUserCryptoKeys } from '@/../../types/Chat/Message';
import { executeQuery } from '../../service/db';

export class CryptoService implements ICryptoService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16;  // 128 bits
  private readonly SALT_LENGTH = 32; // 256 bits
  private readonly ITERATIONS = 100000; // PBKDF2 iterations
  
  // ✅ NEW: Industry standard constants
  private readonly HKDF_HASH = 'sha256';
  private readonly HKDF_LENGTH = 32; // 256 bits for AES-256
  private readonly KEY_VERSION = 2; // Increment for new standard

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
    try {
      // ✅ FIX: Add validation
      if (!encryptedMessage.encryptedContent || !encryptedMessage.iv) {
        throw new Error('Invalid encrypted message format');
      }

      const combined = Buffer.from(encryptedMessage.encryptedContent, 'base64');
      
      // ✅ FIX: Verify minimum length
      if (combined.length < 16) {
        throw new Error('Encrypted content too short');
      }
      
      const authTag = combined.subarray(0, 16);
      const encrypted = combined.subarray(16);
      const iv = Buffer.from(encryptedMessage.iv, 'base64');

      // ✅ FIX: Validate IV length
      if (iv.length !== this.IV_LENGTH) {
        throw new Error(`Invalid IV length: expected ${this.IV_LENGTH}, got ${iv.length}`);
      }

      const keyBuffer = Buffer.from(workspaceKey, 'base64');
      
      // ✅ FIX: Validate key length
      if (keyBuffer.length !== this.KEY_LENGTH) {
        console.warn(`Warning: Key length ${keyBuffer.length}, expected ${this.KEY_LENGTH}`);
      }

      const decipher = crypto.createDecipheriv(this.ALGORITHM, keyBuffer, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error: any) {
      // ✅ FIX: More specific error messages
      console.error('Decryption error details:', {
        error: error.message,
        keyLength: Buffer.from(workspaceKey, 'base64').length,
        ivLength: encryptedMessage.iv ? Buffer.from(encryptedMessage.iv, 'base64').length : 0,
        contentLength: encryptedMessage.encryptedContent ? Buffer.from(encryptedMessage.encryptedContent, 'base64').length : 0
      });
      
      throw error;
    }
  }

  /**
   * Initialize user crypto keys (generate salt and store)
   */
  async initializeUserCrypto(userId: string, password: string): Promise<IUserCryptoKeys> {
    const salt = this.generateKeySalt();
    const masterKey = await this.deriveMasterKey(password, salt);

    // Store salt in database - use named parameters
    await executeQuery(
      `INSERT OR REPLACE INTO user_crypto_keys (user_id, master_key_salt) 
       VALUES (@userId, @salt)`,
      { userId, salt }
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
      'SELECT user_id, master_key_salt FROM user_crypto_keys WHERE user_id = @userId',
      { userId }
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
    // Check if chat key already exists in chat_keys table
    const existingKey = await executeQuery(
      'SELECT id, key_data FROM chat_keys WHERE chat_id = @chatId AND key_version = @keyVersion',
      { chatId, keyVersion: 1 }
    );

    let chatKeyData: string;

    if (existingKey.length > 0) {
      chatKeyData = existingKey[0].key_data;
    } else {
      // Generate new chat key
      const chatKey = await this.generateWorkspaceKey();
      chatKey.workspaceId = chatId;
      chatKey.createdBy = createdBy;
      chatKeyData = chatKey.keyData;

      // Store chat key in chat_keys table
      const keyId = crypto.randomUUID();
      await executeQuery(
        `INSERT INTO chat_keys (id, chat_id, key_data, key_version, created_by) 
         VALUES (@id, @chatId, @keyData, @keyVersion, @createdBy)`,
        { id: keyId, chatId, keyData: chatKeyData, keyVersion: 1, createdBy }
      );
    }

    // Encrypt and distribute to each user (even if key already existed)
    for (const userId of userIds) {
      const masterKey = userMasterKeys[userId];
      if (!masterKey) {
        continue;
      }

      // Check if user already has access to this key
      const existingUserKey = await executeQuery(
        'SELECT id FROM user_chat_keys WHERE user_id = @userId AND chat_id = @chatId AND key_version = @keyVersion',
        { userId, chatId, keyVersion: 1 }
      );

      if (existingUserKey.length > 0) {
        continue;
      }

      const encryptedChatKey = await this.encryptWorkspaceKey(chatKeyData, masterKey);
      
      const userKeyId = crypto.randomUUID();
      await executeQuery(
        `INSERT INTO user_chat_keys (id, user_id, chat_id, encrypted_chat_key, key_version, granted_by, has_access)
         VALUES (@id, @userId, @chatId, @encryptedChatKey, @keyVersion, @grantedBy, @hasAccess)`,
        { 
          id: userKeyId, 
          userId, 
          chatId, 
          encryptedChatKey, 
          keyVersion: 1, 
          grantedBy: createdBy, 
          hasAccess: 1 
        }
      );
    }

    console.log(`✅ [createChatKey] Completed chat key creation for ${userIds.length} users`);
  }

  /**
   * ✅ NEW: HKDF-based key derivation (RFC 5869)
   */
  private async deriveKeyWithHKDF(
    inputKeyMaterial: string, 
    salt: string, 
    info: string, 
    length: number = 32
  ): Promise<string> {
    const hmac = crypto.createHmac('sha256', salt);
    hmac.update(inputKeyMaterial);
    const prk = hmac.digest();
    
    const infoBuffer = Buffer.from(info, 'utf8');
    const n = Math.ceil(length / 32);
    let okm = Buffer.alloc(0);
    
    for (let i = 1; i <= n; i++) {
      const hmacExpand = crypto.createHmac('sha256', prk);
      if (i > 1) {
        hmacExpand.update(okm.subarray(okm.length - 32));
      }
      hmacExpand.update(infoBuffer);
      hmacExpand.update(Buffer.from([i]));
      
      const t = hmacExpand.digest();
      okm = Buffer.concat([okm, t]);
    }
    
    return okm.subarray(0, length).toString('base64');
  }

  /**
   * ✅ NEW: Standardized chat key derivation
   */
  async deriveChatKey(chatId: string, workspaceId: string): Promise<string> {
    const inputKeyMaterial = `chat:${workspaceId}:${chatId}`;
    const saltInput = `chat-salt:${workspaceId}:${chatId}`;
    const saltHash = crypto.createHash('sha256').update(saltInput).digest();
    const info = `onlysaid-chat-encryption-v2`;
    
    return await this.deriveKeyWithHKDF(
      inputKeyMaterial,
      saltHash.toString('base64'),
      info,
      32
    );
  }

  /**
   * ✅ NEW: Standardized workspace key derivation
   */
  async deriveWorkspaceKey(workspaceId: string, context: string = 'chat-encryption'): Promise<string> {
    const inputKeyMaterial = `workspace:${workspaceId}`;
    const saltInput = `salt:${workspaceId}:${context}`;
    const saltHash = crypto.createHash('sha256').update(saltInput).digest();
    const info = `onlysaid-${context}-v2`;
    
    return await this.deriveKeyWithHKDF(
      inputKeyMaterial,
      saltHash.toString('base64'),
      info,
      32
    );
  }

  /**
   * ✅ NEW: User-specific master key derivation
   * Uses PBKDF2 with proper parameters
   */
  async deriveUserMasterKey(userId: string, userToken: string, salt: string): Promise<string> {
    const inputMaterial = `user:${userId}:${userToken}`;
    
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        inputMaterial, 
        salt, 
        this.ITERATIONS, 
        this.KEY_LENGTH, 
        'sha256', 
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey.toString('base64'));
        }
      );
    });
  }

  /**
   * ✅ UPDATED: Get chat key with new standard derivation
   */
  async getChatKeyForUser(userId: string, chatId: string, workspaceId: string): Promise<string | null> {
    console.log(`🔍 [getChatKeyForUser] Looking for key: userId=${userId}, chatId=${chatId}, workspaceId=${workspaceId}`);
    
    try {
      // ✅ NEW: Use standardized key derivation
      const standardKey = await this.deriveChatKey(chatId, workspaceId);
      console.log(`✅ [getChatKeyForUser] Derived standard chat key successfully`);
      return standardKey;
    } catch (error) {
      console.error('Failed to derive standard chat key:', error);
      
      // Fallback to old method for backward compatibility
      return await this.getChatKeyForUserLegacy(userId, chatId);
    }
  }

  /**
   * ✅ NEW: Legacy method for backward compatibility
   */
  private async getChatKeyForUserLegacy(userId: string, chatId: string): Promise<string | null> {
    console.log(`🔄 [getChatKeyForUser] Using legacy key derivation for backward compatibility`);
    
    let result = await executeQuery(
      `SELECT encrypted_chat_key FROM user_chat_keys 
       WHERE user_id = ? AND chat_id = ? AND has_access = 1 
       ORDER BY key_version DESC LIMIT 1`,
      [userId, chatId]
    );

    if (result.length > 0) {
      try {
        // Try to decrypt with legacy method
        const legacyKey = await this.deriveLegacyKey(chatId, "workspace-key");
        const decryptedKey = await this.decryptWorkspaceKey(result[0].encrypted_chat_key, legacyKey);
        return decryptedKey;
      } catch (error) {
        console.error('Legacy key derivation failed:', error);
      }
    }

    return null;
  }

  /**
   * ✅ NEW: Legacy key derivation for backward compatibility
   */
  private async deriveLegacyKey(chatId: string, secret: string): Promise<string> {
    const combined = `${chatId}:${secret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(String.fromCharCode(...hashArray));
  }
}

// Singleton instance
export const cryptoService = new CryptoService(); 
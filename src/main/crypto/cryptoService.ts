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
    const chatKey = await this.generateWorkspaceKey();
    chatKey.workspaceId = chatId;
    chatKey.createdBy = createdBy;

    // Store chat key
    await executeQuery(
      `INSERT INTO workspace_keys (id, workspace_id, key_data, key_version, created_by) 
       VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), chatId, chatKey.keyData, chatKey.keyVersion, createdBy]
    );

    // Encrypt and distribute to each user
    for (const userId of userIds) {
      const masterKey = userMasterKeys[userId];
      if (!masterKey) continue;

      const encryptedChatKey = await this.encryptWorkspaceKey(chatKey.keyData, masterKey);
      
      await executeQuery(
        `INSERT INTO user_workspace_keys (id, user_id, workspace_id, encrypted_workspace_key, key_version, granted_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), userId, chatId, encryptedChatKey, chatKey.keyVersion, createdBy]
      );
    }
  }

  /**
   * Get decrypted chat key for user
   */
  async getChatKeyForUser(userId: string, chatId: string, masterKey: string): Promise<string | null> {
    const result = await executeQuery(
      `SELECT encrypted_workspace_key, key_version FROM user_workspace_keys 
       WHERE user_id = ? AND workspace_id = ? AND has_access = TRUE 
       ORDER BY key_version DESC LIMIT 1`,
      [userId, chatId]
    );

    if (result.length === 0) return null;

    try {
      return await this.decryptWorkspaceKey(result[0].encrypted_workspace_key, masterKey);
    } catch (error) {
      console.error('Failed to decrypt chat key:', error);
      return null;
    }
  }
}

// Singleton instance
export const cryptoService = new CryptoService(); 
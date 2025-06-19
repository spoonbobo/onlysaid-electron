// Migration version tracking and management
export interface IMigration {
  id: string;
  version: string;
  name: string;
  description: string;
  up: string;
  down?: string;
  dependencies?: string[];
  category: 'core' | 'feature' | 'index' | 'data';
  createdAt: string;
}

export interface IMigrationState {
  version: string;
  appliedMigrations: string[];
  lastApplied: string;
  environment: 'development' | 'production' | 'test';
}

// Core system migrations - essential for app functionality
export const coreMigrations: IMigration[] = [
  {
    id: 'core_001',
    version: '1.0.0',
    name: 'create_settings_table',
    description: 'Create settings table for application configuration',
    category: 'core',
    createdAt: '2024-01-01T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    down: `DROP TABLE IF EXISTS settings`
  },
  {
    id: 'core_002',
    version: '1.0.0',
    name: 'create_migration_state',
    description: 'Create migration state tracking table',
    category: 'core',
    createdAt: '2024-01-01T00:01:00Z',
    up: `CREATE TABLE IF NOT EXISTS migration_state (
      id INTEGER PRIMARY KEY,
      migration_id TEXT NOT NULL,
      version TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      environment TEXT NOT NULL,
      checksum TEXT,
      UNIQUE(migration_id)
    )`,
    down: `DROP TABLE IF EXISTS migration_state`
  }
];

// Feature migrations - application features
export const featureMigrations: IMigration[] = [
  {
    id: 'feature_001',
    version: '1.1.0',
    name: 'create_chat_table',
    description: 'Create chat table for messaging functionality',
    category: 'feature',
    dependencies: ['core_001'],
    createdAt: '2024-01-02T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS chat (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      type TEXT DEFAULT 'chat',
      name TEXT DEFAULT 'New Chat',
      unread INTEGER DEFAULT 0,
      workspace_id TEXT,
      user_id TEXT
    )`,
    down: `DROP TABLE IF EXISTS chat`
  },
  {
    id: 'feature_002',
    version: '1.1.0',
    name: 'create_messages_table',
    description: 'Create messages table for chat messages',
    category: 'feature',
    dependencies: ['feature_001'],
    createdAt: '2024-01-02T00:01:00Z',
    up: `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sent_at TIMESTAMP,
      chat_id TEXT,
      sender TEXT,
      status TEXT,
      reactions TEXT,
      reply_to TEXT,
      mentions TEXT,
      file_ids TEXT,
      poll TEXT,
      contact TEXT,
      gif TEXT,
      text TEXT
    )`,
    down: `DROP TABLE IF EXISTS messages`
  },
  {
    id: 'feature_003',
    version: '1.2.0',
    name: 'create_reactions_table',
    description: 'Create reactions table for message reactions',
    category: 'feature',
    dependencies: ['feature_002'],
    createdAt: '2024-01-03T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reaction TEXT NOT NULL,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id)
    )`,
    down: `DROP TABLE IF EXISTS reactions`
  },
  {
    id: 'feature_004',
    version: '1.3.0',
    name: 'create_tool_calls_table',
    description: 'Create tool calls table for MCP tool execution',
    category: 'feature',
    dependencies: ['feature_002'],
    createdAt: '2024-01-04T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS tool_calls (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      call_index INTEGER NOT NULL,
      type TEXT,
      function_name TEXT,
      function_arguments TEXT,
      tool_description TEXT,
      mcp_server TEXT,
      status TEXT DEFAULT 'pending',
      result TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_time_seconds REAL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )`,
    down: `DROP TABLE IF EXISTS tool_calls`
  },
  {
    id: 'feature_005',
    version: '1.4.0',
    name: 'create_files_table',
    description: 'Create files table for file management',
    category: 'feature',
    createdAt: '2024-01-05T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      path TEXT NOT NULL,
      user_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT
    )`,
    down: `DROP TABLE IF EXISTS files`
  },
  {
    id: 'feature_006',
    version: '1.5.0',
    name: 'create_notifications_table',
    description: 'Create notifications table for user notifications',
    category: 'feature',
    createdAt: '2024-01-06T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      message TEXT NOT NULL,
      sender TEXT,
      receivers TEXT
    )`,
    down: `DROP TABLE IF EXISTS notifications`
  },
  {
    id: 'feature_007',
    version: '1.6.0',
    name: 'create_plans_table',
    description: 'Create plans table for task planning',
    category: 'feature',
    createdAt: '2024-01-07T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP,
      plan_name TEXT,
      plan_overview TEXT,
      assigner TEXT NOT NULL,
      assignee TEXT NOT NULL,
      reviewer TEXT,
      status TEXT,
      room_id TEXT,
      progress INTEGER,
      logs TEXT,
      context TEXT
    )`,
    down: `DROP TABLE IF EXISTS plans`
  },
  {
    id: 'feature_008',
    version: '1.6.0',
    name: 'create_tasks_table',
    description: 'Create tasks table for plan execution',
    category: 'feature',
    dependencies: ['feature_007'],
    createdAt: '2024-01-07T00:01:00Z',
    up: `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      start_time TIMESTAMP,
      completed_at TIMESTAMP,
      plan_id TEXT NOT NULL,
      step_number INTEGER NOT NULL,
      task_name TEXT NOT NULL,
      task_explanation TEXT NOT NULL,
      expected_result TEXT,
      mcp_server TEXT,
      skills TEXT,
      status TEXT,
      result TEXT,
      logs TEXT,
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    )`,
    down: `DROP TABLE IF EXISTS tasks`
  },
  {
    id: 'feature_009',
    version: '1.7.0',
    name: 'create_logs_table',
    description: 'Create logs table for system logging',
    category: 'feature',
    createdAt: '2024-01-08T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      content TEXT,
      reference_id TEXT,
      reference_type TEXT
    )`,
    down: `DROP TABLE IF EXISTS logs`
  },
  {
    id: 'feature_010',
    version: '1.8.0',
    name: 'create_skills_table',
    description: 'Create skills table for MCP skill management',
    category: 'feature',
    createdAt: '2024-01-09T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      name TEXT,
      mcp_server TEXT,
      description TEXT,
      type TEXT,
      args TEXT
    )`,
    down: `DROP TABLE IF EXISTS skills`
  },
  {
    id: 'feature_011',
    version: '1.9.0',
    name: 'create_documents_table',
    description: 'Create documents table for knowledge base',
    category: 'feature',
    createdAt: '2024-01-10T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      content TEXT,
      content_path TEXT,
      parent_id TEXT,
      source_type TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT,
      source_file_type TEXT,
      title TEXT NOT NULL,
      author_list TEXT,
      created_at TIMESTAMP,
      last_modified TIMESTAMP,
      ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      language TEXT NOT NULL,
      document_type TEXT NOT NULL,
      tags TEXT,
      topics TEXT,
      categories TEXT,
      chunk_index INTEGER,
      total_chunks INTEGER,
      chunk_strategy TEXT,
      chunk_size INTEGER,
      chunk_overlap INTEGER,
      chunk_section TEXT,
      embedding_model TEXT,
      embedding_version TEXT,
      embedding_dimensions INTEGER,
      embedding_created_at TIMESTAMP,
      importance_score REAL,
      recency_score REAL,
      view_count INTEGER DEFAULT 0,
      feedback_score REAL,
      additional_metadata TEXT,
      FOREIGN KEY (parent_id) REFERENCES documents(id)
    )`,
    down: `DROP TABLE IF EXISTS documents`
  },
  {
    id: 'feature_012',
    version: '2.0.0',
    name: 'create_user_crypto_keys_table',
    description: 'Create user crypto keys table for storing user master key salts',
    category: 'feature',
    createdAt: '2024-01-12T00:00:00Z',
    up: `CREATE TABLE IF NOT EXISTS user_crypto_keys (
      user_id TEXT PRIMARY KEY,
      master_key_salt TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    down: `DROP TABLE IF EXISTS user_crypto_keys`
  },
  {
    id: 'feature_013',
    version: '2.0.0',
    name: 'create_workspace_keys_table',
    description: 'Create workspace keys table for storing workspace encryption keys',
    category: 'feature',
    dependencies: ['feature_012'],
    createdAt: '2024-01-12T00:01:00Z',
    up: `CREATE TABLE IF NOT EXISTS workspace_keys (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      key_data TEXT NOT NULL,
      key_version INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      UNIQUE(workspace_id, key_version)
    )`,
    down: `DROP TABLE IF EXISTS workspace_keys`
  },
  {
    id: 'feature_014',
    version: '2.0.0',
    name: 'create_user_workspace_keys_table',
    description: 'Create user workspace keys table for storing encrypted workspace keys per user',
    category: 'feature',
    dependencies: ['feature_012', 'feature_013'],
    createdAt: '2024-01-12T00:02:00Z',
    up: `CREATE TABLE IF NOT EXISTS user_workspace_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      encrypted_workspace_key TEXT NOT NULL,
      key_version INTEGER NOT NULL DEFAULT 1,
      has_access BOOLEAN DEFAULT TRUE,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      granted_by TEXT NOT NULL,
      UNIQUE(user_id, workspace_id, key_version),
      FOREIGN KEY (user_id) REFERENCES user_crypto_keys(user_id),
      FOREIGN KEY (workspace_id, key_version) REFERENCES workspace_keys(workspace_id, key_version)
    )`,
    down: `DROP TABLE IF EXISTS user_workspace_keys`
  },
  {
    id: 'feature_015',
    version: '2.0.0',
    name: 'add_encryption_to_messages',
    description: 'Add encryption fields to messages table',
    category: 'feature',
    dependencies: ['feature_002'],
    createdAt: '2024-01-12T00:03:00Z',
    up: `
      -- Add encryption columns to messages table
      ALTER TABLE messages ADD COLUMN encrypted_text TEXT;
      ALTER TABLE messages ADD COLUMN encryption_iv TEXT;
      ALTER TABLE messages ADD COLUMN encryption_key_version INTEGER;
      ALTER TABLE messages ADD COLUMN encryption_algorithm TEXT DEFAULT 'AES-GCM-256';
      ALTER TABLE messages ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;
    `,
    down: `
      -- Remove encryption columns (SQLite doesn't support DROP COLUMN directly)
      -- This would require recreating the table without these columns
      CREATE TABLE messages_temp AS SELECT 
        id, created_at, updated_at, sent_at, chat_id, sender, status, 
        reactions, reply_to, mentions, file_ids, poll, contact, gif, text
      FROM messages;
      DROP TABLE messages;
      ALTER TABLE messages_temp RENAME TO messages;
    `
  },
  {
    id: 'feature_016',
    version: '2.1.0',
    name: 'create_chat_keys_tables',
    description: 'Create chat-specific encryption key tables',
    category: 'feature',
    dependencies: ['feature_012'], // Depends on user_crypto_keys
    createdAt: '2024-01-13T00:00:00Z',
    up: `
      -- Chat-level encryption keys
      CREATE TABLE IF NOT EXISTS chat_keys (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        key_data TEXT NOT NULL,
        key_version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(chat_id, key_version)
      );

      -- User access to chat keys
      CREATE TABLE IF NOT EXISTS user_chat_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        encrypted_chat_key TEXT NOT NULL,
        key_version INTEGER NOT NULL DEFAULT 1,
        has_access BOOLEAN DEFAULT TRUE,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by TEXT NOT NULL,
        UNIQUE(user_id, chat_id, key_version),
        FOREIGN KEY (user_id) REFERENCES user_crypto_keys(user_id)
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_chat_keys_chat_id ON chat_keys(chat_id);
      CREATE INDEX IF NOT EXISTS idx_user_chat_keys_user_id ON user_chat_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_chat_keys_chat_id ON user_chat_keys(chat_id);
    `,
    down: `
      DROP INDEX IF EXISTS idx_user_chat_keys_chat_id;
      DROP INDEX IF EXISTS idx_user_chat_keys_user_id;
      DROP INDEX IF EXISTS idx_chat_keys_chat_id;
      DROP TABLE IF EXISTS user_chat_keys;
      DROP TABLE IF EXISTS chat_keys;
    `
  },
  {
    id: 'feature_017',
    version: '2.1.1',
    name: 'ensure_chat_keys_migration',
    description: 'Ensure chat keys tables exist with backward compatibility',
    category: 'feature',
    dependencies: ['feature_016'],
    createdAt: '2024-01-13T00:01:00Z',
    up: `
      -- Ensure chat_keys table exists
      CREATE TABLE IF NOT EXISTS chat_keys (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        key_data TEXT NOT NULL,
        key_version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(chat_id, key_version)
      );

      -- Ensure user_chat_keys table exists
      CREATE TABLE IF NOT EXISTS user_chat_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        encrypted_chat_key TEXT NOT NULL,
        key_version INTEGER NOT NULL DEFAULT 1,
        has_access BOOLEAN DEFAULT TRUE,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        granted_by TEXT NOT NULL,
        UNIQUE(user_id, chat_id, key_version)
      );

      -- ✅ KEEP OLD KEYS for backward compatibility
      -- Don't delete old workspace keys - they're needed for old messages

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_chat_keys_chat_id ON chat_keys(chat_id);
      CREATE INDEX IF NOT EXISTS idx_user_chat_keys_user_id ON user_chat_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_chat_keys_chat_id ON user_chat_keys(chat_id);
    `,
    down: `
      DROP INDEX IF EXISTS idx_user_chat_keys_chat_id;
      DROP INDEX IF EXISTS idx_user_chat_keys_user_id;
      DROP INDEX IF EXISTS idx_chat_keys_chat_id;
      DROP TABLE IF EXISTS user_chat_keys;
      DROP TABLE IF EXISTS chat_keys;
    `
  },
  {
    id: 'feature_018',
    version: '2.2.0',
    name: 'add_message_read_field',
    description: 'Add isRead field to messages table',
    category: 'feature',
    dependencies: ['feature_002'],
    createdAt: '2024-01-14T00:00:00Z',
    up: `
      -- Add isRead field to messages table
      ALTER TABLE messages ADD COLUMN isRead BOOLEAN DEFAULT FALSE;
      
      -- Create index for performance
      CREATE INDEX IF NOT EXISTS idx_messages_isRead ON messages(isRead);
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id_isRead ON messages(chat_id, isRead);
    `,
    down: `
      DROP INDEX IF EXISTS idx_messages_chat_id_isRead;
      DROP INDEX IF EXISTS idx_messages_isRead;
      
      -- SQLite doesn't support DROP COLUMN, so we'd need to recreate table
      CREATE TABLE messages_temp AS SELECT 
        id, created_at, updated_at, sent_at, chat_id, sender, status, 
        reactions, reply_to, mentions, file_ids, poll, contact, gif, text
      FROM messages;
      DROP TABLE messages;
      ALTER TABLE messages_temp RENAME TO messages;
    `
  }
];

// Index migrations - performance optimizations
export const indexMigrations: IMigration[] = [
  {
    id: 'index_001',
    version: '1.4.1',
    name: 'create_files_indexes',
    description: 'Create indexes for files table performance',
    category: 'index',
    dependencies: ['feature_005'],
    createdAt: '2024-01-05T01:00:00Z',
    up: `
      -- Check if files table exists and has required columns before creating indexes
      CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
      CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
    `,
    down: `
      DROP INDEX IF EXISTS idx_files_workspace_id;
      DROP INDEX IF EXISTS idx_files_user_id;
      DROP INDEX IF EXISTS idx_files_created_at;
    `
  },
  {
    id: 'index_002',
    version: '1.1.1',
    name: 'create_messages_indexes',
    description: 'Create indexes for messages table performance',
    category: 'index',
    dependencies: ['feature_002'],
    createdAt: '2024-01-02T01:00:00Z',
    up: `
      CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `,
    down: `
      DROP INDEX IF EXISTS idx_messages_chat_id;
      DROP INDEX IF EXISTS idx_messages_sender;
      DROP INDEX IF EXISTS idx_messages_created_at;
    `
  },
  {
    id: 'index_003',
    version: '1.9.1',
    name: 'create_documents_indexes',
    description: 'Create indexes for documents table performance',
    category: 'index',
    dependencies: ['feature_011'],
    createdAt: '2024-01-10T01:00:00Z',
    up: `
      CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id);
      CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_documents_language ON documents(language);
      CREATE INDEX IF NOT EXISTS idx_documents_ingested_at ON documents(ingested_at);
    `,
    down: `
      DROP INDEX IF EXISTS idx_documents_parent_id;
      DROP INDEX IF EXISTS idx_documents_document_type;
      DROP INDEX IF EXISTS idx_documents_language;
      DROP INDEX IF EXISTS idx_documents_ingested_at;
    `
  },
  {
    id: 'index_004',
    version: '1.7.1',
    name: 'create_logs_indexes',
    description: 'Create indexes for logs table performance',
    category: 'index',
    dependencies: ['feature_009'],
    createdAt: '2024-01-08T01:00:00Z',
    up: `CREATE INDEX IF NOT EXISTS idx_logs_reference ON logs(reference_id, reference_type)`,
    down: `DROP INDEX IF EXISTS idx_logs_reference`
  }
];

// Data migrations - schema updates and data transformations
export const dataMigrations: IMigration[] = [
  {
    id: 'data_001',
    version: '1.9.2',
    name: 'create_document_view',
    description: 'Create document view for easier querying',
    category: 'data',
    dependencies: ['feature_011', 'index_003'],
    createdAt: '2024-01-10T02:00:00Z',
    up: `CREATE VIEW IF NOT EXISTS document_view AS
     SELECT
        id,
        title,
        content,
        document_type,
        language,
        source_name,
        ingested_at,
        CASE WHEN parent_id IS NULL THEN 'Parent' ELSE 'Chunk' END as doc_type,
        view_count
     FROM
        documents
     ORDER BY
        ingested_at DESC`,
    down: `DROP VIEW IF EXISTS document_view`
  },
  {
    id: 'data_002',
    version: '1.9.3',
    name: 'fix_messages_table_schema',
    description: 'Fix messages table schema by recreating with all required columns',
    category: 'data',
    dependencies: ['feature_002', 'feature_018'],
    createdAt: '2024-01-11T00:00:00Z',
    up: `
      -- Check if messages table exists and recreate it with proper schema
      DROP TABLE IF EXISTS messages_backup;

      -- Create backup of existing data
      CREATE TABLE messages_backup AS SELECT * FROM messages;

      -- Drop the old table
      DROP TABLE messages;

      -- Recreate messages table with correct schema INCLUDING isRead
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        chat_id TEXT,
        sender TEXT,
        status TEXT,
        reactions TEXT,
        reply_to TEXT,
        mentions TEXT,
        file_ids TEXT,
        poll TEXT,
        contact TEXT,
        gif TEXT,
        text TEXT,
        isRead BOOLEAN DEFAULT FALSE
      );

      -- Restore data from backup, handling missing columns gracefully
      INSERT INTO messages (
        id, created_at, updated_at, sent_at, chat_id, sender, status,
        reactions, reply_to, text, mentions, file_ids, poll, contact, gif, isRead
      )
      SELECT
        id, created_at, updated_at, sent_at, chat_id, sender, status,
        COALESCE(reactions, NULL) as reactions,
        COALESCE(reply_to, NULL) as reply_to,
        text,
        NULL as mentions,
        NULL as file_ids,
        NULL as poll,
        NULL as contact,
        NULL as gif,
        COALESCE(isRead, FALSE) as isRead
      FROM messages_backup;

      -- Clean up backup table
      DROP TABLE messages_backup;
    `,
    down: `
      -- This rollback recreates the old schema (without new columns)
      DROP TABLE IF EXISTS messages_backup;
      CREATE TABLE messages_backup AS SELECT * FROM messages;
      DROP TABLE messages;

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        chat_id TEXT,
        sender TEXT,
        status TEXT,
        reactions TEXT,
        reply_to TEXT,
        text TEXT
      );

      INSERT INTO messages (
        id, created_at, updated_at, sent_at, chat_id, sender, status, reactions, reply_to, text
      )
      SELECT
        id, created_at, updated_at, sent_at, chat_id, sender, status, reactions, reply_to, text
      FROM messages_backup;

      DROP TABLE messages_backup;
    `
  }
];

// Combine all migrations in dependency order
export const allMigrations: IMigration[] = [
  ...coreMigrations,
  ...featureMigrations,
  ...indexMigrations,
  ...dataMigrations
];

// Legacy migration strings for backward compatibility
export const legacyMigrations = allMigrations.map(m => m.up);

// Migration utilities
export const getMigrationsByVersion = (version: string): IMigration[] => {
  return allMigrations.filter(m => m.version === version);
};

export const getMigrationsByCategory = (category: IMigration['category']): IMigration[] => {
  return allMigrations.filter(m => m.category === category);
};

export const getMigrationById = (id: string): IMigration | undefined => {
  return allMigrations.find(m => m.id === id);
};

export const validateMigrationDependencies = (migration: IMigration, appliedMigrations: string[]): boolean => {
  if (!migration.dependencies) return true;
  return migration.dependencies.every(dep => appliedMigrations.includes(dep));
};

export const sortMigrationsByDependencies = (migrations: IMigration[]): IMigration[] => {
  const sorted: IMigration[] = [];
  const remaining = [...migrations];

  while (remaining.length > 0) {
    const canApply = remaining.filter(m =>
      validateMigrationDependencies(m, sorted.map(s => s.id))
    );

    if (canApply.length === 0) {
      throw new Error('Circular dependency detected in migrations');
    }

    // Sort by creation date within the same dependency level
    canApply.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sorted.push(...canApply);
    canApply.forEach(m => {
      const index = remaining.findIndex(r => r.id === m.id);
      remaining.splice(index, 1);
    });
  }

  return sorted;
};
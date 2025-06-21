import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { migrationManager } from './migration/migrationManager';
import { legacyMigrations } from './migration/migrations';

let dbPath: string;

if (process.type === 'browser') {
  const customDBPath = path.join(app.getPath('userData'), 'onlysaid-data');
  const dbDirectory = path.join(customDBPath, 'databases');
  console.log('Database directory path:', dbDirectory);

  dbPath = path.join(dbDirectory, 'onlysaid.db');
  console.log('Full database path:', dbPath);
} else {
  console.log('Using in-memory database because process.type is not "browser"');
  dbPath = ':memory:';
}

let dbInstance: Database.Database | null = null;

export const initializeDatabase = (): Database.Database => {
  if (!dbInstance) {
    try {
      console.log(`Attempting to initialize database at: ${dbPath}`);

      const dbDir = path.dirname(dbPath);
      if (dbPath !== ':memory:' && !fs.existsSync(dbDir)) {
        console.log(`Database directory does not exist: ${dbDir}`);
        console.log('Creating it now...');
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('Database directory created.');
      }

      dbInstance = new Database(dbPath, {
        verbose: undefined,
        fileMustExist: false
      });

      dbInstance.pragma('journal_mode = WAL');
      dbInstance.pragma('busy_timeout = 5000');
      dbInstance.pragma('foreign_keys = ON');
      dbInstance.pragma('synchronous = NORMAL');
      dbInstance.pragma('wal_autocheckpoint = 1000');

      console.log(`Database successfully initialized at: ${dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  }

  return dbInstance;
};

export const closeDatabase = (): void => {
  if (dbInstance) {
    console.log('Closing database connection...');

    try {
      const result = dbInstance.pragma('wal_checkpoint(FULL)');
      console.log('Checkpoint result:', result);

      const start = Date.now();
      while (Date.now() - start < 100) {
        // Small busy wait
      }

      dbInstance.close();
      dbInstance = null;
      console.log('Database connection closed successfully.');
    } catch (error) {
      console.error('Error during database close:', error);
    }
  }
};

const convertBooleanParams = (params: Record<string, any>): Record<string, any> => {
  const converted: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'boolean') {
      converted[key] = value ? 1 : 0;
    } else {
      converted[key] = value;
    }
  }
  
  return converted;
};

export const executeQuery = <T = any>(
  query: string,
  params: Record<string, any> | any[] = {}
): T[] => {
  if (!dbInstance) {
    initializeDatabase();
    if (!dbInstance) {
      throw new Error('Database not initialized and failed to initialize.');
    }
  }

  try {
    let processedParams: any;
    
    // Handle both array and object parameters
    if (Array.isArray(params)) {
      processedParams = params.map(param => 
        typeof param === 'boolean' ? (param ? 1 : 0) : param
      );
    } else {
      processedParams = convertBooleanParams(params);
    }
    
    const statement = dbInstance.prepare(query);

    const lowerQuery = query.trim().toLowerCase();

    /* ----------------  decide read vs write  ---------------- */
    const isSelect   = lowerQuery.startsWith('select');
    const isPragma   = lowerQuery.startsWith('pragma');
    // pragma that **reads** looks like  `pragma foreign_keys`  
    // pragma that **writes** contains '=' or '(' (e.g.  pragma foreign_keys = on)
    const isPragmaRead = isPragma && !/=|\(/.test(lowerQuery);

    if (isSelect || isPragmaRead) {
      /* read-type statement – return rows */
      return statement.all(processedParams) as T[];
    }

    /* write-type statement – return run-info */
    const runInfo = statement.run(processedParams);
    return [runInfo] as T[];
  } catch (error) {
    console.error('Error executing query:', query, params, error);
    throw error;
  }
};

export const executeTransaction = <T>(
  callback: (db: Database.Database) => T
): T => {
  if (!dbInstance) {
    initializeDatabase();
    if (!dbInstance) {
      throw new Error('Database not initialized and failed to initialize for transaction.');
    }
  }

  const currentDbInstance = dbInstance;
  if (!currentDbInstance) {
    throw new Error('Database instance is null even after initialization check.');
  }

  const transaction = currentDbInstance.transaction(callback);
  return transaction(currentDbInstance);
};

export const runMigrations = async (migrations?: string[]): Promise<void> => {
  if (!dbInstance) {
    initializeDatabase();
    if (!dbInstance) {
      throw new Error('Database not initialized and failed to initialize for migrations.');
    }
  }

  if (migrations && migrations.length > 0) {
    console.log('Legacy migration system detected. Switching to new migration manager...');
  }

  try {
    await migrationManager.runMigrations();
  } catch (error) {
    console.error('Migration failed:', error);

    // Production recovery mechanism
    if (process.env.NODE_ENV === 'production') {
      console.log('Attempting migration recovery for production environment...');
      try {
        await recoverEssentialTables();
        console.log('Migration recovery completed');
      } catch (recoveryError) {
        console.error('Migration recovery failed:', recoveryError);
        throw error;
      }
    } else {
      throw error;
    }
  }
};

const recoverEssentialTables = async (): Promise<void> => {
  const essentialTables = [
    {
      name: 'settings',
      sql: `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`
    },
    {
      name: 'migration_state',
      sql: `CREATE TABLE IF NOT EXISTS migration_state (
        id INTEGER PRIMARY KEY,
        migration_id TEXT NOT NULL,
        version TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        environment TEXT NOT NULL,
        checksum TEXT,
        UNIQUE(migration_id)
      )`
    },
    {
      name: 'chat',
      sql: `CREATE TABLE IF NOT EXISTS chat (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        type TEXT DEFAULT 'chat',
        name TEXT DEFAULT 'New Chat',
        unread INTEGER DEFAULT 0,
        workspace_id TEXT,
        user_id TEXT
      )`
    },
    {
      name: 'messages',
      sql: `CREATE TABLE IF NOT EXISTS messages (
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
      )`
    }
  ];

  for (const table of essentialTables) {
    try {
      await executeQuery(table.sql);
      console.log(`✓ Ensured table exists: ${table.name}`);
    } catch (error) {
      console.error(`✗ Failed to create table ${table.name}:`, error);
    }
  }
};

export { migrationManager };
export {
  getMigrationsByVersion,
  getMigrationsByCategory,
  getMigrationById,
  allMigrations
} from './migration/migrations';

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { migrationManager } from './migrationManager';
import { legacyMigrations } from './migrations';

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

export const executeQuery = <T = any>(
  query: string,
  params: Record<string, any> = {}
): T[] => {
  if (!dbInstance) {
    initializeDatabase();
    if (!dbInstance) {
      throw new Error('Database not initialized and failed to initialize.');
    }
  }

  try {
    const statement = dbInstance.prepare(query);

    const lowerQuery = query.trim().toLowerCase();
    if (lowerQuery.startsWith('select') || lowerQuery.startsWith('pragma')) {
      return statement.all(params) as T[];
    } else {
      const runInfo = statement.run(params);
      return [runInfo] as T[];
    }
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

  // If legacy migrations array is provided, use old system for backward compatibility
  if (migrations && migrations.length > 0) {
    console.log('Legacy migration system detected. Switching to new migration manager...');
    // Don't run legacy migrations, use the new system instead
  }

  // Use new migration manager
  try {
    await migrationManager.runMigrations();
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Export migration utilities
export { migrationManager };
export {
  getMigrationsByVersion,
  getMigrationsByCategory,
  getMigrationById,
  allMigrations
} from './migrations';
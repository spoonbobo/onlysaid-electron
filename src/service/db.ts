import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Database file path
let dbPath: string;

// Make sure this is only run in the main process
if (process.type === 'browser') {
  // For production, use the app's user data directory
  const userDataPath = app.getPath('userData');
  console.log('User data path:', userDataPath);

  const dbDirectory = path.join(userDataPath, 'databases');
  console.log('Database directory path:', dbDirectory);

  // Ensure the directory exists with better error handling
  try {
    if (!fs.existsSync(dbDirectory)) {
      console.log('Creating database directory...');
      fs.mkdirSync(dbDirectory, { recursive: true });
      console.log('Database directory created successfully');
    } else {
      console.log('Database directory already exists');
    }

    // Verify the directory was created correctly
    if (!fs.existsSync(dbDirectory)) {
      console.error('Failed to create database directory even after mkdirSync');
    }
  } catch (error) {
    console.error('Error creating database directory:', error);
  }

  dbPath = path.join(dbDirectory, 'onlysaid.db');
  console.log('Full database path:', dbPath);
} else {
  // For renderer process or testing, use a placeholder
  // This will be replaced by the IPC handler
  dbPath = ':memory:';
}

// Database connection singleton
let dbInstance: Database.Database | null = null;

/**
 * Initialize the database connection
 * @returns The database instance
 */
export const initializeDatabase = (): Database.Database => {
  if (!dbInstance) {
    try {
      console.log(`Attempting to initialize database at: ${dbPath}`);

      // Check if the database directory exists before opening the connection
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        console.error(`Database directory does not exist: ${dbDir}`);
        console.log('Creating it now...');
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open the database with WAL mode for better concurrency
      dbInstance = new Database(dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
        fileMustExist: false
      });

      // Enable WAL mode for better performance and concurrency
      dbInstance.pragma('journal_mode = WAL');

      // Set busy timeout to prevent SQLITE_BUSY errors
      dbInstance.pragma('busy_timeout = 5000');

      // Enable foreign keys
      dbInstance.pragma('foreign_keys = ON');

      console.log(`Database successfully initialized at: ${dbPath}`);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw error;
    }
  }

  return dbInstance;
};

/**
 * Close the database connection
 */
export const closeDatabase = (): void => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};

/**
 * Execute a database query with parameters
 * @param query SQL query string
 * @param params Query parameters
 * @returns Query result
 */
export const executeQuery = <T = any>(
  query: string,
  params: Record<string, any> = {}
): T[] => {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }

  try {
    const statement = dbInstance.prepare(query);

    if (query.trim().toLowerCase().startsWith('select')) {
      return statement.all(params) as T[];
    } else {
      return [statement.run(params)] as T[];
    }
  } catch (error) {
    console.error('Error executing query:', query, params, error);
    throw error;
  }
};

/**
 * Execute a write transaction with multiple queries
 * @param callback Function that executes the transaction
 * @returns Result of the transaction
 */
export const executeTransaction = <T>(
  callback: (db: Database.Database) => T
): T => {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }

  const transaction = dbInstance.transaction(callback);
  return transaction(dbInstance);
};

/**
 * Run a migration to create tables if they don't exist
 * @param migrations Array of SQL strings to execute
 */
export const runMigrations = (migrations: string[]): void => {
  if (!dbInstance) {
    throw new Error('Database not initialized');
  }

  executeTransaction((db) => {
    migrations.forEach(migration => {
      db.exec(migration);
    });
  });

  console.log('Database migrations completed successfully');
};

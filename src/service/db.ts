import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Database file path
let dbPath: string;

// Make sure this is only run in the main process
if (process.type === 'browser') {
  // Custom database location
  const customDBPath = path.join(app.getPath('userData'), 'onlysaid-data');
  // Or use home directory
  // const customDBPath = path.join(require('os').homedir(), 'onlysaid-data');

  const dbDirectory = path.join(customDBPath, 'databases');
  console.log('Database directory path:', dbDirectory);

  dbPath = path.join(dbDirectory, 'onlysaid.db');
  console.log('Full database path:', dbPath);
} else {
  // Use in-memory database if not in the main process (e.g., renderer tests)
  console.log('Using in-memory database because process.type is not "browser"');
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

      // Ensure the database directory exists right before opening the connection
      const dbDir = path.dirname(dbPath);
      if (dbPath !== ':memory:' && !fs.existsSync(dbDir)) {
        console.log(`Database directory does not exist: ${dbDir}`);
        console.log('Creating it now...');
        // Use recursive: true to create parent directories if needed
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('Database directory created.');
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

      // Make WAL mode more durable by increasing checkpoint frequency
      dbInstance.pragma('synchronous = NORMAL'); // or FULL for more durability
      dbInstance.pragma('wal_autocheckpoint = 1000'); // Checkpoint after 1000 pages (default is 1000)

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
    console.log('Closing database connection...');

    try {
      // Force a complete checkpoint to ensure all WAL data is written to the main DB file
      const result = dbInstance.pragma('wal_checkpoint(FULL)');
      console.log('Checkpoint result:', result);

      // Add a brief delay to ensure checkpoint completes
      const start = Date.now();
      while (Date.now() - start < 100) {
        // Small busy wait to give SQLite time to complete the checkpoint
      }

      // Close the connection
      dbInstance.close();
      dbInstance = null;
      console.log('Database connection closed successfully.');
    } catch (error) {
      console.error('Error during database close:', error);
    }
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
    // It's better to initialize if not already initialized,
    // though in the main process flow, it should be.
    initializeDatabase();
    if (!dbInstance) { // Check again after trying to initialize
      throw new Error('Database not initialized and failed to initialize.');
    }
  }

  try {
    const statement = dbInstance.prepare(query);

    // Distinguish between read and write queries based on keywords
    const lowerQuery = query.trim().toLowerCase();
    if (lowerQuery.startsWith('select') || lowerQuery.startsWith('pragma')) {
      // Use .all() for select queries to get multiple rows
      return statement.all(params) as T[];
    } else {
      // Use .run() for insert, update, delete, etc., which returns run info
      // Wrap the run info in an array to match the expected return type T[]
      const runInfo = statement.run(params);
      return [runInfo] as T[];
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
    // Initialize if needed
    initializeDatabase();
    if (!dbInstance) { // Check again
      throw new Error('Database not initialized and failed to initialize for transaction.');
    }
  }

  // Ensure dbInstance is not null before proceeding
  const currentDbInstance = dbInstance;
  if (!currentDbInstance) {
    throw new Error('Database instance is null even after initialization check.');
  }


  const transaction = currentDbInstance.transaction(callback);
  return transaction(currentDbInstance); // Pass the non-null instance
};

/**
 * Run a migration to create tables if they don't exist
 * @param migrations Array of SQL strings to execute
 */
export const runMigrations = (migrations: string[]): void => {
  if (!dbInstance) {
    // Initialize if needed, although it should be called after initializeDatabase in main.ts
    initializeDatabase();
    if (!dbInstance) { // Check again
      throw new Error('Database not initialized and failed to initialize for migrations.');
    }
  }

  executeTransaction((db) => {
    migrations.forEach(migration => {
      try {
        db.exec(migration);
      } catch (error) {
        console.error(`Error executing migration: ${migration}`, error);
        // Decide if you want to stop all migrations on error or continue
        // throw error; // Uncomment to stop on first error
      }
    });
  });

  console.log('Database migrations completed.'); // Simplified log
};

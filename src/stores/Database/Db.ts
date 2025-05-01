import { create } from 'zustand';

interface DbState {
  // State
  isInitialized: boolean;
  isConnecting: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  query: <T = any>(query: string, params?: Record<string, any>) => Promise<T[]>;
  transaction: <T>(callback: (db: any) => T) => Promise<T>;
  close: () => Promise<void>;
}

export const useDbStore = create<DbState>((set, get) => ({
  isInitialized: false,
  isConnecting: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;

    set({ isConnecting: true, error: null });

    try {
      await window.electron.ipcRenderer.invoke('db:initialize');

      // Verify the database was initialized correctly by checking for users table
      const tables = await window.electron.ipcRenderer.invoke('db:query', {
        query: "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      });

      console.log('Database tables created:', tables);

      set({ isInitialized: true, isConnecting: false });
    } catch (error) {
      console.error('Database initialization error:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize database',
        isConnecting: false
      });
    }
  },

  query: async <T = any>(query: string, params: Record<string, any> = {}) => {
    if (!get().isInitialized) {
      await get().initialize();
    }

    try {
      return await window.electron.ipcRenderer.invoke('db:query', { query, params }) as T[];
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Query execution failed' });
      throw error;
    }
  },

  transaction: async <T>(callback: (db: any) => T) => {
    if (!get().isInitialized) {
      await get().initialize();
    }

    try {
      return await window.electron.ipcRenderer.invoke('db:transaction', callback) as T;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Transaction execution failed' });
      throw error;
    }
  },

  close: async () => {
    if (!get().isInitialized) return;

    try {
      await window.electron.ipcRenderer.invoke('db:close');
      set({ isInitialized: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to close database' });
      throw error;
    }
  }
}));

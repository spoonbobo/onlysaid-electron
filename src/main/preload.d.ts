declare global {
  interface Window {
    electron: {
      openDirectory: () => Promise<string | null>;
      fileSystem: {
        openFolderDialog: () => Promise<{ canceled: boolean; filePaths?: string[]; }>;
      };
      chat: {
        get: (...args: unknown[]) => Promise<any>;
        create: (...args: unknown[]) => Promise<any>;
        update: (...args: unknown[]) => Promise<any>;
        delete: (...args: unknown[]) => Promise<any>;
      };
      // Add other properties as needed
    };
  }
}

export { };
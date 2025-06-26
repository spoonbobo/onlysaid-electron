declare global {
  interface Window {
    electron: {
      openDirectory: () => Promise<string | null>;
      fileSystem: {
        openFolderDialog: () => Promise<{ canceled: boolean; filePaths?: string[]; }>;
        readSubmissionContent: (args: { filePath: string; fileName: string }) => Promise<{
          success: boolean;
          content?: string;
          fileName: string;
          filePath: string;
          size?: number;
          type?: string;
          error?: string;
        }>;
        downloadAndReadSubmission: (args: { fileUrl: string; fileName: string; apiToken: string }) => Promise<{
          success: boolean;
          content?: string;
          fileName: string;
          fileUrl: string;
          size?: number;
          type?: string;
          error?: string;
        }>;
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
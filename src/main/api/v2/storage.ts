import { ipcMain } from "electron";
import onlysaidServiceInstance from "./service"; // Assuming service.ts is in the same directory

// Define expected argument and response types (optional but good practice)
interface IListContentsArgs {
  workspaceId: string;
  relativePath?: string;
  token: string;
}

interface IStorageItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

interface IListContentsResponse {
  workspaceStorageRoot: string;
  currentPath: string;
  contents: IStorageItem[];
  error?: string;
}

export const setupStorageHandlers = () => {
  ipcMain.handle('storage:list-contents', async (event, args: IListContentsArgs) => {
    try {
      let apiUrl = `/workspace/${args.workspaceId}/storage`;
      if (args.relativePath) {
        // Ensure relativePath is properly URL-encoded if it can contain special characters
        apiUrl += `?relativePath=${encodeURIComponent(args.relativePath)}`;
      }

      const response = await onlysaidServiceInstance.get<IListContentsResponse>(
        apiUrl,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (storage:list-contents):', error.message);
      // Attempt to forward the error structure from the backend if available
      if (error.response && error.response.data) {
        return {
          error: error.response.data.error || error.message,
          status: error.response.status,
          data: error.response.data // Forward the whole data part of the error response
        };
      }
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });
};

export default setupStorageHandlers;

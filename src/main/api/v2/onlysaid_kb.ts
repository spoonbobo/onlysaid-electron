// ... existing code ...
import { ipcMain } from 'electron'; // net removed
import { OnylsaidKBService } from '@/service/knowledge_base/onlysaid_kb';
import { IKnowledgeBaseRegisterArgs, IKnowledgeBase } from '@/../../types/KnowledgeBase/KnowledgeBase';
import onlysaidServiceInstance from './service'; // Added
import axios, { AxiosError } from 'axios'; // Added

const KB_BASE_URL = process.env.KB_BASE_URL || 'http://onlysaid-dev.com/api/kb/';
const kbService = new OnylsaidKBService(KB_BASE_URL);

// Argument Interfaces for IPC Handlers
interface IKBCreateArgs {
  workspaceId: string;
  kbData: IKnowledgeBaseRegisterArgs;
  token: string;
}

interface IKBGetArgs {
  workspaceId: string;
  kbId: string;
  token: string;
}

interface IKBUpdateArgs {
  workspaceId: string;
  kbId: string;
  kbUpdateData: any;
  token: string;
}

interface IKBDeleteArgs {
  workspaceId: string;
  kbId: string;
  token: string;
}

// Types for existing handlers that are not being changed to use onlysaidServiceInstance directly with token
// but good to have clarity on their existing signatures if we were to modify them.
interface IKBListArgs {
  workspaceId: string;
  token: string;
}

interface IKBQueryArgs {
  query: string;
  workspaceId: string;
  // token?: string; // If kbService.queryKnowledgeBase were to require a token
}

// Helper function for error handling (optional, can be inlined)
function handleAxiosError(error: any, context: string, method?: string, url?: string, requestData?: any): Error {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    const apiEndpoint = `${method?.toUpperCase() || ''} ${axiosError.config?.baseURL || ''}${axiosError.config?.url || url || ''}`;

    console.error(
      `Error ${context} via API (${apiEndpoint}). Status: ${status}, Response:`, responseData,
      requestData ? `Request Body: ${JSON.stringify(requestData)}` : ''
    );
    const message = responseData?.error || responseData?.message || `Failed to ${context.toLowerCase()} (status ${status})`;
    return new Error(message);
  } else {
    console.error(`Unexpected error ${context}:`, error);
    return error instanceof Error ? error : new Error(`An unexpected error occurred while ${context.toLowerCase()}`);
  }
}


export function initializeKnowledgeBaseHandlers(): void {
  ipcMain.handle('kb:list', async (event, args: IKBListArgs) => {
    const { workspaceId, token } = args;
    if (!token) {
      console.error('Error listing knowledge bases: Token is missing');
      throw new Error('Authentication token is required to list knowledge bases.');
    }
    try {
      const response = await onlysaidServiceInstance.get<IKnowledgeBase[]>(
        `workspace/${workspaceId}/kb`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error, 'listing knowledge bases', 'GET', `workspace/${workspaceId}/kb`);
    }
  });

  ipcMain.handle('kb:query', async (event, query: string, workspaceId: string) => {
    try {
      const results = await kbService.queryKnowledgeBase(query, workspaceId);
      return results;
    } catch (error) {
      console.error('Error querying knowledge base:', error);
      throw error instanceof Error ? error : new Error('Failed to query knowledge base');
    }
  });

  ipcMain.handle('kb:create', async (event, args: IKBCreateArgs) => {
    const { workspaceId, kbData, token } = args;
    try {
      const response = await onlysaidServiceInstance.post(
        `workspace/${workspaceId}/kb`,
        kbData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error, 'creating knowledge base', 'POST', `workspace/${workspaceId}/kb`, kbData);
    }
  });

  ipcMain.handle('kb:get', async (event, args: IKBGetArgs) => {
    console.log("kb:get", args);
    const { workspaceId, kbId, token } = args;
    const relativeUrl = `workspace/${workspaceId}/kb/${kbId}`;
    try {
      const response = await onlysaidServiceInstance.get(relativeUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error, `getting knowledge base ${kbId}`, 'GET', relativeUrl);
    }
  });

  ipcMain.handle('kb:update', async (event, args: IKBUpdateArgs) => {
    const { workspaceId, kbId, kbUpdateData, token } = args;
    const relativeUrl = `workspace/${workspaceId}/kb/${kbId}`;
    try {
      const response = await onlysaidServiceInstance.put(relativeUrl, kbUpdateData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error, `updating knowledge base ${kbId}`, 'PUT', relativeUrl, kbUpdateData);
    }
  });

  ipcMain.handle('kb:delete', async (event, args: IKBDeleteArgs) => {
    const { workspaceId, kbId, token } = args;
    const relativeUrl = `workspace/${workspaceId}/kb/${kbId}`;
    try {
      await onlysaidServiceInstance.delete(relativeUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return { success: true, id: kbId, message: `Knowledge base ${kbId} deleted successfully.` };
    } catch (error) {
      throw handleAxiosError(error, `deleting knowledge base ${kbId}`, 'DELETE', relativeUrl);
    }
  });
}
import { ipcMain } from 'electron';
import { OnylsaidKBService } from '@/service/knowledge_base/onlysaid_kb';
import {
  IKnowledgeBase,
  IKnowledgeBaseRegisterArgs,
  IKBListIPCArgs,
  IKBCreateIPCArgs,
  IKBGetIPCArgs,
  IKBUpdateIPCArgs,
  IKBDeleteIPCArgs,
  IKBViewIPCArgs,
  IKBRegisterIPCArgs,
  IKBGetStatusIPCArgs,
  IKBSynchronizeIPCArgs,
  IKBFullUpdateIPCArgs
} from '@/../../types/KnowledgeBase/KnowledgeBase';
import onlysaidServiceInstance from './service';
import axios, { AxiosError } from 'axios';

const KB_BASE_URL = process.env.KB_BASE_URL || 'http://onlysaid-dev.com/api/kb/';
const kbService = new OnylsaidKBService(KB_BASE_URL);

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
  ipcMain.handle('kb:list', async (event, args: IKBListIPCArgs) => {
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

  ipcMain.handle('kb:create', async (event, args: IKBCreateIPCArgs) => {
    const { kbData, token } = args;
    const workspaceId = kbData.workspace_id;
    if (!token) {
      console.error('Error creating knowledge base: Token is missing');
      throw new Error('Authentication token is required to create a knowledge base.');
    }
    if (!workspaceId) {
      console.error('Error creating knowledge base: workspace_id is missing in kbData');
      throw new Error('Workspace ID is required to create a knowledge base.');
    }
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

  ipcMain.handle('kb:get', async (event, args: IKBGetIPCArgs) => {
    console.log("kb:get", args);
    const { workspaceId, kbId, token } = args;
    if (!token) {
      console.error(`Error getting knowledge base ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
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

  ipcMain.handle('kb:update', async (event, args: IKBUpdateIPCArgs) => {
    const { workspaceId, kbId, kbUpdateData, token } = args;
    if (!token) {
      console.error(`Error updating knowledge base ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
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

  ipcMain.handle('kb:delete', async (event, args: IKBDeleteIPCArgs) => {
    const { workspaceId, kbId, token } = args;
    if (!token) {
      console.error(`Error deleting knowledge base ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
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

  ipcMain.handle('kb:register', async (event, args: IKBRegisterIPCArgs) => {
    const { kbData, token } = args;
    console.log('kb:register called with:', kbData, 'token:', token ? 'present' : 'missing');
    if (!token) {
      console.error('Error registering knowledge base: Token is missing');
      throw new Error('Authentication token is required for registering a knowledge base.');
    }
    try {
      const registeredKb = await kbService.registerKnowledgeBase(kbData as IKnowledgeBase);
      console.log('KB Registered via service:', registeredKb);
      return registeredKb;
    } catch (error) {
      throw handleAxiosError(error, 'registering knowledge base', 'POST', `${KB_BASE_URL}/register`, kbData);
    }
  });

  ipcMain.handle('kb:view', async (event, args: IKBViewIPCArgs) => {
    const { workspaceId } = args;
    try {
      const response = await kbService.viewKnowledgeBaseStructure(workspaceId);
      return response;
    } catch (error) {
      console.error(`Error viewing knowledge base structure for workspace ${workspaceId}:`, error);
      if (axios.isAxiosError(error)) {
        throw handleAxiosError(error, 'viewing knowledge base structure');
      }
      throw error instanceof Error ? error : new Error('Failed to view knowledge base structure');
    }
  });

  ipcMain.handle('kb:getStatus', async (event, args: IKBGetStatusIPCArgs) => {
    const { workspaceId, kbId, token } = args;
    console.log(`kb:getStatus called for KB ID: ${kbId} in Workspace: ${workspaceId}`, 'token:', token ? 'present' : 'missing');

    try {
      const status = await kbService.getKnowledgeBaseStatus(workspaceId, kbId);
      console.log(`KB Status for ${kbId} in workspace ${workspaceId}:`, status);
      return status;
    } catch (error) {

      const fullApiUrl = `${KB_BASE_URL}kb_status/${workspaceId}/${kbId}`;

      throw handleAxiosError(
        error,
        `getting status for knowledge base ${kbId}`,
        'GET',
        fullApiUrl
      );
    }
  });

  ipcMain.handle('kb:synchronize', async (event, args: IKBSynchronizeIPCArgs) => {
    try {
      const { workspaceId, kbId, token } = args;
      console.log(`kb:synchronize called for KB ID: ${kbId} in Workspace: ${workspaceId}`, 'token:', token ? 'present' : 'missing');
      if (!token) {
        throw new Error('Authentication token is required for synchronizing KB.');
      }
      const syncResult = {
        kbId: kbId,
        workspaceId: workspaceId,
        syncStatus: 'dummy_sync_COMPLETED',
        lastSynced: new Date().toISOString(),
        documentsProcessed: Math.floor(Math.random() * 100),
        message: 'Synchronization process initiated and completed (dummy).'
      };
      console.log('[DUMMY] KB Synchronized:', syncResult);
      return syncResult;
    } catch (error) {
      console.error('Error in kb:synchronize (dummy):', error);
      throw error instanceof Error ? error : new Error('Failed to synchronize KB (dummy)');
    }
  });

  ipcMain.handle('kb:fullUpdate', async (event, args: IKBFullUpdateIPCArgs) => {
    try {
      const { workspaceId, kbId, kbData, token } = args;
      console.log(`kb:fullUpdate called for KB ID: ${kbId} in Workspace: ${workspaceId}`, 'with data:', kbData, 'token:', token ? 'present' : 'missing');
      if (!token) {
        throw new Error('Authentication token is required for updating a knowledge base.');
      }
      if (kbId !== kbData.id) {
        console.warn(`Mismatch between kbId parameter (${kbId}) and kbData.id (${kbData.id}) in kb:fullUpdate. Using kbId parameter.`);
      }

      const updatedKb: IKnowledgeBase = {
        ...kbData,
        id: kbId,
        workspace_id: workspaceId,
        update_at: new Date().toISOString(),
      };
      console.log('[DUMMY] KB Full Update:', updatedKb);
      return updatedKb;
    } catch (error) {
      console.error('Error in kb:fullUpdate (dummy):', error);
      throw error instanceof Error ? error : new Error('Failed to perform full update on knowledge base (dummy)');
    }
  });
}
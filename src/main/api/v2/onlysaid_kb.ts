import { ipcMain } from 'electron';
import { LightRAGService } from '../../../service/knowledge_base/lightrag_kb';
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

// Define an updated interface for IKBViewIPCArgs if it doesn't already support kbId
interface IKBViewIPCArgsUpdated extends IKBViewIPCArgs {
  kbId?: string;
}

// Add new interface for KB member args
interface IKBMemberArgs {
  token: string;
  workspaceId: string;
  kbId: string;
  user_id?: string;
  role?: string;
}

// Add new interface for KB scan args
interface IKBScanIPCArgs {
  token: string;
  workspaceId: string;
  kbId: string;
}

const KB_BASE_URL = process.env.KB_BASE_URL || 'http://localhost:9621';
console.log('KB_BASE_URL', KB_BASE_URL);
const kbService = new LightRAGService(KB_BASE_URL);

// Add health check for LightRAG service
async function checkLightRAGHealth() {
  try {
    console.log('🏥 Checking LightRAG service health...');
    console.log('🔗 Testing URL:', `${KB_BASE_URL}/health`);
    
    const health = await kbService.getHealth();
    console.log('✅ LightRAG service is healthy:', health);
    return true;
  } catch (error: any) {
    console.error('❌ LightRAG service health check failed:', error.message);
    console.error('🔗 Attempted URL:', `${KB_BASE_URL}/health`);
    
    // More detailed error information
    if (error.code === 'ECONNREFUSED') {
      console.error('🚫 Connection refused - service may not be running');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 DNS resolution failed - check hostname');
    } else if (error.response?.status) {
      console.error(`📊 HTTP ${error.response.status} - ${error.response.statusText}`);
    }
    
    return false;
  }
}

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
  // Run health check on initialization
  checkLightRAGHealth().then(isHealthy => {
    if (!isHealthy) {
      console.warn('⚠️ LightRAG service is not available. Document upload and knowledge base features may not work.');
    }
  });

  // Add health check handler
  ipcMain.handle('kb:health-check', async () => {
    return await checkLightRAGHealth();
  });

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
    const { kbData } = args;

    try {
      const registeredKb = await kbService.registerKnowledgeBase(kbData as IKnowledgeBase);
      console.log('KB Registered via service:', registeredKb);
      return registeredKb;
    } catch (error) {
      throw handleAxiosError(error, 'registering knowledge base', 'POST', `${KB_BASE_URL}/register`, kbData);
    }
  });

  ipcMain.handle('kb:view', async (event, args: IKBViewIPCArgsUpdated) => {
    const { workspaceId, kbId } = args;
    try {
      const response = await kbService.viewKnowledgeBaseStructure(workspaceId, kbId);
      return response;
    } catch (error) {
      console.error(`Error viewing knowledge base structure for workspace ${workspaceId}${kbId ? ` and KB ${kbId}` : ''}:`, error);
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

  // ✅ NEW: KB document scan handler
  ipcMain.handle('kb:scan', async (event, args: IKBScanIPCArgs) => {
    const { workspaceId, kbId, token } = args;
    console.log(`kb:scan called for KB ID: ${kbId} in Workspace: ${workspaceId}`, 'token:', token ? 'present' : 'missing');

    if (!token) {
      throw new Error('Authentication token is required for scanning KB.');
    }

    try {
      const result = await kbService.scanDocuments();
      console.log(`KB scan successful for ${kbId} in workspace ${workspaceId}:`, result);
      return result;
    } catch (error) {
      const attemptedUrl = `${KB_BASE_URL}/documents/scan`;
      throw handleAxiosError(
        error,
        `scanning knowledge base ${kbId}`,
        'POST',
        attemptedUrl
      );
    }
  });

  // Update the existing kb:synchronize handler to use the new scan method
  ipcMain.handle('kb:synchronize', async (event, args: IKBSynchronizeIPCArgs) => {
    try {
      const { workspaceId, kbId, token } = args;
      console.log(`kb:synchronize called for KB ID: ${kbId} in Workspace: ${workspaceId}`, 'token:', token ? 'present' : 'missing');
      if (!token) {
        throw new Error('Authentication token is required for synchronizing KB.');
      }

      // Use the new scan method instead of dummy data
      const scanResult = await kbService.scanDocuments();
      
      // Transform the scan result to match the expected synchronize format
      const syncResult = {
        kbId: kbId,
        workspaceId: workspaceId,
        syncStatus: scanResult.status === 'scanning_started' ? 'COMPLETED' : 'ERROR',
        lastSynced: new Date().toISOString(),
        documentsProcessed: 0, // This info isn't available from scan endpoint
        message: scanResult.message
      };
      
      console.log('KB Synchronized:', syncResult);
      return syncResult;
    } catch (error) {
      console.error('Error in kb:synchronize:', error);
      throw error instanceof Error ? error : new Error('Failed to synchronize KB');
    }
  });

  ipcMain.handle('kb:fullUpdate', async (event, args: IKBFullUpdateIPCArgs) => {
    const { workspaceId, kbId, kbData /* token is in args but not used here */ } = args;

    // Construct the full IKnowledgeBase object.
    // Assumes args.kbData is Partial<IKnowledgeBase> and args.kbId, args.workspaceId are authoritative for those fields.
    const fullKbDataObject: IKnowledgeBase = {
      ...(kbData as Partial<IKnowledgeBase>), // Spread partial data
      id: kbId,                            // Set/override id
      workspace_id: workspaceId,           // Set/override workspace_id
    } as IKnowledgeBase; // Cast, assuming this now conforms to IKnowledgeBase

    console.log(`kb:fullUpdate calling kbService.updateKnowledgeBaseStatus for KB ID: ${fullKbDataObject.id} in Workspace: ${fullKbDataObject.workspace_id}`);

    try {
      const result = await kbService.updateKnowledgeBaseStatus(fullKbDataObject);
      console.log(`KB ${fullKbDataObject.id} status update successful:`, result);
      return result;
    } catch (error) {
      // Construct the approximate full URL that was attempted by kbService.updateKnowledgeBaseStatus
      // KB_BASE_URL already ends with a slash. 'update_kb_status' is the specific path segment.
      const attemptedUrl = `${KB_BASE_URL}update_kb_status`;
      throw handleAxiosError(
        error,
        `updating knowledge base status for ${kbId}`,
        'POST',
        attemptedUrl,
        fullKbDataObject
      );
    }
  });

  // ✅ Non-streaming KB query
  ipcMain.handle('kb:queryNonStreaming', async (event, args: {
    workspaceId: string;
    queryText: string;
    kbIds?: string[];
    model?: string;
    conversationHistory?: any[];
    topK?: number;
    preferredLanguage?: string;
    messageId?: string;
  }) => {
    const { workspaceId, queryText, kbIds, model, conversationHistory, topK, preferredLanguage, messageId } = args;
    
    console.log(`kb:queryNonStreaming called for workspace ${workspaceId}:`, {
      queryText: queryText?.substring(0, 50) + '...',
      kbIds,
      topK
    });

    try {
      const result = await kbService.queryKnowledgeBaseNonStreaming({
        workspaceId,
        queryText,
        kbIds,
        model,
        conversationHistory,
        topK,
        preferredLanguage,
        messageId,
      });
      
      console.log(`KB non-streaming query successful for workspace ${workspaceId}`);
      return result;
    } catch (error) {
      const attemptedUrl = `${KB_BASE_URL}query`;
      throw handleAxiosError(
        error,
        `querying knowledge base (non-streaming) for workspace ${workspaceId}`,
        'POST',
        attemptedUrl,
        args
      );
    }
  });

  // ✅ KB document retrieval
  ipcMain.handle('kb:retrieve', async (event, args: {
    workspaceId: string;
    queryText: string;
    kbIds?: string[];
    topK?: number;
  }) => {
    const { workspaceId, queryText, kbIds, topK } = args;
    
    console.log(`kb:retrieve called for workspace ${workspaceId}:`, {
      queryText: queryText?.substring(0, 50) + '...',
      kbIds,
      topK
    });

    try {
      const result = await kbService.retrieveFromKnowledgeBase({
        workspaceId,
        queryText,
        kbIds,
        topK,
      });
      
      console.log(`KB retrieval successful for workspace ${workspaceId}:`, result.results?.length || 0, 'documents');
      return result;
    } catch (error) {
      const attemptedUrl = `${KB_BASE_URL}retrieve`;
      throw handleAxiosError(
        error,
        `retrieving from knowledge base for workspace ${workspaceId}`,
        'POST',
        attemptedUrl,
        args
      );
    }
  });

  // KB Members Management Handlers
  ipcMain.handle('kb:get-members', async (event, args: IKBMemberArgs) => {
    const { workspaceId, kbId, token } = args;
    if (!token) {
      console.error(`Error getting KB members for ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
    try {
      const response = await onlysaidServiceInstance.get(
        `/v2/workspace/${workspaceId}/kb/${kbId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data.data;
    } catch (error) {
      throw handleAxiosError(error, `getting KB members for ${kbId}`, 'GET', `/v2/workspace/${workspaceId}/kb/${kbId}/members`);
    }
  });

  ipcMain.handle('kb:add-member', async (event, args: IKBMemberArgs) => {
    const { workspaceId, kbId, user_id, role = 'member', token } = args;
    if (!token) {
      console.error(`Error adding member to KB ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
    if (!user_id) {
      console.error(`Error adding member to KB ${kbId}: user_id is missing`);
      throw new Error('User ID is required.');
    }
    try {
      const response = await onlysaidServiceInstance.post(
        `/v2/workspace/${workspaceId}/kb/${kbId}/members`,
        { user_id, role },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data.data;
    } catch (error) {
      throw handleAxiosError(error, `adding member to KB ${kbId}`, 'POST', `/v2/workspace/${workspaceId}/kb/${kbId}/members`, { user_id, role });
    }
  });

  ipcMain.handle('kb:update-member-role', async (event, args: IKBMemberArgs) => {
    const { workspaceId, kbId, user_id, role, token } = args;
    if (!token) {
      console.error(`Error updating member role in KB ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
    if (!user_id || !role) {
      console.error(`Error updating member role in KB ${kbId}: user_id or role is missing`);
      throw new Error('User ID and role are required.');
    }
    try {
      const response = await onlysaidServiceInstance.put(
        `/v2/workspace/${workspaceId}/kb/${kbId}/members`,
        { user_id, role },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data.data;
    } catch (error) {
      throw handleAxiosError(error, `updating member role in KB ${kbId}`, 'PUT', `/v2/workspace/${workspaceId}/kb/${kbId}/members`, { user_id, role });
    }
  });

  ipcMain.handle('kb:remove-member', async (event, args: IKBMemberArgs) => {
    const { workspaceId, kbId, user_id, token } = args;
    if (!token) {
      console.error(`Error removing member from KB ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
    if (!user_id) {
      console.error(`Error removing member from KB ${kbId}: user_id is missing`);
      throw new Error('User ID is required.');
    }
    try {
      const response = await onlysaidServiceInstance.delete(
        `/v2/workspace/${workspaceId}/kb/${kbId}/members?user_id=${user_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data.data;
    } catch (error) {
      throw handleAxiosError(error, `removing member from KB ${kbId}`, 'DELETE', `/v2/workspace/${workspaceId}/kb/${kbId}/members?user_id=${user_id}`);
    }
  });

  // ✅ NEW: Add KB URL handler
  ipcMain.handle('kb:get-url', async () => {
    return KB_BASE_URL;
  });

  // ✅ NEW: Document Management Handlers
  ipcMain.handle('kb:get-documents', async (event, args: IKBScanIPCArgs) => {
    const { workspaceId, kbId, token } = args;
    if (!token) {
      console.error(`Error getting documents for KB ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
    
    try {
      console.log(`Getting documents for KB: ${kbId} in workspace ${workspaceId}`);
      
      // Use the existing listDocuments method and transform the response
      const documents = await kbService.listDocuments();
      
      // Transform to match expected structure
      const response = {
        documents: {
          PROCESSED: documents.map(doc => ({
            file_path: doc.id || doc.source || doc.path || 'unknown',
            status: 'PROCESSED' as const,
            total_chunks: doc.chunks?.length || 0,
            processed_chunks: doc.chunks?.length || 0,
            failed_chunks: 0,
            last_modified: doc.last_modified || new Date().toISOString(),
            file_size: doc.size || 0
          })),
          PENDING: [],
          PROCESSING: [],
          FAILED: []
        }
      };
      
      console.log(`Documents retrieved successfully for KB ${kbId}:`, documents.length, 'documents');
      return response;
    } catch (error) {
      console.error(`Error getting documents for KB ${kbId}:`, error);
      throw handleAxiosError(
        error,
        `getting documents for KB ${kbId}`,
        'GET',
        `${KB_BASE_URL}/documents`,
        args
      );
    }
  });

  ipcMain.handle('kb:upload-document', async (event, args: { workspaceId: string; kbId: string; token: string; file: any; onProgress?: (progress: number) => void }) => {
    const { workspaceId, kbId, token, file, onProgress } = args;
    if (!token) {
      console.error(`Error uploading document to KB ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
    
    try {
      console.log(`Uploading document ${file.name} to KB: ${kbId} in workspace ${workspaceId}`);
      
      // Simulate progress updates
      const progressCallback = onProgress || (() => {});
      progressCallback(25);
      
      // Create a File-like object for the LightRAG service
      const fileBlob = new File([file.buffer || file.data], file.name, { type: file.type || 'application/octet-stream' });
      
      progressCallback(50);
      
      // Use the existing insertFile method
      const response = await kbService.insertFile(fileBlob);
      
      progressCallback(100);
      console.log(`Document ${file.name} uploaded successfully to KB ${kbId}`);
      return { status: 'success', message: `File ${file.name} uploaded successfully`, data: response };
    } catch (error) {
      console.error(`Error uploading document ${file.name} to KB ${kbId}:`, error);
      throw handleAxiosError(
        error,
        `uploading document ${file.name} to KB ${kbId}`,
        'POST',
        `${KB_BASE_URL}/documents/upload`,
        { fileName: file.name, kbId, workspaceId }
      );
    }
  });

  ipcMain.handle('kb:delete-document', async (event, args: { workspaceId: string; kbId: string; token: string; filePath: string }) => {
    const { workspaceId, kbId, token, filePath } = args;
    if (!token) {
      console.error(`Error deleting document from KB ${kbId}: Token is missing`);
      throw new Error('Authentication token is required.');
    }
    
    try {
      console.log(`Deleting document ${filePath} from KB: ${kbId} in workspace ${workspaceId}`);
      
      // Extract document ID from filePath (if needed)
      const docId = filePath.split('/').pop() || filePath;
      const response = await kbService.deleteDocument(docId);
      
      console.log(`Document ${filePath} deleted successfully from KB ${kbId}`);
      return { status: 'success', message: `Document ${filePath} deleted successfully`, data: response };
    } catch (error) {
      console.error(`Error deleting document ${filePath} from KB ${kbId}:`, error);
      throw handleAxiosError(
        error,
        `deleting document ${filePath} from KB ${kbId}`,
        'DELETE',
        `${KB_BASE_URL}/documents`,
        { filePath, kbId, workspaceId }
      );
    }
  });
}
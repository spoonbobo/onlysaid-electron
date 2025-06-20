import { ipcMain } from 'electron';
import axios from 'axios';

export interface N8nTestConnectionArgs {
  apiUrl: string;
  apiKey: string;
}

export interface N8nTestConnectionResult {
  success: boolean;
  error?: string;
}

export function setupN8nHandlers() {
  // Test connection handler
  ipcMain.handle('n8n:test-connection', async (event, args: N8nTestConnectionArgs): Promise<N8nTestConnectionResult> => {
    try {
      let cleanUrl = args.apiUrl.replace(/\/+$/, '');
      if (!cleanUrl.includes('/api/v1')) {
        cleanUrl = cleanUrl + '/api/v1';
      }

      const response = await axios.get(`${cleanUrl}/workflows`, {
        headers: {
          'X-N8N-API-KEY': args.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return { success: true };
    } catch (error) {
      console.error('[N8n] Connection test error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return { success: false, error: 'Invalid API key. Please check your N8n API key.' };
        } else if (error.response?.status === 404) {
          return { success: false, error: 'Invalid API URL. Please check your N8n API URL.' };
        } else if (error.code === 'ECONNREFUSED') {
          return { success: false, error: 'Connection refused. Please check if N8n is running.' };
        } else if (error.code === 'ETIMEDOUT') {
          return { success: false, error: 'Connection timeout. Please check your network.' };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to test N8n connection' 
      };
    }
  });

  // Get workflows handler
  ipcMain.handle('n8n:get-workflows', async (event, args: N8nTestConnectionArgs) => {
    try {
      let cleanUrl = args.apiUrl.replace(/\/+$/, '');
      if (!cleanUrl.includes('/api/v1')) {
        cleanUrl = cleanUrl + '/api/v1';
      }

      console.log('[N8n] Fetching workflows from:', `${cleanUrl}/workflows`);

      const response = await axios.get(`${cleanUrl}/workflows`, {
        headers: {
          'X-N8N-API-KEY': args.apiKey,
          'Accept': 'application/json',
        },
        timeout: 10000
      });

      console.log('[N8n] Workflows response:', response.data);

      // Transform the data to match our interface
      const workflows = (response.data.data || []).map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        tags: workflow.tags || [],
        // Note: N8n API doesn't provide execution times in workflow list
        // You'd need separate API calls for execution history
      }));

      return { 
        success: true, 
        workflows 
      };
    } catch (error) {
      console.error('[N8n] Get workflows error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return { success: false, error: 'Invalid API key' };
        } else if (error.response?.status === 404) {
          return { success: false, error: 'Workflows endpoint not found' };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get workflows' 
      };
    }
  });

  // Toggle workflow handler
  ipcMain.handle('n8n:toggle-workflow', async (event, args: any) => {
    try {
      let cleanUrl = args.apiUrl.replace(/\/+$/, '');
      if (!cleanUrl.includes('/api/v1')) {
        cleanUrl = cleanUrl + '/api/v1';
      }

      console.log('[N8n] Toggling workflow:', args.workflowId, 'to', args.active);

      const response = await axios.patch(`${cleanUrl}/workflows/${args.workflowId}`, 
        { active: args.active },
        {
          headers: {
            'X-N8N-API-KEY': args.apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return { success: true, workflow: response.data };
    } catch (error) {
      console.error('[N8n] Toggle workflow error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to toggle workflow' 
      };
    }
  });
} 
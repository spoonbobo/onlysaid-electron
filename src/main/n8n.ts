import { ipcMain } from 'electron';
import axios from 'axios';
import { N8nWorkflow } from '@/../../types/Workflow/n8n';

export interface N8nTestConnectionArgs {
  apiUrl: string;
  apiKey: string;
}

export interface N8nTestConnectionResult {
  success: boolean;
  error?: string;
}

export interface N8nCreateWorkflowArgs extends N8nTestConnectionArgs {
  workflow: N8nWorkflow;
}

export interface N8nCreateWorkflowResult {
  success: boolean;
  workflowId?: string;
  error?: string;
}

// ✅ NEW: Add proper interface for delete workflow args
export interface N8nDeleteWorkflowArgs extends N8nTestConnectionArgs {
  workflowId: string;
}

// ✅ NEW: Add proper interface for delete workflow result
export interface N8nDeleteWorkflowResult {
  success: boolean;
  workflow?: N8nWorkflow; // Return the deleted workflow object as per N8n API spec
  error?: string;
}

// ✅ NEW: Add interface for get workflow args
export interface N8nGetWorkflowArgs extends N8nTestConnectionArgs {
  workflowId: string;
}

// ✅ NEW: Add interface for get workflow result  
export interface N8nGetWorkflowResult {
  success: boolean;
  workflow?: N8nWorkflow;
  error?: string;
}

// ✅ NEW: Add interface for toggle workflow args
export interface N8nToggleWorkflowArgs extends N8nTestConnectionArgs {
  workflowId: string;
  active: boolean;
}

// ✅ NEW: Add interface for toggle workflow result
export interface N8nToggleWorkflowResult {
  success: boolean;
  workflow?: N8nWorkflow;
  error?: string;
}

// Add new interface for activate workflow args
export interface N8nActivateWorkflowArgs extends N8nTestConnectionArgs {
  workflowId: string;
}

// Add new interface for activate workflow result
export interface N8nActivateWorkflowResult {
  success: boolean;
  workflow?: N8nWorkflow;
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

  // Create workflow handler  
ipcMain.handle('n8n:create-workflow', async (event, args: N8nCreateWorkflowArgs): Promise<N8nCreateWorkflowResult> => {
  try {
    let cleanUrl = args.apiUrl.replace(/\/+$/, '');
    
    // Ensure we're using the correct API URL format
    if (!cleanUrl.includes('/api/v1')) {
      cleanUrl = cleanUrl + '/api/v1';
    }
    
    // Ensure HTTPS if the domain suggests it (onlysaid.com should use HTTPS)
    if (cleanUrl.includes('onlysaid.com') && cleanUrl.startsWith('http://')) {
      cleanUrl = cleanUrl.replace('http://', 'https://');
      console.log('[N8n] Converted to HTTPS:', cleanUrl);
    }

    // ✅ REMOVE: Don't set active in creation payload - it's read-only
    const workflowToCreate = {
      ...args.workflow
      // Remove active property as it's read-only during creation
    };
    delete workflowToCreate.active; // Ensure it's not included

    console.log('[N8n] Creating workflow:', workflowToCreate.name);
    console.log('[N8n] Request URL:', `${cleanUrl}/workflows`);
    console.log('[N8n] API Key present:', !!args.apiKey);

    const response = await axios.post(`${cleanUrl}/workflows`, workflowToCreate, {
      headers: {
        'X-N8N-API-KEY': args.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => {
        console.log('[N8n] Response status:', status);
        return status >= 200 && status < 400;
      }
    });

    console.log('[N8n] Full response status:', response.status);
    console.log('[N8n] Full response data:', JSON.stringify(response.data, null, 2));

    // According to N8n docs, the response should be the workflow object directly with an 'id' field
    const workflowId = response.data?.id;
    
    if (!workflowId) {
      console.warn('[N8n] Warning: No workflow ID found in response.');
      return { 
        success: false, 
        error: 'Workflow creation failed: No workflow ID returned in response. Please check the workflow structure and N8n server logs.' 
      };
    }

    console.log('[N8n] Workflow created successfully with ID:', workflowId);

    return { 
      success: true, 
      workflowId: workflowId 
    };
  } catch (error) {
    console.error('[N8n] Create workflow error:', error);
    
    if (axios.isAxiosError(error)) {
      console.log('[N8n] Error response data:', error.response?.data);
      console.log('[N8n] Error response status:', error.response?.status);
      
      if (error.response?.status === 401) {
        return { success: false, error: 'Invalid API key or missing API key header' };
      } else if (error.response?.status === 400) {
        return { success: false, error: `Bad request: ${JSON.stringify(error.response?.data)}` };
      } else if (error.response?.status === 422) {
        return { success: false, error: `Validation error: ${JSON.stringify(error.response?.data)}` };
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create workflow' 
    };
  }
});

  // ✅ NEW: Add workflow activation handler using POST /workflows/{id}/activate
  ipcMain.handle('n8n:activate-workflow', async (event, args: N8nActivateWorkflowArgs): Promise<N8nActivateWorkflowResult> => {
    try {
      // Validate input parameters
      if (!args.workflowId || typeof args.workflowId !== 'string') {
        return { 
          success: false, 
          error: 'Workflow ID is required and must be a string' 
        };
      }

      let cleanUrl = args.apiUrl.replace(/\/+$/, '');
      if (!cleanUrl.includes('/api/v1')) {
        cleanUrl = cleanUrl + '/api/v1';
      }

      // Ensure HTTPS if needed
      if (cleanUrl.includes('onlysaid.com') && cleanUrl.startsWith('http://')) {
        cleanUrl = cleanUrl.replace('http://', 'https://');
      }

      console.log('[N8n] Activating workflow:', args.workflowId);
      console.log('[N8n] Request URL:', `${cleanUrl}/workflows/${args.workflowId}/activate`);

      const response = await axios.post(`${cleanUrl}/workflows/${args.workflowId}/activate`, {}, {
        headers: {
          'X-N8N-API-KEY': args.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('[N8n] Activate response status:', response.status);
      console.log('[N8n] Activate response data:', JSON.stringify(response.data, null, 2));

      // Validate response structure
      if (!response.data || !response.data.id) {
        console.warn('[N8n] Warning: Invalid activation response structure');
        return { 
          success: false, 
          error: 'Invalid response from N8n server during activation' 
        };
      }

      console.log('[N8n] Workflow activated successfully:', response.data.id);
      return { 
        success: true, 
        workflow: response.data 
      };
    } catch (error) {
      console.error('[N8n] Activate workflow error:', error);
      
      if (axios.isAxiosError(error)) {
        console.log('[N8n] Error response status:', error.response?.status);
        console.log('[N8n] Error response data:', error.response?.data);
        
        if (error.response?.status === 401) {
          return { success: false, error: 'Unauthorized: Invalid API key' };
        } else if (error.response?.status === 404) {
          return { success: false, error: 'Workflow not found' };
        } else if (error.response?.status === 400) {
          return { success: false, error: `Bad request: ${JSON.stringify(error.response?.data)}` };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to activate workflow' 
      };
    }
  });

  // ✅ FIXED: Toggle workflow handler with proper types
  ipcMain.handle('n8n:toggle-workflow', async (event, args: N8nToggleWorkflowArgs): Promise<N8nToggleWorkflowResult> => {
    try {
      let cleanUrl = args.apiUrl.replace(/\/+$/, '');
      if (!cleanUrl.includes('/api/v1')) {
        cleanUrl = cleanUrl + '/api/v1';
      }

      // Ensure HTTPS if needed
      if (cleanUrl.includes('onlysaid.com') && cleanUrl.startsWith('http://')) {
        cleanUrl = cleanUrl.replace('http://', 'https://');
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

      console.log('[N8n] Toggle response status:', response.status);
      console.log('[N8n] Toggle response data:', response.data);

      // Validate response structure
      if (!response.data || !response.data.id) {
        console.warn('[N8n] Warning: Invalid toggle response structure');
        return { 
          success: false, 
          error: 'Invalid response from N8n server' 
        };
      }

      return { 
        success: true, 
        workflow: response.data 
      };
    } catch (error) {
      console.error('[N8n] Toggle workflow error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return { success: false, error: 'Invalid API key' };
        } else if (error.response?.status === 404) {
          return { success: false, error: 'Workflow not found' };
        } else if (error.response?.status === 400) {
          return { success: false, error: `Bad request: ${JSON.stringify(error.response?.data)}` };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to toggle workflow' 
      };
    }
  });

  // ✅ COMPLETELY FIXED: Delete workflow handler with proper types and validation
  ipcMain.handle('n8n:delete-workflow', async (event, args: N8nDeleteWorkflowArgs): Promise<N8nDeleteWorkflowResult> => {
    try {
      // Validate input parameters
      if (!args.workflowId || typeof args.workflowId !== 'string') {
        return { 
          success: false, 
          error: 'Workflow ID is required and must be a string' 
        };
      }

      if (!args.apiUrl || !args.apiKey) {
        return { 
          success: false, 
          error: 'API URL and API Key are required' 
        };
      }

      let cleanUrl = args.apiUrl.replace(/\/+$/, '');
      if (!cleanUrl.includes('/api/v1')) {
        cleanUrl = cleanUrl + '/api/v1';
      }

      // Ensure HTTPS if needed
      if (cleanUrl.includes('onlysaid.com') && cleanUrl.startsWith('http://')) {
        cleanUrl = cleanUrl.replace('http://', 'https://');
      }

      console.log('[N8n] Deleting workflow:', args.workflowId);
      console.log('[N8n] Request URL:', `${cleanUrl}/workflows/${args.workflowId}`);

      const response = await axios.delete(`${cleanUrl}/workflows/${args.workflowId}`, {
        headers: {
          'X-N8N-API-KEY': args.apiKey,
          'Accept': 'application/json',
        },
        timeout: 10000,
        // Validate response status codes
        validateStatus: (status) => {
          // Accept 200 (success) and 404 (not found) as valid responses
          return status === 200 || status === 404 || status === 401;
        }
      });

      console.log('[N8n] Delete response status:', response.status);
      console.log('[N8n] Delete response data:', JSON.stringify(response.data, null, 2));

      // Handle different response scenarios according to N8n API specification
      if (response.status === 200) {
        // According to N8n API spec, successful deletion returns the deleted workflow object
        if (!response.data || !response.data.id) {
          console.warn('[N8n] Warning: Expected workflow object with ID in delete response');
          console.warn('[N8n] Response structure:', Object.keys(response.data || {}));
          
          // Still consider it successful if we got a 200, but log the issue
          return { 
            success: true,
            workflow: response.data, // Return whatever we got
            error: undefined
          };
        }

        console.log('[N8n] Workflow deleted successfully:', response.data.id);
        return { 
          success: true, 
          workflow: response.data // Return the deleted workflow object as per N8n API spec
        };
      } else if (response.status === 404) {
        // Workflow not found - this is still a "successful" deletion from user perspective
        console.log('[N8n] Workflow not found during deletion (404)');
        return { 
          success: false, 
          error: 'Workflow not found' 
        };
      } else {
        // This shouldn't happen due to validateStatus, but handle it anyway
        return { 
          success: false, 
          error: `Unexpected response status: ${response.status}` 
        };
      }

    } catch (error) {
      console.error('[N8n] Delete workflow error:', error);
      
      if (axios.isAxiosError(error)) {
        console.log('[N8n] Error response status:', error.response?.status);
        console.log('[N8n] Error response data:', error.response?.data);
        console.log('[N8n] Request URL was:', error.config?.url);
        
        if (error.response?.status === 401) {
          return { 
            success: false, 
            error: 'Unauthorized: Invalid API key or insufficient permissions' 
          };
        } else if (error.response?.status === 404) {
          return { 
            success: false, 
            error: 'Workflow not found' 
          };
        } else if (error.response?.status === 400) {
          return { 
            success: false, 
            error: `Bad request: ${JSON.stringify(error.response?.data)}` 
          };
        } else if (error.response?.status === 403) {
          return { 
            success: false, 
            error: 'Forbidden: You do not have permission to delete this workflow' 
          };
        } else if (error.code === 'ECONNREFUSED') {
          return { 
            success: false, 
            error: 'Connection refused: N8n server is not reachable' 
          };
        } else if (error.code === 'ETIMEDOUT') {
          return { 
            success: false, 
            error: 'Request timeout: N8n server did not respond in time' 
          };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete workflow' 
      };
    }
  });

  // ✅ FIXED: Get single workflow handler with proper types
  ipcMain.handle('n8n:get-workflow', async (event, args: N8nGetWorkflowArgs): Promise<N8nGetWorkflowResult> => {
    try {
      // Validate input parameters
      if (!args.workflowId || typeof args.workflowId !== 'string') {
        return { 
          success: false, 
          error: 'Workflow ID is required and must be a string' 
        };
      }

      let cleanUrl = args.apiUrl.replace(/\/+$/, '');
      if (!cleanUrl.includes('/api/v1')) {
        cleanUrl = cleanUrl + '/api/v1';
      }
      
      // Ensure HTTPS if needed
      if (cleanUrl.includes('onlysaid.com') && cleanUrl.startsWith('http://')) {
        cleanUrl = cleanUrl.replace('http://', 'https://');
      }

      console.log('[N8n] Getting workflow:', args.workflowId);

      const response = await axios.get(`${cleanUrl}/workflows/${args.workflowId}`, {
        headers: {
          'X-N8N-API-KEY': args.apiKey,
          'Accept': 'application/json',
        },
        timeout: 10000
      });

      console.log('[N8n] Get workflow response status:', response.status);
      console.log('[N8n] Get workflow response data keys:', Object.keys(response.data || {}));

      // Validate response structure
      if (!response.data || !response.data.id) {
        return { 
          success: false, 
          error: 'Invalid workflow data received from N8n server' 
        };
      }

      return { 
        success: true, 
        workflow: response.data 
      };
    } catch (error) {
      console.error('[N8n] Get workflow error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return { success: false, error: 'Invalid API key' };
        } else if (error.response?.status === 404) {
          return { success: false, error: 'Workflow not found' };
        } else if (error.response?.status === 400) {
          return { success: false, error: `Bad request: ${JSON.stringify(error.response?.data)}` };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get workflow' 
      };
    }
  });
} 
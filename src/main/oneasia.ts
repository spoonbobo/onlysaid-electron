import axios from "axios";
import { ipcMain } from 'electron';

export class OneasiaVLLMService {
  private readonly baseURL: string;

  constructor(baseURL: string = "https://vllm.oasishpc.hk") {
    this.baseURL = baseURL;
  }

  async authenticate(apiKey: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/v1/models`, {
        headers: {
          apiKey: apiKey
        },
        timeout: 10000 // 10 second timeout
      });

      console.log('[Oneasia] Authentication successful:', response.status);
      return response.status === 200 && response.data;
    } catch (error) {
      console.error('[Oneasia] Authentication failed:', error);
      return false;
    }
  }

  async getModels(apiKey: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/v1/models`, {
        headers: {
          apiKey: apiKey
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('[Oneasia] Failed to fetch models:', error);
      return [];
    }
  }
}

// Initialize the service
const oneasiaService = new OneasiaVLLMService();

// Setup IPC handlers
export function setupOneasiaHandlers() {
  console.log('[Main] Setting up Oneasia vLLM handlers...');

  ipcMain.handle('oneasia:authenticate', async (_event, apiKey: string) => {
    try {
      console.log('[Main] Oneasia authentication request received');
      const result = await oneasiaService.authenticate(apiKey);
      console.log('[Main] Oneasia authentication result:', result);
      return result;
    } catch (error) {
      console.error('[Main] Oneasia authentication error:', error);
      return false;
    }
  });

  ipcMain.handle('oneasia:get-models', async (_event, apiKey: string) => {
    try {
      console.log('[Main] Oneasia get models request received');
      const models = await oneasiaService.getModels(apiKey);
      console.log('[Main] Oneasia models fetched:', models.length);
      return models;
    } catch (error) {
      console.error('[Main] Oneasia get models error:', error);
      return [];
    }
  });

  console.log('[Main] Oneasia vLLM handlers set up successfully');
}

import { ipcMain } from 'electron';
import { OSSwarmFactory } from './factory';
import { LangChainAgentOptions } from '../agent';
import { OSSwarmLimits } from './core';

export function setupOSSwarmHandlers() {
  console.log('[OSSwarm] Setting up IPC handlers...');

  // Execute OSSwarm task
  ipcMain.handle('osswarm:execute_task', async (event, { task, options, limits }) => {
    console.log('[OSSwarm] osswarm:execute_task received:', {
      task: task?.substring(0, 100) + '...',
      provider: options?.provider,
      model: options?.model,
    });

    try {
      if (!task || !options) {
        throw new Error('Task and options are required for OSSwarm execution.');
      }

      const langChainOptions: LangChainAgentOptions = {
        model: options.model,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens,
        provider: options.provider,
        apiKeys: options.apiKeys || {},
        ollamaConfig: options.ollamaConfig,
        tools: options.tools,
        systemPrompt: options.systemPrompt,
      };

      const swarmLimits: Partial<OSSwarmLimits> = limits || {};

      // Create swarm
      const swarm = await OSSwarmFactory.createSwarm(langChainOptions, swarmLimits);

      // Execute task with streaming updates
      const result = await swarm.executeTask(task, (update: string) => {
        // Send streaming updates to renderer
        event.sender.send('osswarm:stream_update', { update });
      });

      return { success: true, result: result.result, error: result.error };
    } catch (error: any) {
      console.error('[OSSwarm] Error in osswarm:execute_task:', error);
      return { success: false, error: error.message };
    }
  });

  // Get swarm status
  ipcMain.handle('osswarm:get_status', async () => {
    try {
      return { success: true, cacheSize: OSSwarmFactory.getCacheSize() };
    } catch (error: any) {
      console.error('[OSSwarm] Error getting status:', error);
      return { success: false, error: error.message };
    }
  });

  // Clear swarm cache
  ipcMain.handle('osswarm:clear_cache', async () => {
    try {
      const cacheSize = OSSwarmFactory.getCacheSize();
      OSSwarmFactory.clearCache();
      console.log(`[OSSwarm] Cleared cache with ${cacheSize} instances`);
      return { success: true, clearedInstances: cacheSize };
    } catch (error: any) {
      console.error('[OSSwarm] Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[OSSwarm] IPC handlers set up successfully');
} 
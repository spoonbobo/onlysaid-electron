import { ipcMain } from 'electron';
import { OSSwarmFactory } from './factory';
import { LangChainAgentOptions } from '../agent';
import { OSSwarmLimits } from './core';

export function setupOSSwarmHandlers() {
  console.log('[OSSwarm] Setting up IPC handlers...');

  // Execute OSSwarm task with human-in-the-loop
  ipcMain.handle('osswarm:execute_task', async (event, { task, options, limits }) => {
    console.log('[OSSwarm] osswarm:execute_task received:', {
      task: task?.substring(0, 100) + '...',
      provider: options?.provider,
      model: options?.model,
      toolsCount: options?.tools?.length || 0
    });

    try {
      if (!task || !options) {
        const error = 'Task and options are required for OSSwarm execution.';
        console.error('[OSSwarm]', error);
        return { success: false, error };
      }

      // ✅ Store the webContents for OSSwarm core to use
      (global as any).osswarmWebContents = event.sender;
      console.log('[OSSwarm] Stored webContents for tool execution');

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

      console.log('[OSSwarm] Creating swarm with options:', {
        model: langChainOptions.model,
        provider: langChainOptions.provider,
        toolsCount: langChainOptions.tools?.length || 0,
        hasSystemPrompt: !!langChainOptions.systemPrompt
      });

      const swarmLimits: Partial<OSSwarmLimits> = limits || {};

      // Create swarm with human-in-the-loop enabled
      const swarm = await OSSwarmFactory.createSwarm(langChainOptions, swarmLimits, true);
      console.log('[OSSwarm] Swarm created successfully');

      // Execute task with streaming updates
      console.log('[OSSwarm] Starting task execution...');
      const result = await swarm.executeTask(task, (update: string) => {
        console.log('[OSSwarm] Stream update:', update);
        event.sender.send('osswarm:stream_update', { update });
      });

      console.log('[OSSwarm] Task execution completed:', {
        success: result.success,
        hasResult: !!result.result,
        hasError: !!result.error,
        resultLength: result.result?.length || 0
      });

      return { success: true, result: result.result, error: result.error };
    } catch (error: any) {
      console.error('[OSSwarm] Critical error in osswarm:execute_task:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  });

  // Handle human approval responses
  ipcMain.handle('osswarm:approve_tool', async (event, { approvalId, approved }) => {
    console.log(`[OSSwarm] 🔧 Approval handler called at ${Date.now()}:`, {
      approvalId,
      approved,
      hasApprovalId: !!approvalId,
      approvedType: typeof approved
    });
    
    try {
      // Find the swarm instance and handle approval
      const swarm = OSSwarmFactory.getCurrentSwarm();
      console.log(`[OSSwarm] 🔧 Current swarm lookup:`, {
        hasSwarm: !!swarm,
        isInitialized: swarm?.isInitialized?.(),
        swarmType: typeof swarm,
        timestamp: Date.now()
      });
      
      if (swarm && swarm.isInitialized()) {
        console.log(`[OSSwarm] 🔧 Forwarding approval to swarm: ${approvalId} = ${approved}`);
        console.log(`[OSSwarm] 🔧 About to call swarm.handleApprovalResponse...`);
        
        swarm.handleApprovalResponse(approvalId, approved);
        
        console.log(`[OSSwarm] 🔧 Approval forwarded successfully at ${Date.now()}`);
        return { success: true, timestamp: Date.now() };
      } else {
        console.error('[OSSwarm] 🔧 No active swarm found or swarm not initialized:', {
          hasSwarm: !!swarm,
          isInitialized: swarm?.isInitialized?.(),
          timestamp: Date.now()
        });
        return { success: false, error: 'No active swarm found', timestamp: Date.now() };
      }
    } catch (error: any) {
      console.error('[OSSwarm] 🔧 Error in osswarm:approve_tool:', {
        message: error.message,
        stack: error.stack,
        approvalId,
        approved,
        timestamp: Date.now()
      });
      return { success: false, error: error.message, timestamp: Date.now() };
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
import { ipcMain } from 'electron';
import { OSSwarmFactory } from './factory';
import { LangChainAgentOptions } from '../agent';
import { OSSwarmLimits } from './core';

export function setupOSSwarmHandlers() {
  console.log('[OSSwarm] Setting up IPC handlers...');

  // Execute OSSwarm task with human-in-the-loop
  ipcMain.handle('osswarm:execute_task', async (event, { task, options, limits, chatId, workspaceId }) => {
    console.log('[OSSwarm] osswarm:execute_task received:', {
      task: task?.substring(0, 100) + '...',
      provider: options?.provider,
      model: options?.model,
      toolsCount: options?.tools?.length || 0,
      chatId,
      workspaceId
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

      const { chatId, workspaceId, ...restOptions } = options;

      const langChainOptions: LangChainAgentOptions = {
        model: restOptions.model,
        temperature: restOptions.temperature || 0.7,
        maxTokens: restOptions.maxTokens,
        provider: restOptions.provider,
        apiKeys: restOptions.apiKeys || {},
        ollamaConfig: restOptions.ollamaConfig,
        tools: restOptions.tools,
        systemPrompt: restOptions.systemPrompt,
      };

      console.log('[OSSwarm] Creating swarm with options:', {
        model: langChainOptions.model,
        provider: langChainOptions.provider,
        toolsCount: langChainOptions.tools?.length || 0,
        hasSystemPrompt: !!langChainOptions.systemPrompt,
        chatId,
        workspaceId
      });

      const swarmLimits: Partial<OSSwarmLimits> = limits || {};

      // Create swarm with human-in-the-loop enabled
      const swarm = await OSSwarmFactory.createSwarm(langChainOptions, swarmLimits, true);
      console.log('[OSSwarm] Swarm created successfully');

      // ✅ Execute task with streaming updates and context
      console.log('[OSSwarm] Starting task execution...');
      const result = await swarm.executeTask(task, (update: string) => {
        console.log('[OSSwarm] Stream update:', update);
        event.sender.send('osswarm:stream_update', { update });
      }, chatId, workspaceId); // ✅ Pass context to executeTask

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

  // ✅ Handle MCP tool execution requests from OSSwarm
  ipcMain.on('osswarm:execute_mcp_tool', async (event, { executionId, serverName, toolName, arguments: toolArgs, responseChannel }) => {
    console.log('[OSSwarm] 🔧 Received MCP tool execution request:', {
      executionId,
      serverName,
      toolName,
      responseChannel
    });

    try {
      // ✅ Use ipcMain.handle to call the renderer's MCP handler
      const result: any = await new Promise((resolve, reject) => {
        const tempChannel = `mcp:execute_tool:${executionId}`;
        
        // Set up one-time listener for the response
        ipcMain.once(tempChannel, (responseEvent, result) => {
          resolve(result);
        });
        
        // Send request to renderer
        event.sender.send('mcp:execute_tool_request', {
          serverName,
          toolName,
          arguments: toolArgs,
          responseChannel: tempChannel
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
          ipcMain.removeAllListeners(tempChannel);
          reject(new Error('MCP tool execution timeout'));
        }, 30000);
      });

      console.log('[OSSwarm] 🔧 MCP tool execution result:', {
        executionId,
        success: (result as any)?.success,
        hasData: !!(result as any)?.data
      });

      // Send result back through the response channel
      event.sender.send(responseChannel, result);
    } catch (error: any) {
      console.error('[OSSwarm] 🔧 Error executing MCP tool:', error);
      
      // Send error back through the response channel
      event.sender.send(responseChannel, {
        success: false,
        error: error.message
      });
    }
  });

  // ✅ Get execution history
  ipcMain.handle('osswarm:get_execution_history', async (event, { limit = 50 }) => {
    try {
      // This would be handled by the renderer process AgentTaskStore
      // We'll just return success here as the store handles the actual DB queries
      return { success: true };
    } catch (error: any) {
      console.error('[OSSwarm] Error getting execution history:', error);
      return { success: false, error: error.message };
    }
  });

  // ✅ Get execution graph
  ipcMain.handle('osswarm:get_execution_graph', async (event, { executionId }) => {
    try {
      // This would be handled by the renderer process AgentTaskStore
      // We'll just return success here as the store handles the actual DB queries
      return { success: true };
    } catch (error: any) {
      console.error('[OSSwarm] Error getting execution graph:', error);
      return { success: false, error: error.message };
    }
  });

  // Get swarm status
  ipcMain.handle('osswarm:get_status', async () => {
    try {
      const swarm = OSSwarmFactory.getCurrentSwarm();
      const swarmStatus = swarm?.getSwarmStatus?.() || null;
      
      return { 
        success: true, 
        cacheSize: OSSwarmFactory.getCacheSize(),
        swarmStatus
      };
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

  // ✅ Add abort handler
  ipcMain.handle('osswarm:abort_task', async (event, { taskId = 'current' }) => {
    console.log('[OSSwarm] Abort task requested:', taskId);
    
    try {
      const swarm = OSSwarmFactory.getCurrentSwarm();
      
      if (swarm && swarm.isInitialized()) {
        // Call abort on the swarm
        const result = swarm.abortExecution?.() || { success: true };
        
        console.log('[OSSwarm] Task aborted successfully:', taskId);
        return { success: true, taskId };
      } else {
        console.warn('[OSSwarm] No active swarm to abort');
        return { success: false, error: 'No active swarm found', taskId };
      }
    } catch (error: any) {
      console.error('[OSSwarm] Error aborting task:', error);
      return { success: false, error: error.message, taskId };
    }
  });


  console.log('[OSSwarm] IPC handlers set up successfully');
} 
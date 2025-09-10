import { ipcMain } from 'electron';
import { LangChainServiceFactory } from './factory/factory';
import { LangChainAgentOptions, OpenAIMessage } from './agent';
import { v4 as uuidv4 } from 'uuid';
import { LangGraphOSSwarmFactory } from './factory/factory';
import { LangGraphOSSwarmWorkflow } from './agent/workflow';

// Track active tool executions and workflows
const activeToolExecutions = new Map<string, AbortController>();
const activeWorkflows = new Map<string, any>();

export function setupLangChainHandlers() {
  console.log('[LangChain] Setting up IPC handlers...');

  // Main LangChain completion handler
  ipcMain.handle('ai:get_completion_langchain', async (event, { messages, options }) => {
    try {
      const {
        model,
        temperature = 0.7,
        maxTokens,
        provider,
        apiKeys,
        ollamaConfig,
        tools,
        systemPrompt,
      } = options;

      if (!provider || !model) {
        throw new Error('Provider and model are required for LangChain completion.');
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages array is required and cannot be empty.');
      }

      const langChainOptions: LangChainAgentOptions = {
        model,
        temperature,
        maxTokens,
        provider,
        apiKeys: apiKeys || {},
        ollamaConfig,
        tools,
        systemPrompt,
      };

      // Create or get agent service
      const agentService = LangChainServiceFactory.createAgent(langChainOptions);

      // Get completion
      const completion = await agentService.getCompletion(messages as OpenAIMessage[]);

      return { success: true, completion };
    } catch (error: any) {
      console.error('[LangChain] Error in ai:get_completion_langchain:', error);
      return { success: false, error: error.message };
    }
  });

  // Handler to clear LangChain cache
  ipcMain.handle('langchain:clear_cache', async () => {
    try {
      const cacheSize = LangChainServiceFactory.getCacheSize();
      LangChainServiceFactory.clearCache();
      console.log(`[LangChain] Cleared cache with ${cacheSize} instances`);
      return { success: true, clearedInstances: cacheSize };
    } catch (error: any) {
      console.error('[LangChain] Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  });

  // Handler to get cache info
  ipcMain.handle('langchain:get_cache_info', async () => {
    try {
      const cacheSize = LangChainServiceFactory.getCacheSize();
      return { success: true, cacheSize };
    } catch (error: any) {
      console.error('[LangChain] Error getting cache info:', error);
      return { success: false, error: error.message };
    }
  });

  // ========================================
  // OSSwarm Agent Handlers (moved from OSSwarm/handlers.ts)
  // ========================================

  console.log('[LangGraph Agent] Setting up LangGraph-based IPC handlers...');

  // Enhanced execute_task handler
  ipcMain.handle('agent:execute_task', async (event, { task, options, limits, chatId, workspaceId }) => {
    try {
      console.log('[LangGraph-IPC] Execute task request:', {
        taskPreview: task?.substring(0, 50) + '...',
        hasOptions: !!options,
        threadId: options?.threadId,
        executionId: options?.executionId,
        isAutoGrading: options?.executionId?.startsWith('autograde_'),
        chatId,
        workspaceId
      });
      
      const ipcSend = (channel: string, ...args: any[]) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(channel, ...args);
        }
      };

      // ✅ FIX: Set the global osswarmWebContents reference for workflow nodes
      (global as any).osswarmWebContents = event.sender;

      const workflow = new LangGraphOSSwarmWorkflow(options);
      const threadId = options?.threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const executionId = options?.executionId || uuidv4();
      
      console.log('[LangGraph-IPC] Workflow execution with IDs:', {
        threadId,
        executionId,
        isAutoGrading: executionId.startsWith('autograde_')
      });
      
      // Notify renderer to create execution record and mark as running
      try {
        ipcSend('agent:create_execution_record', {
          executionId,
          taskDescription: task,
          chatId,
          workspaceId
        });

        ipcSend('agent:update_execution_status', {
          executionId,
          status: 'running'
        });
      } catch (statusInitError) {
        console.warn('[LangGraph-IPC] Failed to initialize execution status in renderer:', statusInitError);
      }

      const result = await workflow.executeWorkflow(task, threadId, {
        executionId: executionId,
        chatId,
        workspaceId,
        streamCallback: (update: string) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('agent:stream_update', { update });
            // Also record stream updates as status logs for this execution
            try {
              ipcSend('agent:add_log_to_db', {
                executionId: executionId,
                logType: 'status_update',
                message: update,
              });
            } catch (logErr) {
              console.warn('[LangGraph-IPC] Failed to log stream update:', logErr);
            }
          }
        },
        ipcSend,
        ...options
      });

      // ✅ FIX: Clean up the global reference after workflow completes
      delete (global as any).osswarmWebContents;

      // Update execution status on completion
      try {
        ipcSend('agent:update_execution_status', {
          executionId,
          status: result.success ? 'completed' : 'failed',
          result: result.success ? result.result : undefined,
          error: 'error' in result ? result.error : undefined
        });
      } catch (statusCompleteError) {
        console.warn('[LangGraph-IPC] Failed to finalize execution status:', statusCompleteError);
      }

      const response = {
        success: result.success,
        result: result.result,
        requiresHumanInteraction: result.requiresHumanInteraction,
        threadId,
        error: 'error' in result ? result.error : undefined
      };

      return response;

    } catch (error: any) {
      console.error('Error in agent:execute_task:', error);
      // ✅ FIX: Clean up the global reference on error
      delete (global as any).osswarmWebContents;
      try {
        // Attempt to update execution as failed if we had created one
        const failedExecutionId = (event as any)?.executionId || undefined;
        if (failedExecutionId) {
          (event as any).sender?.send?.('agent:update_execution_status', {
            executionId: failedExecutionId,
            status: 'failed',
            error: error.message || 'Unknown error occurred'
          });
        }
      } catch {}
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  });

  // Enhanced resume workflow handler
  ipcMain.handle('agent:resume_workflow', async (event, { threadId, response, workflowType }) => {
    try {
      const ipcSend = (channel: string, ...args: any[]) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(channel, ...args);
        }
      };

      // ✅ FIX: Set the global webContents reference for resumed workflows
      (global as any).osswarmWebContents = event.sender;
      
      const result = await LangGraphOSSwarmWorkflow.resumeWorkflow(threadId, response, ipcSend);

      // ✅ FIX: Clean up the global reference after workflow completes or pauses
      if (result.completed || !result.requiresHumanInteraction) {
        delete (global as any).osswarmWebContents;
      }

      return result;
    } catch (error: any) {
      console.error('Error in agent:resume_workflow:', error);
      // ✅ FIX: Clean up the global reference on error
      delete (global as any).osswarmWebContents;
      return { success: false, error: error.message };
    }
  });

  // Enhanced MCP tool execution handler
  ipcMain.on('agent:execute_mcp_tool', async (event, { executionId, serverName, toolName, arguments: toolArgs, responseChannel }) => {
    try {
      const { activeClients } = require('../main/mcp');
      
      const client = serverName === 'default' 
        ? Object.values(activeClients)[0] 
        : activeClients[serverName];
        
      if (!client) {
        throw new Error(`No active MCP client found for server: ${serverName}`);
      }
      
      event.sender.send('agent:tool_execution_updated', {
        executionId: executionId,
        toolExecutionId: executionId,
        status: 'executing',
        toolName: toolName,
        serverName: serverName
      });
      
      let finalArgs = toolArgs;
      
      if (typeof toolArgs === 'string') {
        try {
          finalArgs = JSON.parse(toolArgs);
        } catch (parseError) {
          finalArgs = {};
        }
      }
      
      if (!finalArgs || typeof finalArgs !== 'object' || Array.isArray(finalArgs)) {
        finalArgs = {};
      }
      
      const startTime = Date.now();
      
      const result = await client.callTool({
        name: toolName,
        arguments: finalArgs
      });
      
      const executionTime = Date.now() - startTime;

      event.sender.send('agent:tool_execution_updated', {
        executionId: executionId,
        toolExecutionId: executionId,
        status: 'completed',
        result: JSON.stringify(result),
        executionTime: Math.round(executionTime / 1000),
        toolName: toolName,
        serverName: serverName
      });

      event.sender.send('agent:add_log_to_db', {
        executionId: executionId,
        logType: 'tool_result',
        message: `Tool ${toolName} executed successfully from ${serverName}. Result: ${JSON.stringify(result).substring(0, 200)}...`,
        toolExecutionId: executionId,
        metadata: {
          toolName,
          serverName,
          arguments: finalArgs,
          executionTime,
          resultLength: JSON.stringify(result).length
        }
      });

      const response = {
        success: true,
        data: result,
        toolName,
        serverName,
        executionId,
        executionTime
      };

      event.sender.send(responseChannel, response);
      
    } catch (error: any) {
      console.error('MCP tool execution failed:', error);
      
      event.sender.send('agent:tool_execution_updated', {
        executionId: executionId,
        toolExecutionId: executionId,
        status: 'failed',
        error: error.message,
        toolName: toolName,
        serverName: serverName
      });
      
      event.sender.send('agent:add_log_to_db', {
        executionId: executionId,
        logType: 'error',
        message: `Tool ${toolName} execution failed: ${error.message}`,
        toolExecutionId: executionId,
        metadata: {
          toolName,
          serverName,
          arguments: toolArgs,
          error: error.message
        }
      });
      
      const errorResponse = { 
        success: false, 
        error: error.message,
        executionId,
        toolName,
        serverName,
        errorType: error.constructor?.name
      };
      
      event.sender.send(responseChannel, errorResponse);
    }
  });

  // Simplified handlers for LangGraph
  ipcMain.handle('agent:get_status', async () => {
    try {
      const cacheSize = LangGraphOSSwarmFactory.getCacheSize();
      return { 
        success: true, 
        cacheSize,
        implementation: 'LangGraph'
      };
    } catch (error: any) {
      console.error('[LangGraph Agent] Error getting status:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:clear_cache', async () => {
    try {
      const cacheSize = LangGraphOSSwarmFactory.getCacheSize();
      LangGraphOSSwarmFactory.clearCache();
      console.log(`[LangGraph Agent] Cleared cache with ${cacheSize} instances`);
      return { success: true, clearedInstances: cacheSize };
    } catch (error: any) {
      console.error('[LangGraph Agent] Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  });

  // ✅ ADD: Database operation handlers
  ipcMain.handle('agent:save_agent_to_db', async (event, { executionId, agentId, role, expertise }) => {
    try {
      event.sender.send('agent:save_agent_to_db', {
        executionId,
        agentId,
        role,
        expertise
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error saving agent:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:save_task_to_db', async (event, { executionId, agentId, taskDescription, priority }) => {
    try {
      event.sender.send('agent:save_task_to_db', {
        executionId,
        agentId,
        taskDescription,
        priority
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error saving task:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:save_tool_execution_to_db', async (event, { executionId, agentId, toolName, toolArguments, approvalId, taskId, mcpServer }) => {
    try {
      event.sender.send('agent:save_tool_execution_to_db', {
        executionId,
        agentId,
        toolName,
        toolArguments,
        approvalId,
        taskId,
        mcpServer
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error saving tool execution:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:update_execution_status', async (event, { executionId, status, result, error }) => {
    try {
      event.sender.send('agent:update_execution_status', {
        executionId,
        status,
        result,
        error
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error updating execution status:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:add_log_to_db', async (event, { executionId, logType, message, agentId, taskId, toolExecutionId, metadata }) => {
    try {
      event.sender.send('agent:add_log_to_db', {
        executionId,
        logType,
        message,
        agentId,
        taskId,
        toolExecutionId,
        metadata
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error adding log:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:update_agent_status', async (event, { agentId, status, currentTask, executionId }) => {
    try {
      event.sender.send('agent:update_agent_status', {
        agentId,
        status,
        currentTask,
        executionId
      });
      
      event.sender.send('agent:agent_updated', {
        executionId: executionId,
        agentId: agentId,
        agentCard: { id: agentId, role: currentTask },
        status,
        currentTask,
        timestamp: Date.now()
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating agent status:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:update_task_status', async (event, { taskId, status, result, error, executionId, agentId, taskDescription }) => {
    try {
      event.sender.send('agent:update_task_status', {
        taskId,
        status,
        result,
        error,
        executionId,
        agentId,
        taskDescription
      });
      
      event.sender.send('agent:task_updated', {
        executionId: executionId,
        taskId,
        status,
        result,
        error,
        timestamp: Date.now()
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating task status:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:create_execution_record', async (event, { executionId, taskDescription, chatId, workspaceId }) => {
    try {
      event.sender.send('agent:create_execution_record', {
        executionId,
        taskDescription,
        chatId,
        workspaceId
      });
      
      event.sender.send('agent:execution_updated', {
        executionId,
        status: 'pending',
        taskDescription
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error creating execution record:', error);
      return { success: false, error: error.message };
    }
  });

  // Add a new handler for clearing all agent task state:
  ipcMain.handle('agent:clear_all_task_state', async (event, { executionId }) => {
    try {
      event.sender.send('agent:clear_all_task_state', {
        executionId
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error clearing all agent task state:', error);
      return { success: false, error: error.message };
    }
  });

  // ✅ ADD: Enhanced task handlers for decomposition support
  ipcMain.handle('agent:save_decomposed_tasks_to_db', async (event, { executionId, subtasks, taskAnalysis }) => {
    try {
      event.sender.send('agent:save_decomposed_tasks_to_db', {
        executionId,
        subtasks,
        taskAnalysis
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error saving decomposed tasks:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:create_task_with_decomposition', async (event, taskParams) => {
    try {
      event.sender.send('agent:create_task_with_decomposition', taskParams);
      return { success: true };
    } catch (error: any) {
      console.error('Error creating task with decomposition data:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:update_task_assignment', async (event, { taskId, agentId, assignmentReason, executionId }) => {
    try {
      event.sender.send('agent:update_task_assignment', {
        taskId,
        agentId,
        assignmentReason,
        executionId
      });
      
      event.sender.send('agent:task_assigned', {
        executionId,
        taskId,
        agentId,
        assignmentReason,
        timestamp: Date.now()
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error updating task assignment:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:load_task_hierarchy', async (event, { executionId }) => {
    try {
      event.sender.send('agent:load_task_hierarchy', {
        executionId
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error loading task hierarchy:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[LangChain] IPC handlers set up successfully');
  LangGraphOSSwarmWorkflow.startCleanupCycle();
}

// Clean up old workflows periodically (prevent memory leaks)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [threadId, workflow] of activeWorkflows.entries()) {
    if (now - workflow.createdAt > maxAge) {
      console.log(`[LangGraph Agent] Cleaning up old workflow: ${threadId}`);
      activeWorkflows.delete(threadId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes 
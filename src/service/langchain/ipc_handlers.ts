import { ipcMain } from 'electron';
import { LangChainServiceFactory } from './factory/factory';
import { LangChainAgentOptions, OpenAIMessage } from './agent';
import { v4 as uuidv4 } from 'uuid';
import { LangGraphOSSwarmFactory } from './factory/factory';
import { LangGraphOSSwarmWorkflow } from './agent/workflow';
import { getMainHumanInTheLoopManager, HumanInteractionResponse } from '@/service/langchain/human_in_the_loop/ipc/human_in_the_loop';

// Track active tool executions and workflows
const activeToolExecutions = new Map<string, AbortController>();
const activeWorkflows = new Map<string, any>();

export function setupLangChainHandlers() {
  console.log('[LangChain] Setting up IPC handlers...');

  // Main LangChain completion handler
  ipcMain.handle('ai:get_completion_langchain', async (event, { messages, options }) => {
    console.log('[LangChain] ai:get_completion_langchain received:', {
      messageCount: messages?.length,
      provider: options?.provider,
      model: options?.model,
      hasTools: options?.tools && options.tools.length > 0,
    });

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
    console.log(`🔍 [MAIN-IPC] ==================== EXECUTE TASK START ====================`);
    console.log(`🔍 [MAIN-IPC] IPC agent:execute_task received:`, {
      task: task?.substring(0, 100) + '...',
      provider: options?.provider,
      model: options?.model,
      toolsCount: options?.tools?.length || 0,
      hasKnowledgeBases: !!options?.knowledgeBases,
      chatId,
      workspaceId,
      executionId: options?.executionId,
      threadId: options?.threadId,
      humanInTheLoop: options?.humanInTheLoop
    });

    try {
      console.log(`🔍 [MAIN-IPC] Step 1: Setting up global webContents...`);
      (global as any).osswarmWebContents = event.sender;
      console.log(`🔍 [MAIN-IPC] ✅ WebContents stored globally`);

      console.log(`🔍 [MAIN-IPC] Step 2: Creating LangGraph workflow...`);
      const workflow = new LangGraphOSSwarmWorkflow(options);
      console.log(`🔍 [MAIN-IPC] ✅ Workflow instance created`);

      const threadId = options?.threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`🔍 [MAIN-IPC] Thread ID: ${threadId}`);
      
      console.log(`🔍 [MAIN-IPC] Step 3: Executing workflow...`);
      const result = await workflow.executeWorkflow(task, threadId, {
        executionId: options?.executionId || uuidv4(),
        chatId,
        workspaceId,
        streamCallback: (update: string) => {
          console.log(`🔍 [MAIN-IPC] Stream update:`, update.substring(0, 100) + '...');
          event.sender.send('agent:stream_update', { update });
        },
        ...options
      });

      console.log(`🔍 [MAIN-IPC] ✅ Workflow execution completed:`, { 
        success: result.success, 
        hasResult: !!result.result,
        requiresHumanInteraction: result.requiresHumanInteraction,
        error: 'error' in result ? result.error : undefined
      });

      const response = {
        success: result.success,
        result: result.result,
        requiresHumanInteraction: result.requiresHumanInteraction,
        threadId,
        error: 'error' in result ? result.error : undefined
      };

      console.log(`🔍 [MAIN-IPC] Returning response:`, response);
      return response;

    } catch (error: any) {
      console.error(`🔍 [MAIN-IPC] ❌ Critical error in agent:execute_task:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return { success: false, error: error.message || 'Unknown error occurred' };
    } finally {
      console.log(`🔍 [MAIN-IPC] ==================== EXECUTE TASK END ====================`);
    }
  });

  // Enhanced resume workflow handler
  ipcMain.handle('agent:resume_workflow', async (event, { threadId, response, workflowType }) => {
    console.log(`🔍 [MAIN-IPC] ==================== RESUME WORKFLOW START ====================`);
    console.log(`🔍 [MAIN-IPC] IPC agent:resume_workflow received:`, { 
      threadId, 
      approved: response?.approved,
      responseId: response?.id,
      workflowType,
      timestamp: response?.timestamp
    });
    
    try {
      console.log(`🔍 [MAIN-IPC] Step 1: Loading LangGraph workflow class...`);
      
      // ✅ Add debugging for active workflows
      console.log(`🔍 [MAIN-IPC] Active workflows before resume:`, LangGraphOSSwarmWorkflow.listActiveWorkflows());
      
      console.log(`🔍 [MAIN-IPC] Step 2: Calling static resumeWorkflow method...`);
      const result = await LangGraphOSSwarmWorkflow.resumeWorkflow(threadId, response);

      console.log(`🔍 [MAIN-IPC] ✅ Resume workflow completed:`, {
        success: result.success,
        completed: result.completed,
        requiresHumanInteraction: result.requiresHumanInteraction,
        error: result.error
      });

      console.log(`🔍 [MAIN-IPC] Returning resume result:`, result);
      return result;

    } catch (error: any) {
      console.error(`🔍 [MAIN-IPC] ❌ Error in agent:resume_workflow:`, {
        message: error.message,
        stack: error.stack,
        threadId,
        responseId: response?.id
      });
      return { success: false, error: error.message };
    } finally {
      console.log(`🔍 [MAIN-IPC] ==================== RESUME WORKFLOW END ====================`);
    }
  });

  // Enhanced MCP tool execution handler
  ipcMain.on('agent:execute_mcp_tool', async (event, { executionId, serverName, toolName, arguments: toolArgs, responseChannel }) => {
    console.log(`🔍 [MAIN-MCP] ==================== MCP TOOL EXECUTION START ====================`);
    console.log(`🔍 [MAIN-MCP] MCP tool execution request:`, {
      executionId,
      serverName,
      toolName,
      hasArguments: !!toolArgs,
      argumentsType: typeof toolArgs,
      responseChannel,
      argumentsKeys: toolArgs ? Object.keys(toolArgs) : []
    });

    try {
      console.log(`🔍 [MAIN-MCP] Step 1: Loading MCP clients...`);
      const { activeClients } = require('../main/mcp');
      console.log(`🔍 [MAIN-MCP] Available MCP clients:`, Object.keys(activeClients));
      
      console.log(`🔍 [MAIN-MCP] Step 2: Finding MCP client for server: ${serverName}`);
      const client = serverName === 'default' 
        ? Object.values(activeClients)[0] 
        : activeClients[serverName];
        
      if (!client) {
        console.error(`🔍 [MAIN-MCP] ❌ No active MCP client found for server: ${serverName}`);
        console.log(`🔍 [MAIN-MCP] Available servers:`, Object.keys(activeClients));
        throw new Error(`No active MCP client found for server: ${serverName}`);
      }
      
      console.log(`🔍 [MAIN-MCP] ✅ Found MCP client for server: ${serverName}`);
      console.log(`🔍 [MAIN-MCP] Client details:`, {
        hasCallTool: typeof client.callTool === 'function',
        clientType: client.constructor?.name,
        clientMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(client))
      });
      
      console.log(`🔍 [MAIN-MCP] Step 3: Preparing tool arguments...`);
      let finalArgs = toolArgs;
      
      // Ensure arguments are properly formatted
      if (typeof toolArgs === 'string') {
        try {
          finalArgs = JSON.parse(toolArgs);
          console.log(`🔍 [MAIN-MCP] Parsed string arguments successfully`);
        } catch (parseError) {
          console.warn(`🔍 [MAIN-MCP] Failed to parse arguments, using as-is:`, parseError);
          finalArgs = {};
        }
      }
      
      if (!finalArgs || typeof finalArgs !== 'object' || Array.isArray(finalArgs)) {
        console.log(`🔍 [MAIN-MCP] Using empty arguments object`);
        finalArgs = {};
      }
      
      console.log(`🔍 [MAIN-MCP] Final arguments:`, finalArgs);
      
      console.log(`🔍 [MAIN-MCP] Step 4: Executing tool: ${toolName}`);
      const startTime = Date.now();
      
      const result = await client.callTool({
        name: toolName,
        arguments: finalArgs
      });
      
      const executionTime = Date.now() - startTime;
      
      console.log(`🔍 [MAIN-MCP] ✅ MCP tool execution completed:`, {
        executionId,
        success: !!result,
        hasData: !!result,
        resultType: typeof result,
        dataLength: result ? JSON.stringify(result).length : 0,
        executionTime: `${executionTime}ms`
      });

      const response = {
        success: true,
        data: result,
        toolName,
        serverName,
        executionId,
        executionTime
      };

      console.log(`🔍 [MAIN-MCP] Step 5: Sending result back via channel: ${responseChannel}`);
      event.sender.send(responseChannel, response);
      console.log(`🔍 [MAIN-MCP] ✅ Response sent successfully`);
      
    } catch (error: any) {
      console.error(`🔍 [MAIN-MCP] ❌ MCP tool execution failed:`, {
        message: error.message,
        stack: error.stack,
        executionId,
        toolName,
        serverName,
        errorType: error.constructor?.name
      });
      
      const errorResponse = { 
        success: false, 
        error: error.message,
        executionId,
        toolName,
        serverName,
        errorType: error.constructor?.name
      };
      
      console.log(`🔍 [MAIN-MCP] Sending error response via channel: ${responseChannel}`);
      event.sender.send(responseChannel, errorResponse);
    } finally {
      console.log(`🔍 [MAIN-MCP] ==================== MCP TOOL EXECUTION END ====================`);
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
    console.log('[IPC-DB] Saving agent to database:', { executionId, agentId, role });
    
    try {
      // Send to renderer to save to database
      event.sender.send('agent:save_agent_to_db', {
        executionId,
        agentId,
        role,
        expertise
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('[IPC-DB] Error saving agent:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:save_task_to_db', async (event, { executionId, agentId, taskDescription, priority }) => {
    console.log('[IPC-DB] Saving task to database:', { executionId, agentId, taskDescription });
    
    try {
      event.sender.send('agent:save_task_to_db', {
        executionId,
        agentId,
        taskDescription,
        priority
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('[IPC-DB] Error saving task:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:save_tool_execution_to_db', async (event, { executionId, agentId, toolName, toolArguments, approvalId, taskId, mcpServer }) => {
    console.log('[IPC-DB] Saving tool execution to database:', { executionId, agentId, toolName });
    
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
      console.error('[IPC-DB] Error saving tool execution:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:update_execution_status', async (event, { executionId, status, result, error }) => {
    console.log('[IPC-DB] Updating execution status:', { executionId, status });
    
    try {
      event.sender.send('agent:update_execution_status', {
        executionId,
        status,
        result,
        error
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('[IPC-DB] Error updating execution status:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('agent:add_log_to_db', async (event, { executionId, logType, message, agentId, taskId, toolExecutionId, metadata }) => {
    console.log('[IPC-DB] Adding log to database:', { executionId, logType, message });
    
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
      console.error('[IPC-DB] Error adding log:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[LangChain] IPC handlers set up successfully');
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
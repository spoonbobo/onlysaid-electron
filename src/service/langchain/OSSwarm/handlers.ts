import { ipcMain } from 'electron';
import { LangChainAgentOptions } from '../agent';
import { LangGraphOSSwarmFactory } from './langgraph-factory';
import { LangGraphOSSwarmState } from './langgraph-state';
import { v4 as uuidv4 } from 'uuid';
import { getMainHumanInTheLoopManager, HumanInteractionResponse } from '@/main/langchain/human_in_the_loop';
import { LangGraphOSSwarmWorkflow } from './langgraph-workflow';

// Track active tool executions and workflows
const activeToolExecutions = new Map<string, AbortController>();
const activeWorkflows = new Map<string, any>();

export function setupOSSwarmHandlers() {
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
      console.log(`�� [MAIN-IPC] Step 1: Setting up global webContents...`);
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
        error: result.error
      });

      const response = {
        success: result.success,
        result: result.result,
        requiresHumanInteraction: result.requiresHumanInteraction,
        threadId,
        error: result.error
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

  // Handle human approval responses (updated for LangGraph)
  ipcMain.handle('agent:approve_tool', async (event, { approvalId, approved }) => {
    console.log(`[LangGraph Agent] 🔧 Approval handler called:`, {
      approvalId,
      approved
    });
    
    try {
      // For LangGraph implementation, we'll need to implement approval handling
      // This is a placeholder for now
      console.log(`[LangGraph Agent] Tool approval: ${approvalId} = ${approved}`);
      return { success: true, message: 'LangGraph approval handling not yet implemented' };
    } catch (error: any) {
      console.error('[LangGraph Agent] Error in agent:approve_tool:', error);
      return { success: false, error: error.message };
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
      const { LangGraphOSSwarmWorkflow } = require('./langgraph-workflow');
      console.log(`🔍 [MAIN-IPC] ✅ Workflow class loaded`);
      
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

  console.log('[LangGraph Agent] IPC handlers set up successfully');
}

// Helper functions to manage active workflows
function getActiveWorkflow(threadId: string) {
  return activeWorkflows.get(threadId);
}

function setActiveWorkflow(threadId: string, workflow: any) {
  activeWorkflows.set(threadId, workflow);
}

function clearActiveWorkflow(threadId: string) {
  activeWorkflows.delete(threadId);
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
    const { activeClients } = require('../../main/mcp');
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

// Stub handlers for backward compatibility
ipcMain.handle('agent:abort_task', async (event, { taskId = 'current' }) => {
  console.log('[LangGraph Agent] Abort task requested (not yet implemented):', taskId);
  return { success: false, error: 'Abort not yet implemented in LangGraph version' };
});

ipcMain.handle('agent:get_agent_cards', async (event) => {
  console.log('[LangGraph Agent] Get agent cards requested (not yet implemented)');
  return { success: true, agentCards: [] };
});

ipcMain.handle('agent:get_agent_card', async (event, { agentId }) => {
  console.log('[LangGraph Agent] Get agent card requested (not yet implemented):', agentId);
  return { success: false, error: 'Agent card retrieval not yet implemented in LangGraph version' };
});

ipcMain.handle('agent:get_agent_cards_by_role', async (event, { role }) => {
  console.log('[LangGraph Agent] Get agent cards by role requested (not yet implemented):', role);
  return { success: true, agentCards: [] };
});

ipcMain.handle('agent:agent_action', async (event, { agentId, action, payload }) => {
  console.log(`[LangGraph Agent] Agent action requested (not yet implemented): ${action} for agent ${agentId}`);
  return { success: false, error: 'Agent actions not yet implemented in LangGraph version' };
});

export function setupLangGraphOSSwarmHandlers() {
  console.log('[LangGraph Agent] Setting up LangGraph-enhanced handlers...');
  
  // Enhanced execution handler
  ipcMain.handle('agent:execute_task_langgraph', async (event, { task, options, limits, chatId, workspaceId }) => {
    console.log('[LangGraph Agent] LangGraph execution requested:', {
      task: task?.substring(0, 100) + '...',
      provider: options?.provider,
      model: options?.model
    });
    
    try {
      // Store webContents for renderer communication
      (global as any).osswarmWebContents = event.sender;
      
      // Create LangGraph workflow
      const workflow = await LangGraphOSSwarmFactory.createWorkflow(
        options,
        limits,
        true,
        options?.knowledgeBases
      );
      
      const compiledWorkflow = workflow.compile();
      
      // Prepare initial state
      const initialState: LangGraphOSSwarmState = {
        originalTask: task,
        messages: [],
        taskDecomposition: [],
        currentPhase: 'initialization',
        availableAgentCards: [],
        activeAgentCards: {},
        agentResults: {},
        executionId: options?.executionId || uuidv4(),
        chatId,
        workspaceId,
        iterationCount: 0,
        pendingApprovals: [],
        approvalHistory: [],
        waitingForHumanResponse: false,
        kbContext: options?.knowledgeBases?.enabled ? {
          enabled: true,
          workspaceId: options.knowledgeBases.workspaceId || workspaceId,
          selectedKbIds: options.knowledgeBases.selectedKbIds || [],
          retrievedKnowledge: []
        } : undefined,
        streamCallback: (update: string) => {
          event.sender.send('agent:stream_update', { update });
        },
        errors: [],
        recoveryAttempts: 0,
        confidence: 0,
        threadId: options?.executionId || uuidv4()
      };
      
      // Execute LangGraph workflow
      const result = await compiledWorkflow.invoke(initialState, {
        configurable: {
          thread_id: initialState.executionId
        }
      });
      
      console.log('[LangGraph Agent] Workflow completed:', {
        success: !!result.synthesizedResult,
        agentsUsed: Object.keys(result.activeAgentCards).length
      });
      
      return { 
        success: true, 
        result: result.synthesizedResult,
        agentCards: Object.values(result.activeAgentCards),
        executionSummary: {
          agentsUsed: Object.keys(result.activeAgentCards).length,
          totalTime: Date.now() - Date.now() // Calculate proper timing
        }
      };
      
    } catch (error: any) {
      console.error('[LangGraph Agent] Critical error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Keep existing handlers for backward compatibility
  setupOSSwarmHandlers();
}

// Add enhanced approval handling
ipcMain.handle('agent:process_tool_approval', async (event, { approvalId, approved, threadId }) => {
  console.log(`🔍 [MAIN-IPC] ==================== PROCESS TOOL APPROVAL START ====================`);
  console.log(`🔍 [MAIN-IPC] Tool approval received:`, { approvalId, approved, threadId });
  
  try {
    // Create human interaction response
    const response: HumanInteractionResponse = {
      id: approvalId,
      approved: approved,
      timestamp: Date.now()
    };
    
    console.log(`🔍 [MAIN-IPC] Resuming workflow with approval response...`);
    
    // Resume the workflow with the approval
    const result = await LangGraphOSSwarmWorkflow.resumeWorkflow(threadId, response);
    
    console.log(`🔍 [MAIN-IPC] Approval processed successfully:`, {
      success: result.success,
      completed: result.completed,
      requiresMoreApproval: result.requiresHumanInteraction
    });
    
    return result;
    
  } catch (error: any) {
    console.error(`🔍 [MAIN-IPC] ❌ Error processing tool approval:`, error);
    return { success: false, error: error.message };
  } finally {
    console.log(`🔍 [MAIN-IPC] ==================== PROCESS TOOL APPROVAL END ====================`);
  }
}); 
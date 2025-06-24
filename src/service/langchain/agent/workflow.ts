import { StateGraph, Annotation, START, END, MemorySaver, Command } from "@langchain/langgraph";
import { AgentExecutionResult, ToolApprovalRequest } from './state';
import { BaseMessage } from "@langchain/core/messages";
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { LangChainAgentOptions } from '../agent';
// Import nodes
import {
  MasterCoordinatorNode,
  TaskDecomposerNode,
  AgentSelectorNode,
  AgentExecutorNode,
  ToolApprovalNode,
  ToolExecutionNode,
  AgentCompletionNode,
  ResultSynthesizerNode,
  WorkflowRouters,
  EnhancedHumanInteractionResponse,
  WorkflowState
} from '../nodes';

const OSSwarmStateAnnotation = Annotation.Root({
  originalTask: Annotation<string>,
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  currentPhase: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'initialization',
  }),
  availableAgentCards: Annotation<AgentCard[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  activeAgentCards: Annotation<{ [role: string]: AgentCard }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  agentResults: Annotation<{ [role: string]: AgentExecutionResult }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  errors: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  // ✅ Direct MCP execution results storage
  mcpExecutionResults: Annotation<{ [toolId: string]: any }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  // ✅ NEW: Tool execution timing tracking
  toolTimings: Annotation<{ [toolId: string]: {
    approvalStartTime: number;
    executionStartTime?: number;
    executionEndTime?: number;
    totalDuration?: number;
    approvalDuration?: number;
    executionDuration?: number;
  } }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  pendingApprovals: Annotation<ToolApprovalRequest[]>({
    reducer: (x, y) => {
      // Keep existing reducer logic but simplified
      const existingMap = new Map(x.map(approval => [approval.id, approval]));
      y.forEach(newApproval => {
        existingMap.set(newApproval.id, { ...existingMap.get(newApproval.id), ...newApproval });
      });
      return Array.from(existingMap.values());
    },
    default: () => [],
  }),
  waitingForHumanResponse: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  synthesizedResult: Annotation<string>,
  executionId: Annotation<string>,
  streamCallback: Annotation<((update: string) => void)>(),
  threadId: Annotation<string>,
  awaitingToolResults: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
});

export class LangGraphOSSwarmWorkflow {
  private graph: any;
  private agentOptions: LangChainAgentOptions;
  
  // Initialize node instances
  private masterCoordinatorNode: MasterCoordinatorNode;
  private taskDecomposerNode: TaskDecomposerNode;
  private agentSelectorNode: AgentSelectorNode;
  private agentExecutorNode: AgentExecutorNode;
  private toolApprovalNode: ToolApprovalNode;
  private toolExecutionNode: ToolExecutionNode;
  private agentCompletionNode: AgentCompletionNode;
  private resultSynthesizerNode: ResultSynthesizerNode;
  private routers: WorkflowRouters;
  
  private static activeWorkflows = new Map<string, any>();
  
  constructor(agentOptions: LangChainAgentOptions) {
    this.agentOptions = agentOptions;
    
    // Initialize nodes
    this.masterCoordinatorNode = new MasterCoordinatorNode(agentOptions);
    this.taskDecomposerNode = new TaskDecomposerNode(agentOptions);
    this.agentSelectorNode = new AgentSelectorNode(agentOptions);
    this.agentExecutorNode = new AgentExecutorNode(agentOptions);
    this.toolApprovalNode = new ToolApprovalNode(agentOptions);
    this.toolExecutionNode = new ToolExecutionNode(agentOptions);
    this.agentCompletionNode = new AgentCompletionNode(agentOptions);
    this.resultSynthesizerNode = new ResultSynthesizerNode(agentOptions);
    this.routers = new WorkflowRouters();
    
    this.graph = this.buildWorkflow();
  }
  
  private buildWorkflow() {
    const workflow = new StateGraph(OSSwarmStateAnnotation)
      .addNode('master_coordinator', this.createNodeWrapper(this.masterCoordinatorNode))
      .addNode('task_decomposer', this.createNodeWrapper(this.taskDecomposerNode))
      .addNode('agent_selector', this.createNodeWrapper(this.agentSelectorNode))
      .addNode('agent_executor', this.createNodeWrapper(this.agentExecutorNode))
      .addNode('tool_approval', this.createNodeWrapper(this.toolApprovalNode))
      .addNode('tool_execution', this.createNodeWrapper(this.toolExecutionNode))
      .addNode('agent_completion', this.createNodeWrapper(this.agentCompletionNode))
      .addNode('result_synthesizer', this.createNodeWrapper(this.resultSynthesizerNode))
      .addEdge(START, 'master_coordinator')
      .addEdge('master_coordinator', 'task_decomposer')
      .addEdge('task_decomposer', 'agent_selector')
      .addEdge('agent_selector', 'agent_executor')
      .addConditionalEdges('agent_executor', this.routers.routeAfterExecution, [
        'agent_executor',
        'tool_approval',
        'agent_completion'
      ])
      .addEdge('tool_approval', 'tool_execution')
      .addEdge('tool_execution', 'agent_completion')
      .addConditionalEdges('agent_completion', this.routers.routeAfterCompletion, [
        'agent_executor',
        'tool_approval',
        'tool_execution',
        'result_synthesizer'
      ])
      .addEdge('result_synthesizer', END);
    
    return workflow;
  }
  
  // Wrapper to convert node class methods to workflow node functions
  private createNodeWrapper(node: any) {
    return async (state: typeof OSSwarmStateAnnotation.State) => {
      return await node.execute(state);
    };
  }
  
  compile() {
    const compiledGraph = this.graph.compile({
      checkpointer: new MemorySaver(),
      interruptBefore: [],
      interruptAfter: [],
      recursionLimit: 50
    });
    
    console.log('[LangGraph] Workflow compiled successfully with recursion limit: 50');
    return compiledGraph;
  }
  
  public async executeWorkflow(task: string, threadId: string, options: any = {}) {
    try {
      // ✅ ADD: Create execution record FIRST before any logs
      const webContents = (global as any).osswarmWebContents;
      
      if (webContents && options.executionId) {
        // Create the execution record first
        webContents.send('agent:create_execution_record', {
          executionId: options.executionId,
          taskDescription: task,
          chatId: options.chatId,
          workspaceId: options.workspaceId
        });
        
        // Wait a bit for the execution to be created
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Then update status to running
        webContents.send('agent:update_execution_status', {
          executionId: options.executionId,
          status: 'running'
        });
        
        // Then add initial log
        webContents.send('agent:add_log_to_db', {
          executionId: options.executionId,
          logType: 'info',
          message: `Workflow execution started: ${task}`
        });
      }
      
      console.log(`[LangGraph-WORKFLOW] Workflow execution parameters:`, {
        task: task.substring(0, 100) + '...',
        threadId,
        optionsKeys: Object.keys(options),
        hasStreamCallback: typeof options.streamCallback === 'function',
        executionId: options.executionId,
        chatId: options.chatId,
        workspaceId: options.workspaceId
      });
      
      console.log(`[LangGraph-WORKFLOW] Compiling workflow...`);
      const compiledGraph = this.compile();
      console.log(`[LangGraph-WORKFLOW] Workflow compiled successfully`);
      
      // Store workflow BEFORE execution
      console.log(`[LangGraph-WORKFLOW] Storing workflow for thread: ${threadId}`);
      LangGraphOSSwarmWorkflow.activeWorkflows.set(threadId, compiledGraph);
      console.log(`[LangGraph-WORKFLOW] Workflow stored. Total active workflows: ${LangGraphOSSwarmWorkflow.activeWorkflows.size}`);
      
      const initialState = {
        originalTask: task,
        threadId: threadId,
        executionId: options.executionId || `exec_${Date.now()}`,
        streamCallback: options.streamCallback,
        availableAgentCards: [],
        activeAgentCards: {},
        agentResults: {},
        errors: [],
        pendingApprovals: [],
        messages: [],
        currentPhase: 'initialization'
      };
      
      const config = { 
        configurable: { 
          thread_id: threadId 
        } 
      };
      
      console.log(`[LangGraph-WORKFLOW] Invoking workflow with config:`, config);
      console.log(`[LangGraph-WORKFLOW] Initial state keys:`, Object.keys(initialState));
      
      try {
        const finalResult = await compiledGraph.invoke(initialState, config);
        
        console.log(`[LangGraph-WORKFLOW] Workflow invoke completed:`, {
          hasResult: !!finalResult,
          resultKeys: finalResult ? Object.keys(finalResult) : []
        });
        
        const isCompleted = finalResult?.synthesizedResult || finalResult?.currentPhase === 'completed';
        
        if (isCompleted) {
          LangGraphOSSwarmWorkflow.activeWorkflows.delete(threadId);
          console.log(`[LangGraph-WORKFLOW] Workflow completed, cleaned up thread: ${threadId}`);
          
          // ✅ ADD: Clear agent store state on completion
          if (webContents && options.executionId) {
            // Clear the agent task state
            webContents.send('agent:clear_task_state', {
              taskId: 'current',
              executionId: options.executionId
            });
            
            webContents.send('agent:update_execution_status', {
              executionId: options.executionId,
              status: 'completed',
              result: finalResult?.synthesizedResult
            });
            
            webContents.send('agent:add_log_to_db', {
              executionId: options.executionId,
              logType: 'info',
              message: 'Workflow execution completed successfully'
            });
          }
          
          const result = finalResult?.synthesizedResult ||
          Object.values(finalResult?.agentResults || {})
                .map((r: any) => r.result)
                .join('\n\n') ||
          `Task "${task}" completed.`;
          
          return {
            success: true,
            result,
            workflowState: finalResult
          };
        } else {
          console.log(`[LangGraph-WORKFLOW] Workflow ended without completion - keeping for resume`);
          return {
            success: true,
            result: 'Workflow paused for human interaction',
            requiresHumanInteraction: true,
            workflowState: finalResult
          };
        }
        
      } catch (innerError: any) {
        if (innerError.name === 'GraphInterrupt') {
          console.log(`[LangGraph-WORKFLOW] GraphInterrupt during invoke - workflow paused`);
          console.log(`[LangGraph-WORKFLOW] Interrupt data:`, innerError.interrupts?.[0]?.value);
          
          return {
            success: true,
            result: 'Workflow paused for human interaction',
            requiresHumanInteraction: true,
            interruptData: innerError.interrupts?.[0]?.value
          };
        } else {
          throw innerError;
        }
      }
      
    } catch (error: any) {
      // ✅ ADD: Update execution status on error via IPC
      const webContents = (global as any).osswarmWebContents;
      
      if (webContents && options.executionId) {
        webContents.send('agent:update_execution_status', {
          executionId: options.executionId,
          status: 'failed',
          error: error.message
        });
        
        webContents.send('agent:add_log_to_db', {
          executionId: options.executionId,
          logType: 'error',
          message: `Workflow execution failed: ${error.message}`
        });
      }
      
      console.log(`[LangGraph-WORKFLOW] Workflow execution failed:`, error);
      throw error;
    }
  }

  public static getActiveWorkflows(): Map<string, any> {
    return LangGraphOSSwarmWorkflow.activeWorkflows;
  }

  public static listActiveWorkflows(): string[] {
    return Array.from(LangGraphOSSwarmWorkflow.activeWorkflows.keys());
  }

  public static async resumeWorkflow(
    threadId: string,
    humanResponse: EnhancedHumanInteractionResponse
  ) {
    console.log(`🔍 [RESUME-Timer] Resuming workflow with enhanced timing support...`);
    console.log(`🔍 [RESUME-Timer] Thread ID: ${threadId}`);
    console.log(`🔍 [RESUME-Timer] Human response:`, {
      id: humanResponse.id,
      approved: humanResponse.approved,
      hasToolExecutionResult: !!humanResponse.toolExecutionResult,
      toolSuccess: humanResponse.toolExecutionResult?.success,
      toolName: humanResponse.toolExecutionResult?.toolName,
      executionDuration: humanResponse.toolExecutionResult?.executionDuration
    });
    
    try {
      const compiledGraph = LangGraphOSSwarmWorkflow.activeWorkflows.get(threadId);
      
      if (!compiledGraph) {
        console.error(`🔍 [RESUME-Timer] No workflow found for thread: ${threadId}`);
        throw new Error(`No active workflow found for thread ${threadId}`);
      }
      
      console.log(`🔍 [RESUME-Timer] Found workflow for thread: ${threadId}`);
      
      let resumeValue: any;
      
      if (humanResponse.toolExecutionResult) {
        resumeValue = {
          id: humanResponse.id,
          approved: true,
          timestamp: Date.now(),
          toolExecutionResult: {
            ...humanResponse.toolExecutionResult,
            executionDuration: humanResponse.toolExecutionResult.executionDuration,
            startTime: humanResponse.toolExecutionResult.startTime,
            endTime: humanResponse.toolExecutionResult.endTime
          }
        };
        console.log(`🔍 [RESUME-Timer] Resuming with tool execution result and timing:`, {
          ...resumeValue,
          toolExecutionResult: {
            success: resumeValue.toolExecutionResult.success,
            executionDuration: resumeValue.toolExecutionResult.executionDuration,
            toolName: resumeValue.toolExecutionResult.toolName
          }
        });
      } else {
        resumeValue = {
          id: humanResponse.id,
          approved: humanResponse.approved,
          timestamp: Date.now()
        };
        console.log(`🔍 [RESUME-Timer] Resuming with approval decision:`, resumeValue);
      }
      
      const config = { configurable: { thread_id: threadId } };
      
      console.log(`🔍 [RESUME-Timer] Calling invoke with Command resume...`);
      
      try {
        const { Command } = require("@langchain/langgraph");
        const finalResult = await compiledGraph.invoke(
          new Command({ resume: resumeValue }),
          config
        );
        
        const isCompleted = finalResult?.synthesizedResult || finalResult?.currentPhase === 'completed';
        
        console.log(`🔍 [RESUME-Timer] Workflow resume result:`, {
          isCompleted,
          hasResult: !!finalResult,
          resultKeys: finalResult ? Object.keys(finalResult) : [],
          currentPhase: finalResult?.currentPhase,
          hasToolTimings: !!finalResult?.toolTimings
        });
        
        if (isCompleted) {
          console.log(`🔍 [RESUME-Timer] Workflow completed after resume - cleaning up`);
          LangGraphOSSwarmWorkflow.activeWorkflows.delete(threadId);
          
          // ✅ ADD: Send completion status update via IPC
          const webContents = (global as any).osswarmWebContents;
          if (webContents && finalResult?.executionId) {
            webContents.send('agent:update_execution_status', {
              executionId: finalResult.executionId,
              status: 'completed',
              result: finalResult?.synthesizedResult
            });
            
            webContents.send('agent:add_log_to_db', {
              executionId: finalResult.executionId,
              logType: 'info',
              message: 'Workflow execution completed after resume'
            });
          }
        } else {
          console.log(`🔍 [RESUME-Timer] Workflow still requires more interaction`);
        }
        
        return {
          success: true,
          completed: isCompleted,
          result: finalResult?.synthesizedResult || finalResult,
          requiresHumanInteraction: !isCompleted,
          toolTimings: finalResult?.toolTimings
        };
        
      } catch (resumeError: any) {
        if (resumeError.name === 'GraphInterrupt') {
          console.log(`🔍 [RESUME-Timer] Another GraphInterrupt during resume - workflow still needs interaction`);
          return {
            success: true,
            completed: false,
            result: 'Workflow paused for interaction',
            requiresHumanInteraction: true,
            interruptData: resumeError.interrupts?.[0]?.value
          };
        } else {
          throw resumeError;
        }
      }
      
    } catch (error: any) {
      console.error(`🔍 [RESUME-Timer] Resume error:`, error);
      console.log(`🔍 [RESUME-Timer] Cleaning up failed resume for thread: ${threadId}`);
      LangGraphOSSwarmWorkflow.activeWorkflows.delete(threadId);
      
      return {
        success: false,
        completed: false,
        error: error.message
      };
    }
  }
}
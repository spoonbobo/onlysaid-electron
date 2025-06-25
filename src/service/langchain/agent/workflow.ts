import { StateGraph, Annotation, START, END, MemorySaver, Command } from "@langchain/langgraph";
import { AgentExecutionResult, ToolApprovalRequest } from './state';
import { BaseMessage } from "@langchain/core/messages";
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { LangChainAgentOptions } from '../agent';
import {
  MasterCoordinatorNode,
  TaskDecomposerNode,
  AgentSelectorNode,
  SwarmExecutorNode,
  ToolApprovalNode,
  ToolExecutionNode,
  AgentCompletionNode,
  ResultSynthesizerNode,
  WorkflowRouters,
  EnhancedHumanInteractionResponse,
  WorkflowState
} from '../nodes';
import { SafeWebContents, createSafeWebContents } from './state';

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
  mcpExecutionResults: Annotation<{ [toolId: string]: any }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
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
  ipcSend: Annotation<((channel: string, ...args: any[]) => void)>(),
  threadId: Annotation<string>,
  awaitingToolResults: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  webContents: Annotation<SafeWebContents | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
});

export class LangGraphOSSwarmWorkflow {
  private graph: any;
  private agentOptions: LangChainAgentOptions;
  
  private masterCoordinatorNode: MasterCoordinatorNode;
  private taskDecomposerNode: TaskDecomposerNode;
  private agentSelectorNode: AgentSelectorNode;
  private swarmExecutorNode: SwarmExecutorNode;
  private toolApprovalNode: ToolApprovalNode;
  private toolExecutionNode: ToolExecutionNode;
  private agentCompletionNode: AgentCompletionNode;
  private resultSynthesizerNode: ResultSynthesizerNode;
  private routers: WorkflowRouters;
  
  private static activeWorkflows = new Map<string, { graph: any, createdAt: number }>();
  
  constructor(agentOptions: LangChainAgentOptions) {
    this.agentOptions = agentOptions;
    
    this.masterCoordinatorNode = new MasterCoordinatorNode(agentOptions);
    this.taskDecomposerNode = new TaskDecomposerNode(agentOptions);
    this.agentSelectorNode = new AgentSelectorNode(agentOptions);
    this.swarmExecutorNode = new SwarmExecutorNode(agentOptions);
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
      .addNode('swarm_executor', this.createNodeWrapper(this.swarmExecutorNode))
      .addNode('tool_approval', this.createNodeWrapper(this.toolApprovalNode))
      .addNode('tool_execution', this.createNodeWrapper(this.toolExecutionNode))
      .addNode('agent_completion', this.createNodeWrapper(this.agentCompletionNode))
      .addNode('result_synthesizer', this.createNodeWrapper(this.resultSynthesizerNode))
      .addEdge(START, 'master_coordinator')
      .addEdge('master_coordinator', 'task_decomposer')
      .addEdge('task_decomposer', 'agent_selector')
      .addEdge('agent_selector', 'swarm_executor')
      .addConditionalEdges('swarm_executor', this.routers.routeAfterExecution, [
        'swarm_executor',
        'tool_approval',
        'agent_completion'
      ])
      .addEdge('tool_approval', 'tool_execution')
      .addEdge('tool_execution', 'agent_completion')
      .addConditionalEdges('agent_completion', this.routers.routeAfterCompletion, [
        'swarm_executor',
        'tool_approval',
        'tool_execution',
        'result_synthesizer'
      ])
      .addEdge('result_synthesizer', END);
    
    return workflow;
  }
  
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
      const ipcSend = options.ipcSend || ((channel: string, ...args: any[]) => {
        console.warn(`[LangGraph-WORKFLOW] ipcSend not provided for channel: ${channel}`);
      });
      
      const rawWebContents = (global as any).osswarmWebContents;
      const safeWebContents = rawWebContents ? createSafeWebContents(rawWebContents) : undefined;
      
      console.log('[LangGraph-WORKFLOW] WebContents debug:', {
        hasRawWebContents: !!rawWebContents,
        hasSafeWebContents: !!safeWebContents,
        safeWebContentsType: typeof safeWebContents,
        hasIsValidMethod: safeWebContents ? typeof safeWebContents.isValid === 'function' : false,
        isValidResult: safeWebContents ? safeWebContents.isValid() : 'N/A'
      });
      
      if (ipcSend && options.executionId) {
        ipcSend('agent:create_execution_record', {
          executionId: options.executionId,
          taskDescription: task,
          chatId: options.chatId,
          workspaceId: options.workspaceId
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        ipcSend('agent:execution_updated', {
          executionId: options.executionId,
          status: 'running'
        });
        
        ipcSend('agent:add_log_to_db', {
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
      
      console.log(`[LangGraph-WORKFLOW] Storing workflow for thread: ${threadId}`);
      LangGraphOSSwarmWorkflow.activeWorkflows.set(threadId, {
        graph: compiledGraph,
        createdAt: Date.now()
      });
      console.log(`[LangGraph-WORKFLOW] Workflow stored. Total active workflows: ${LangGraphOSSwarmWorkflow.activeWorkflows.size}`);
      
      const initialState = {
        originalTask: task,
        threadId: threadId,
        executionId: options.executionId || `exec_${Date.now()}`,
        streamCallback: options.streamCallback,
        ipcSend: ipcSend,
        webContents: safeWebContents,
        availableAgentCards: [],
        activeAgentCards: {},
        agentResults: {},
        errors: [],
        pendingApprovals: [],
        messages: [],
        currentPhase: 'initialization',
        swarmLimits: options.swarmLimits || {
          maxIterations: 15,
          maxParallelAgents: 8,
          maxSwarmSize: 4,
          maxActiveSwarms: 2,
          maxConversationLength: 50
        }
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
          
          if (ipcSend && options.executionId) {
            ipcSend('agent:clear_task_state', {
              taskId: 'current',
              executionId: options.executionId
            });
            
            ipcSend('agent:clear_all_task_state', {
              executionId: options.executionId
            });
            
            ipcSend('agent:execution_updated', {
              executionId: options.executionId,
              status: 'completed',
              result: finalResult?.synthesizedResult
            });
            
            ipcSend('agent:add_log_to_db', {
              executionId: options.executionId,
              logType: 'info',
              message: 'Workflow execution completed successfully - clearing all state'
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
      const ipcSend = options.ipcSend;
      
      if (ipcSend && options.executionId) {
        ipcSend('agent:execution_updated', {
          executionId: options.executionId,
          status: 'failed',
          error: error.message
        });
        
        ipcSend('agent:add_log_to_db', {
          executionId: options.executionId,
          logType: 'error',
          message: `Workflow execution failed: ${error.message}`
        });
      }
      
      console.log(`[LangGraph-WORKFLOW] Workflow execution failed:`, error);
      throw error;
    }
  }

  public static getActiveWorkflows(): Map<string, { graph: any, createdAt: number }> {
    return LangGraphOSSwarmWorkflow.activeWorkflows;
  }

  public static listActiveWorkflows(): string[] {
    return Array.from(LangGraphOSSwarmWorkflow.activeWorkflows.keys());
  }

  public static async resumeWorkflow(
    threadId: string,
    humanResponse: EnhancedHumanInteractionResponse,
    ipcSend: (channel: string, ...args: any[]) => void
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
      const workflowData = LangGraphOSSwarmWorkflow.activeWorkflows.get(threadId);
      
      if (!workflowData) {
        console.error(`🔍 [RESUME-Timer] No workflow found for thread: ${threadId}`);
        throw new Error(`No active workflow found for thread ${threadId}`);
      }
      
      // Update timestamp to prevent cleanup of active workflows
      workflowData.createdAt = Date.now();
      const compiledGraph = workflowData.graph;
      
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
        const rawWebContents = (global as any).osswarmWebContents;
        const safeWebContents = rawWebContents ? createSafeWebContents(rawWebContents) : undefined;
        
        console.log('[RESUME-Timer] WebContents debug during resume:', {
          hasRawWebContents: !!rawWebContents,
          hasSafeWebContents: !!safeWebContents,
          hasIsValidMethod: safeWebContents ? typeof safeWebContents.isValid === 'function' : false,
          isValidResult: safeWebContents ? safeWebContents.isValid() : 'N/A'
        });
        
        const finalResult = await compiledGraph.invoke(
          new Command({ 
            resume: resumeValue,
            update: {
              webContents: safeWebContents,
              ipcSend: ipcSend
            }
          }),
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
          
          const finalIpcSend = finalResult?.ipcSend || ipcSend;
          if (finalIpcSend && finalResult?.executionId) {
            // Clear all task states from the UI
            finalIpcSend('agent:clear_all_task_state', {
              executionId: finalResult.executionId
            });

            // Update the execution status to completed with the final result
            finalIpcSend('agent:execution_updated', {
              executionId: finalResult.executionId,
              status: 'completed',
              result: finalResult?.synthesizedResult
            });
            
            finalIpcSend('agent:add_log_to_db', {
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
          result: isCompleted ? finalResult?.synthesizedResult : 'Workflow requires more interaction',
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
      
      const webContents = (global as any).osswarmWebContents;
      if (webContents) {
        const executionId = error.executionId || threadId.replace('agent_mode_', '').split('_')[0];
        if (executionId) {
          webContents.send('agent:execution_updated', {
            executionId: executionId,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      return {
        success: false,
        completed: false,
        error: error.message
      };
    }
  }

  public static startCleanupCycle(intervalMinutes = 5, maxAgeMinutes = 30) {
    const intervalMs = intervalMinutes * 60 * 1000;
    const maxAgeMs = maxAgeMinutes * 60 * 1000;

    setInterval(() => {
      const now = Date.now();
      for (const [threadId, workflowData] of LangGraphOSSwarmWorkflow.activeWorkflows.entries()) {
        if (now - workflowData.createdAt > maxAgeMs) {
          console.log(`[LangGraph Agent] Cleaning up old workflow due to inactivity: ${threadId}`);
          LangGraphOSSwarmWorkflow.activeWorkflows.delete(threadId);
        }
      }
    }, intervalMs);

    console.log(`[LangGraph Agent] Workflow cleanup cycle started. Checking every ${intervalMinutes} minutes.`);
  }
}
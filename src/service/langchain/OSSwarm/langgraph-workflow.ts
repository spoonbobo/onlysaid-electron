import { StateGraph, Annotation, START, END, MemorySaver, CompiledStateGraph, Command } from "@langchain/langgraph";
import { interrupt } from "@langchain/langgraph";
import { AgentExecutionResult, ToolApprovalRequest, ToolExecution } from './langgraph-state';
import { AgentRegistry } from '../agent/registry';
import { AgentFactory } from '../agent/factory';
import { LangChainServiceFactory } from '../factory';
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { LangChainAgentOptions } from '../agent';
import { 
  getHumanInTheLoopManager, 
  HumanInteractionRequest, 
  HumanInteractionResponse 
} from '../human_in_the_loop/human_in_the_loop';

// ✅ Enhanced HumanInteractionResponse type to include execution results
interface EnhancedHumanInteractionResponse extends HumanInteractionResponse {
  toolExecutionResult?: {
    success: boolean;
    result?: any;
    error?: string;
    toolName: string;
    mcpServer?: string;
  };
}

// ✅ Enhanced state to include MCP execution results
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
  // ✅ NEW: Direct MCP execution results storage
  mcpExecutionResults: Annotation<{ [toolId: string]: any }>({
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
  private humanInTheLoopManager = getHumanInTheLoopManager();
  
  private static activeWorkflows = new Map<string, any>();
  
  constructor(agentOptions: LangChainAgentOptions) {
    this.agentOptions = agentOptions;
    this.graph = this.buildWorkflow();
  }
  
  private buildWorkflow() {
    const workflow = new StateGraph(OSSwarmStateAnnotation)
      .addNode('master_coordinator', this.masterCoordinatorNode)
      .addNode('task_decomposer', this.taskDecomposerNode)
      .addNode('agent_selector', this.agentSelectorNode)
      .addNode('agent_executor', this.agentExecutorNode)
      .addNode('tool_approval', this.toolApprovalNode)
      .addNode('tool_execution', this.toolExecutionNode)
      .addNode('agent_completion', this.agentCompletionNode)
      .addNode('result_synthesizer', this.resultSynthesizerNode)
      .addEdge(START, 'master_coordinator')
      .addEdge('master_coordinator', 'task_decomposer')
      .addEdge('task_decomposer', 'agent_selector')
      .addEdge('agent_selector', 'agent_executor')
      .addConditionalEdges('agent_executor', this.routeAfterExecution, [
        'agent_executor',    // More agents to run
        'tool_approval',     // Tools need approval
        'agent_completion'   // All agents done, no tools
      ])
      .addEdge('tool_approval', 'tool_execution')
      .addEdge('tool_execution', 'agent_completion')
      .addConditionalEdges('agent_completion', this.routeAfterCompletion, [
        'agent_executor',     // More agents to run
        'tool_approval',      // New approvals detected
        'tool_execution',     // Approved tools awaiting execution / results
        'result_synthesizer'  // Everything really is finished
      ])
      .addEdge('result_synthesizer', END);
    
    return workflow;
  }
  
  private masterCoordinatorNode = async (
    state: typeof OSSwarmStateAnnotation.State
  ): Promise<Partial<typeof OSSwarmStateAnnotation.State>> => {
    console.log('[LangGraph] Master coordinator starting...');
    
    const availableAgentCards = AgentFactory.createRegistryAgentCards();
    
    await this.sendRendererUpdate(state, {
      type: 'execution_progress',
      data: {
        status: 'initializing',
        availableAgents: availableAgentCards.length,
        phase: 'master_coordination'
      }
    });
    
    return {
      availableAgentCards,
      currentPhase: 'decomposition',
      messages: [new HumanMessage(`Task: ${state.originalTask}`)]
    };
  };
  
  private routeAfterExecution = (state: typeof OSSwarmStateAnnotation.State): string => {
    console.log(`🔍 [ROUTER-EXEC] ==================== ROUTING AFTER EXECUTION ====================`);
    console.log(`🔍 [ROUTER-EXEC] Active agent cards:`, Object.keys(state.activeAgentCards));
    console.log(`🔍 [ROUTER-EXEC] Agent results:`, Object.keys(state.agentResults));
    console.log(`🔍 [ROUTER-EXEC] Pending approvals:`, state.pendingApprovals?.length || 0);
    
    const selectedRoles = Object.keys(state.activeAgentCards);
    
    // ✅ If no agents were selected, something is wrong
    if (selectedRoles.length === 0) {
      console.log(`🔍 [ROUTER-EXEC] ❌ NO AGENTS SELECTED - this should not happen!`);
      return 'agent_completion'; // Go to completion to avoid infinite loop
    }
    
    // ✅ Check for pending tool approvals first
    const hasPendingToolApprovals = state.pendingApprovals && 
      state.pendingApprovals.some(approval => approval.status === 'pending');
    
    if (hasPendingToolApprovals) {
      const pendingCount = state.pendingApprovals.filter(a => a.status === 'pending').length;
      console.log(`🔍 [ROUTER-EXEC] ➡️ Found ${pendingCount} pending tool approvals - routing to approval processor`);
      return 'tool_approval';
    }
    
    // ✅ Check if we have completed tools that need to be processed
    const completedTools = state.pendingApprovals?.filter(approval => 
      approval.status === 'executed' || approval.status === 'failed' || approval.status === 'denied'
    ) || [];
    
    if (completedTools.length > 0) {
      // Check if any of these completed tools haven't been processed into agent results yet
      const unprocessedCompletedTools = completedTools.filter(tool => {
        const agentRole = tool.agentCard.role;
        return agentRole && !state.agentResults[agentRole];
      });
      
      if (unprocessedCompletedTools.length > 0) {
        console.log(`🔍 [ROUTER-EXEC] ➡️ Found ${unprocessedCompletedTools.length} unprocessed completed tools - routing to agent completion`);
        return 'agent_completion';
      }
    }
    
    // ✅ Check if we're waiting for tool execution results
    const approvedButNotExecuted = state.pendingApprovals?.filter(approval => 
      approval.status === 'approved'
    ) || [];
    
    if (approvedButNotExecuted.length > 0) {
      console.log(`🔍 [ROUTER-EXEC] ➡️ Found ${approvedButNotExecuted.length} approved but not executed tools - routing to tool approval`);
      return 'tool_approval';
    }
    
    // ✅ Check for idle agents that haven't been executed yet
    const pendingAgent = selectedRoles.find(role => 
      state.activeAgentCards[role].status === 'idle'
    );
    
    if (pendingAgent) {
      console.log(`🔍 [ROUTER-EXEC] ➡️ Found idle agent: ${pendingAgent} - continuing execution`);
      return 'agent_executor';
    }
    
    // ✅ Check if all agents are completed - route to agent_completion (not result_synthesizer directly!)
    const completedAgents = selectedRoles.filter(role => {
      const agent = state.activeAgentCards[role];
      const hasResult = !!state.agentResults[role];
      return (agent.status === 'completed' || agent.status === 'failed') && hasResult;
    });
    
    console.log(`🔍 [ROUTER-EXEC] Completion analysis:`, {
      totalAgents: selectedRoles.length,
      completedAgents: completedAgents.length,
      completedAgentRoles: completedAgents,
      allCompleted: completedAgents.length === selectedRoles.length && selectedRoles.length > 0
    });
    
    if (completedAgents.length === selectedRoles.length && selectedRoles.length > 0) {
      console.log(`🔍 [ROUTER-EXEC] ➡️ All agents completed - routing to agent completion`);
      return 'agent_completion';
    }
    
    console.log(`🔍 [ROUTER-EXEC] ➡️ Uncertain state - staying in executor for safety`);
    return 'agent_executor';
  };
  
  private routeAfterCompletion = (state: typeof OSSwarmStateAnnotation.State): string => {
    console.log('[ROUTER-COMPLETE] analysing state…');

    if (state.pendingApprovals?.some(a => a.status === 'pending')) {
      console.log('[ROUTER-COMPLETE] ▶ pending approvals detected');
      return 'tool_approval';
    }

    if (state.pendingApprovals?.some(a => a.status === 'approved')) {
      console.log('[ROUTER-COMPLETE] ▶ approved tools waiting for execution');
      return 'tool_execution';
    }

    if (state.awaitingToolResults) {
      console.log('[ROUTER-COMPLETE] ▶ still awaiting tool results');
      return 'tool_execution';
    }

    const idle = Object.keys(state.activeAgentCards)
                 .find(r => state.activeAgentCards[r].status === 'idle');
    if (idle) {
      console.log(`[ROUTER-COMPLETE] ▶ idle agent (${idle}) found`);
      return 'agent_executor';
    }

    console.log('[ROUTER-COMPLETE] ▶ all work done – synthesising');
    return 'result_synthesizer';
  };
  
  private taskDecomposerNode = async (
    state: typeof OSSwarmStateAnnotation.State
  ): Promise<Partial<typeof OSSwarmStateAnnotation.State>> => {
    console.log('[LangGraph] Task decomposer analyzing task...');
    
    const masterConfig = AgentRegistry.getAgentConfig('master');
    if (!masterConfig) {
      throw new Error('Master agent configuration not found in registry');
    }
    
    const masterOptions: LangChainAgentOptions = {
      ...this.agentOptions,
      systemPrompt: masterConfig.systemPrompt,
    };
    
    const masterAgent = LangChainServiceFactory.createAgent(masterOptions);
    
    const decompositionPrompt = `
    Analyze this task and determine the best approach: ${state.originalTask}
    
    Available agent types from registry:
    ${state.availableAgentCards.map(card => 
      `- ${card.name} (${card.role}): ${card.description}`
    ).join('\n')}
    
    Determine which agents would be most effective for this task.
    `;
    
    const response = await masterAgent.getCompletion([{
      role: 'user',
      content: decompositionPrompt
    }]);
    
    const analysis = response.choices[0]?.message?.content || '';
    
    await this.sendRendererUpdate(state, {
      type: 'execution_progress',
      data: {
        status: 'decomposed',
        analysis: analysis.substring(0, 200) + '...'
      }
    });
    
    return {
      currentPhase: 'agent_selection',
      messages: [...state.messages, new AIMessage(analysis)]
    };
  };
  
  private agentSelectorNode = async (
    state: typeof OSSwarmStateAnnotation.State
  ): Promise<Partial<typeof OSSwarmStateAnnotation.State>> => {
    console.log('[LangGraph] Agent selector choosing optimal agents...');
    
    const selectedAgentCards = this.selectOptimalAgents(
      state.originalTask,
      state.availableAgentCards,
      state.currentPhase
    );
    
    const activeAgentCards = selectedAgentCards.reduce((acc, card) => {
      if (card.role) {
        acc[card.role] = {
          ...card,
          status: 'idle',
          runtimeId: `langgraph-${card.role}-${Date.now()}`
        };
      }
      return acc;
    }, {} as { [role: string]: AgentCard });
    
    await this.sendRendererUpdate(state, {
      type: 'execution_progress',
      data: {
        status: 'agents_selected',
        selectedAgents: Object.values(activeAgentCards).map(card => ({
          name: card.name,
          role: card.role,
          capabilities: card.capabilities
        }))
      }
    });
    
    return {
      activeAgentCards,
      currentPhase: 'execution'
    };
  };
  
  private agentExecutorNode = async (
    state: typeof OSSwarmStateAnnotation.State
  ): Promise<Partial<typeof OSSwarmStateAnnotation.State>> => {
    console.log('[LangGraph] Agent executor running...');
    
    const selectedRoles = Object.keys(state.activeAgentCards);
    
    const nextRole = selectedRoles.find(role => 
      state.activeAgentCards[role].status === 'idle'
    );
    
    if (!nextRole) {
      console.log('[LangGraph] No idle agents found, checking if all are completed...');
      
      const busyAgents = selectedRoles.filter(role => 
        state.activeAgentCards[role].status === 'busy'
      );
      
      if (busyAgents.length > 0) {
        console.log('[LangGraph] Some agents still busy, may need tool results');
        return { awaitingToolResults: true };
      }
      
      return {
        currentPhase: 'synthesis',
        waitingForHumanResponse: false,
        awaitingToolResults: false
      };
    }
    
    console.log(`[LangGraph] Executing ${nextRole} agent...`);
    
    const agentCard = state.activeAgentCards[nextRole];
    
    const updatedAgentCard: AgentCard = {
      ...agentCard,
      status: 'busy',
      currentTask: state.originalTask
    };
    
    await this.sendRendererUpdate(state, {
      type: 'agent_status',
      data: {
        agentCard: updatedAgentCard,
        status: 'busy',
        currentTask: state.originalTask
      }
    });
    
    try {
      const result = await this.executeAgentWithApproval(
        updatedAgentCard,
        state,
        nextRole
      );
      
      if (result.pendingApprovals && result.pendingApprovals.length > 0) {
        console.log(`[LangGraph] Agent ${nextRole} generated ${result.pendingApprovals.length} pending approvals`);
        
        return {
          activeAgentCards: {
            ...state.activeAgentCards,
            [nextRole]: { ...updatedAgentCard, status: 'busy' }
          },
          pendingApprovals: [...(state.pendingApprovals || []), ...result.pendingApprovals],
          waitingForHumanResponse: false,
          awaitingToolResults: false
        };
      }
      
      const finalAgentCard: AgentCard = {
        ...updatedAgentCard,
        status: result.success ? 'completed' : 'failed'
      };
      
      await this.sendRendererUpdate(state, {
        type: 'agent_status',
        data: {
          agentCard: finalAgentCard,
          status: finalAgentCard.status,
          result: result.output
        }
      });
      
      return {
        activeAgentCards: {
          ...state.activeAgentCards,
          [nextRole]: finalAgentCard
        },
        agentResults: {
          ...state.agentResults,
          [nextRole]: {
            agentCard: finalAgentCard,
            result: result.output,
            toolExecutions: result.toolExecutions || [],
            status: finalAgentCard.status || 'failed',
            startTime: result.startTime || Date.now(),
            endTime: Date.now()
          }
        },
        waitingForHumanResponse: false,
        awaitingToolResults: false
      };
      
    } catch (error: any) {
      if (error.name === 'GraphInterrupt') {
        console.log(`[LangGraph] GraphInterrupt in agentExecutorNode - re-throwing to pause entire workflow`);
        throw error;
      }
      
      console.error(`[LangGraph] ${nextRole} agent error:`, error);
      
      const failedAgentCard: AgentCard = {
        ...updatedAgentCard,
        status: 'failed'
      };
      
      return {
        activeAgentCards: {
          ...state.activeAgentCards,
          [nextRole]: failedAgentCard
        },
        errors: [...state.errors, `${nextRole} agent failed: ${error.message}`],
        waitingForHumanResponse: false,
        awaitingToolResults: false
      };
    }
  };
  
  private humanApprovalHandlerNode = async (
    state: typeof OSSwarmStateAnnotation.State
  ): Promise<Partial<typeof OSSwarmStateAnnotation.State>> => {
    console.log('[LangGraph] Human approval handler - workflow completed successfully');
    
    return {
      currentPhase: 'completed'
    };
  };
  
  private toolApprovalNode = async (
    state: typeof OSSwarmStateAnnotation.State
  ): Promise<Partial<typeof OSSwarmStateAnnotation.State>> => {
    console.log('[LangGraph] Tool approval node - processing pending approvals...');
    
    const pendingApprovals = state.pendingApprovals?.filter(approval => approval.status === 'pending') || [];
    
    if (pendingApprovals.length === 0) {
      console.log('[LangGraph] No pending approvals, continuing...');
      return { currentPhase: 'tool_execution' };
    }
    
    console.log(`[LangGraph] Processing ${pendingApprovals.length} pending approvals`);
    
    // ✅ Send interaction requests to renderer BEFORE interrupt
    for (const approval of pendingApprovals) {
      const interactionRequest: HumanInteractionRequest = {
        type: 'tool_approval',
        id: approval.id,
        title: `Approve ${approval.toolCall.function?.name || 'Tool'} Execution`,
        description: `Do you want to execute the ${approval.toolCall.function?.name} tool from ${approval.mcpServer} server?`,
        data: {
          toolCall: {
            id: approval.id,
            name: approval.toolCall.function?.name || 'unknown',
            arguments: approval.toolCall.function?.arguments,
            description: approval.toolCall.function?.description || `Execute ${approval.toolCall.function?.name} tool`,
            mcpServer: approval.mcpServer,
            risk: this.assessToolRisk(approval.toolCall.function?.name || 'unknown', approval.mcpServer)
          },
          agentCard: approval.agentCard,
          context: `${approval.agentCard.role || 'Unknown'} agent wants to use ${approval.toolCall.function?.name} for: ${state.originalTask}`,
          timestamp: approval.timestamp,
          threadId: state.threadId
        },
        timestamp: approval.timestamp,
        threadId: state.threadId
      };
      
      await this.sendHumanInteractionToRenderer(interactionRequest);
    }
    
    // ✅ Enhanced interrupt with proper typing (following documentation pattern)
    const approvalDecisions = interrupt<
      {
        type: string;
        pendingApprovals: Array<{
          id: string;
          toolName: string;
          arguments: any;
          agentRole: string;
          context: string;
          mcpServer: string;
          risk: string;
        }>;
        message: string;
      },
      Array<{
        id: string;
        approved: boolean;
        timestamp: number;
      }>
    >({
      type: 'tool_approval_request',
      pendingApprovals: pendingApprovals.map(approval => ({
        id: approval.id,
        toolName: approval.toolCall.function?.name || '',
        arguments: approval.toolCall.function?.arguments,
        agentRole: approval.agentCard.role || '',
        context: state.originalTask,
        mcpServer: approval.mcpServer || '',
        risk: this.assessToolRisk(approval.toolCall.function?.name || '', approval.mcpServer || '')
      })),
      message: `Please approve/deny ${pendingApprovals.length} tool execution(s)`
    });
    
    // ✅ Process approval decisions (this runs after resume)
    console.log('[LangGraph] Processing approval decisions:', approvalDecisions);
    
    const updatedApprovals = state.pendingApprovals?.map(approval => {
      const decision = Array.isArray(approvalDecisions) ? 
        approvalDecisions.find((d: any) => d.id === approval.id) :
        ((approvalDecisions as any)?.id === approval.id ? approvalDecisions : null);
      
      if (decision) {
        return {
          ...approval,
          status: (decision as any).approved ? ('approved' as const) : ('denied' as const),
          timestamp: Date.now()
        };
      }
      return approval;
    }) || [];
    
    return {
      pendingApprovals: updatedApprovals as ToolApprovalRequest[],
      currentPhase: 'tool_execution'
    };
  };
  
  private toolExecutionNode = async (
    state: typeof OSSwarmStateAnnotation.State
  ): Promise<Partial<typeof OSSwarmStateAnnotation.State>> => {
    console.log('[LangGraph] Tool execution node - processing approved tools...');
    
    const approvedTools = state.pendingApprovals?.filter(approval => approval.status === 'approved') || [];
    
    if (approvedTools.length === 0) {
      console.log('[LangGraph] No approved tools to execute');
      return { currentPhase: 'agent_completion' };
    }
    
    // ✅ Wait for MCP execution results using interrupt
    const mcpResults = interrupt({
      type: 'mcp_execution_request',
      approvedTools: approvedTools.map(tool => ({
        id: tool.id,
        toolName: tool.toolCall.function?.name,
        arguments: tool.toolCall.function?.arguments,
        mcpServer: tool.mcpServer
      })),
      message: `Executing ${approvedTools.length} approved tools via MCP`
    });
    
    // ✅ Process MCP execution results (this runs after resume with results)
    console.log('[LangGraph] Processing MCP execution results:', mcpResults);
    
    const updatedApprovals = state.pendingApprovals?.map(approval => {
      const mcpResult = Array.isArray(mcpResults) ?
        mcpResults.find((r: any) => r.toolId === approval.id) :
        (mcpResults?.toolId === approval.id ? mcpResults : null);
      
      if (mcpResult && approval.status === 'approved') {
        return {
          ...approval,
          status: mcpResult.success ? 'executed' as const : 'failed' as const,
          result: mcpResult.success ? mcpResult.result : mcpResult.error,
          timestamp: Date.now()
        };
      }
      return approval;
    }) || [];
    
    // ✅ Store MCP results in state for agent processing
    const mcpExecutionResults = { ...state.mcpExecutionResults };
    if (Array.isArray(mcpResults)) {
      mcpResults.forEach((result: any) => {
        mcpExecutionResults[result.toolId] = result;
      });
    }
    
    return {
      pendingApprovals: updatedApprovals as ToolApprovalRequest[],
      mcpExecutionResults,
      currentPhase: 'agent_completion'
    };
  };
  
  private agentCompletionNode = async (
    state: typeof OSSwarmStateAnnotation.State
  ): Promise<Partial<typeof OSSwarmStateAnnotation.State>> => {
    console.log('[LangGraph] Agent completion node - finalizing agent results...');
    
    const completedTools = state.pendingApprovals?.filter(approval => 
      approval.status === 'executed' || approval.status === 'failed' || approval.status === 'denied'
    ) || [];
    
    const updatedAgentCards = { ...state.activeAgentCards };
    const updatedAgentResults = { ...state.agentResults };
    
    // ✅ Group tools by agent and create results using MCP execution data
    const toolsByAgent = completedTools.reduce((acc, tool) => {
      const agentRole = tool.agentCard.role || '';
      if (!acc[agentRole]) acc[agentRole] = [];
      acc[agentRole].push(tool);
      return acc;
    }, {} as Record<string, ToolApprovalRequest[]>);
    
    for (const [role, agentTools] of Object.entries(toolsByAgent)) {
      if (agentTools.length > 0 && updatedAgentCards[role] && !updatedAgentResults[role]) {
        const executedTools = agentTools.filter(tool => tool.status === 'executed');
        const hasSuccessfulTools = executedTools.length > 0;
        const newStatus = hasSuccessfulTools ? 'completed' : 'failed';
        
        // ✅ Create comprehensive result using MCP execution results
        const toolResults = agentTools.map(tool => {
          const mcpResult = state.mcpExecutionResults[tool.id];
          if (mcpResult && tool.status === 'executed') {
            const resultStr = typeof mcpResult.result === 'string' ? 
              mcpResult.result : JSON.stringify(mcpResult.result);
            return `**${tool.toolCall.function?.name}**:\n${resultStr}`;
          } else {
            return `**${tool.toolCall.function?.name}**: ${tool.status}`;
          }
        }).join('\n\n');
        
        updatedAgentCards[role] = { ...updatedAgentCards[role], status: newStatus };
        updatedAgentResults[role] = {
          agentCard: updatedAgentCards[role],
          result: toolResults || `Agent ${role} completed with ${agentTools.length} tools`,
          toolExecutions: [],
          status: newStatus,
          startTime: Date.now(),
          endTime: Date.now()
        };

        /* Notify renderer so ToolDisplay & chat UI refresh immediately */
        await this.sendRendererUpdate(state, {
          type: 'agent_status',
          data: {
            agentCard: updatedAgentCards[role],
            status: newStatus,
            result: updatedAgentResults[role].result
          }
        });
        
        console.log(`[LangGraph] Agent ${role} completed with status: ${newStatus}`);
      }
    }
    
    /* Don't force currentPhase to 'synthesis' – let router decide */
    return {
      activeAgentCards: updatedAgentCards,
      agentResults: updatedAgentResults
    };
  };
  
  private resultSynthesizerNode = async (
    state: typeof OSSwarmStateAnnotation.State
  ): Promise<Partial<typeof OSSwarmStateAnnotation.State>> => {
    console.log('[LangGraph] Result synthesizer combining agent outputs...');
    
    const masterConfig = AgentRegistry.getAgentConfig('master');
    const masterAgent = LangChainServiceFactory.createAgent({
        ...this.agentOptions,
        systemPrompt: masterConfig?.systemPrompt || 'You are a master coordinator.',
      });
    
    const agentResults = Object.values(state.agentResults);
    const resultsText = agentResults.map(result => 
      `${result.agentCard.name} (${result.agentCard.role}): ${result.result}`
    ).join('\n\n');
    
    const synthesisPrompt = `
    Synthesize these agent results into a comprehensive final response for: ${state.originalTask}
    
    Agent Results:
    ${resultsText}
    
    Provide a well-structured, comprehensive response.
    `;
    
    const response = await masterAgent.getCompletion([{
      role: 'user',
      content: synthesisPrompt
    }]);
    
    const synthesizedResult = response.choices[0]?.message?.content || '';
    
    await this.sendRendererUpdate(state, {
      type: 'result_synthesis',
      data: {
        result: synthesizedResult,
        agentContributions: agentResults.length
      }
    });
    
    return {
      synthesizedResult,
      currentPhase: 'validation',
      messages: [...state.messages, new AIMessage(synthesizedResult)]
    };
  };
  
  private selectOptimalAgents(
    task: string,
    availableCards: AgentCard[],
    kbContext?: any
  ): AgentCard[] {
    console.log('[LangGraph] Selecting agents from:', availableCards.map(c => c.role));
    
    const selectedCards: AgentCard[] = [];
    
    const researchAgent = availableCards.find(card => card.role === 'research');
    if (researchAgent) selectedCards.push(researchAgent);
    
    if (kbContext?.enabled) {
      const ragAgent = availableCards.find(card => card.role === 'rag');
      if (ragAgent) selectedCards.push(ragAgent);
    }
    
    if (task.length > 100) {
      const analysisAgent = availableCards.find(card => card.role === 'analysis');
      if (analysisAgent) selectedCards.push(analysisAgent);
    }
    
    // ✅ FALLBACK: If no agents selected, pick the first available one
    if (selectedCards.length === 0 && availableCards.length > 0) {
      console.log('[LangGraph] No agents matched criteria, selecting first available agent');
      selectedCards.push(availableCards[0]);
    }
    
    console.log('[LangGraph] Selected agents:', selectedCards.map(c => c.role));
    return selectedCards;
  }
  
  private async executeAgentWithApproval(
    agentCard: AgentCard,
    state: typeof OSSwarmStateAnnotation.State,
    role: string
  ): Promise<{ 
    success: boolean; 
    output: string; 
    toolExecutions?: ToolExecution[]; 
    startTime?: number; 
    pendingApprovals?: ToolApprovalRequest[] 
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`[LangGraph] executeAgentWithApproval starting for ${role} agent`);
      
      const config = AgentRegistry.getAgentConfig(role);
      if (!config) {
        throw new Error(`Configuration not found for role: ${role}`);
      }
      
      const agentOptions: LangChainAgentOptions = {
        ...this.agentOptions,
        systemPrompt: config.systemPrompt,
        tools: this.agentOptions.tools || [],
      };
      
      const agentService = LangChainServiceFactory.createAgent(agentOptions);
      
      console.log(`[LangGraph] Calling agent service with prompt...`);
      const response = await agentService.getCompletion([{
        role: 'user',
        content: `As a ${role} agent, help with this task: ${state.originalTask}`
      }]);
      
      const output = response.choices[0]?.message?.content || '';
      
      if (response.choices[0]?.message?.tool_calls && response.choices[0].message.tool_calls.length > 0) {
        console.log(`[LangGraph] Agent ${role} wants to use ${response.choices[0].message.tool_calls.length} tools`);
        
        const pendingApprovals: ToolApprovalRequest[] = [];
        
        for (const toolCall of response.choices[0].message.tool_calls) {
          const toolName = toolCall.function?.name || 'unknown';
          const toolArgs = toolCall.function?.arguments;
          
          const originalTool = agentOptions.tools?.find(t => t.function?.name === toolName);
          const mcpServer = (originalTool as any)?.mcpServer || 'unknown';
          const risk = this.assessToolRisk(toolName, mcpServer);
          
          console.log(`[LangGraph] Creating pending approval for tool: ${toolName} from ${mcpServer}`);
          
          const approvalRequest: ToolApprovalRequest = {
            id: `langgraph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agentCard: agentCard,
            toolCall: {
              ...toolCall,
              mcpServer: mcpServer
            },
            context: `${role} agent wants to use ${toolName} for: ${state.originalTask}`,
            timestamp: Date.now(),
            risk: risk,
            status: 'pending',
            mcpServer: mcpServer
          };
          
          pendingApprovals.push(approvalRequest);
        }
        
        console.log(`[LangGraph] Returning ${pendingApprovals.length} pending approvals for processing`);
        
        return {
          success: false,
          output: `${output}\n\n**Waiting for approval of ${pendingApprovals.length} tools...**`,
          startTime,
          pendingApprovals
        };
      }
      
      return {
        success: true,
        output,
        startTime
      };
      
    } catch (error: any) {
      if (error.name === 'GraphInterrupt') {
        console.log(`[LangGraph] GraphInterrupt - letting it bubble up to pause workflow`);
        throw error;
      }
      
      console.error(`[LangGraph] Agent execution failed:`, error);
      return {
        success: false,
        output: `Agent execution failed: ${error.message}`,
        startTime
      };
    }
  }
  
  private assessToolRisk(toolName: string, mcpServer: string): 'low' | 'medium' | 'high' {
    const highRiskTools = ['file_write', 'system_command', 'delete_file', 'exec'];
    const highRiskServers = ['system', 'admin'];
    
    const mediumRiskTools = ['web_search', 'api_call', 'database_query'];
    const mediumRiskServers = ['web', 'api'];
    
    if (highRiskTools.some(risk => toolName.toLowerCase().includes(risk)) || 
        highRiskServers.includes(mcpServer.toLowerCase())) {
      return 'high';
    }
    
    if (mediumRiskTools.some(risk => toolName.toLowerCase().includes(risk)) || 
        mediumRiskServers.includes(mcpServer.toLowerCase())) {
      return 'medium';
    }
    
    return 'low';
  }
  
  private async sendRendererUpdate(state: typeof OSSwarmStateAnnotation.State, update: any): Promise<void> {
    if (state.streamCallback) {
      state.streamCallback(`[LangGraph OSSwarm] ${update.type}: ${JSON.stringify(update.data)}`);
    }
    
    const webContents = (global as any).osswarmWebContents;
    if (webContents && !webContents.isDestroyed()) {
      switch (update.type) {
        case 'agent_status':
          webContents.send('agent:agent_updated', {
            agentCard: update.data.agentCard,
            status: update.data.status,
            currentTask: update.data.currentTask,
            executionId: state.executionId
          });
          break;
          
        case 'execution_progress':
          webContents.send('agent:execution_updated', {
            executionId: state.executionId,
            status: update.data.status,
            progress: update.data
          });
          break;
          
        case 'result_synthesis':
          webContents.send('agent:result_synthesized', {
            executionId: state.executionId,
            result: update.data.result,
            agentCards: Object.values(state.activeAgentCards)
          });
          break;
      }
    }
  }
  
  compile() {
    const compiledGraph = this.graph.compile({
      checkpointer: new MemorySaver(),
      interruptBefore: [],
      interruptAfter: []
    });
    
    console.log('[LangGraph] Workflow compiled successfully');
    return compiledGraph;
  }
  
  public async executeWorkflow(
    task: string,
    threadId: string,
    options: any = {}
  ) {
    console.log(`[LangGraph-WORKFLOW] Workflow execution parameters:`, {
      task: task.substring(0, 100) + '...',
      threadId,
      optionsKeys: Object.keys(options),
      hasStreamCallback: typeof options.streamCallback === 'function',
      executionId: options.executionId,
      chatId: options.chatId,
      workspaceId: options.workspaceId
    });
    
    try {
      console.log(`[LangGraph-WORKFLOW] Compiling workflow...`);
      const compiledGraph = this.compile();
      console.log(`[LangGraph-WORKFLOW] Workflow compiled successfully`);
      
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
      
      const result = await compiledGraph.invoke(initialState, config);
      
      const finalResult =
        result?.synthesizedResult ||
        Object.values(result?.agentResults || {})
              .map((r: any) => r.result)
              .join('\n\n') ||
        `Task "${task}" completed.`;

      return {
        success: true,
        result: finalResult,
        workflowState: result
      };
      
    } catch (error: any) {
      console.log(`[LangGraph-WORKFLOW] Exception details:`, {
        name: error.name,
        message: error.message,
        hasInterrupts: !!error.interrupts,
        interruptCount: error.interrupts?.length || 0
      });
      
      if (error.name === 'GraphInterrupt') {
        console.log(`[LangGraph-WORKFLOW] GraphInterrupt detected - workflow paused for human interaction`);
        console.log(`[LangGraph-WORKFLOW] Interrupt data:`, error.interrupts?.[0]?.value);
        
        return {
          success: true,
          result: 'Workflow paused for human interaction',
          requiresHumanInteraction: true,
          interruptData: error.interrupts?.[0]?.value
        };
      }
      
      console.error(`[LangGraph-WORKFLOW] Actual workflow error:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      LangGraphOSSwarmWorkflow.activeWorkflows.delete(threadId);
      console.log(`[LangGraph-WORKFLOW] Cleaned up failed workflow for thread: ${threadId}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ✅ UPDATED: Resume workflow using Command pattern with MCP integration
  public static async resumeWorkflow(
    threadId: string,
    humanResponse: EnhancedHumanInteractionResponse
  ) {
    console.log(`🔍 [RESUME] Resuming workflow with enhanced Command pattern...`);
    
    try {
      const compiledGraph = LangGraphOSSwarmWorkflow.activeWorkflows.get(threadId);
      
      if (!compiledGraph) {
        throw new Error(`No active workflow found for thread ${threadId}`);
      }
      
      // ✅ Create properly structured resume value following documentation patterns
      let resumeValue: any;
      
      if (humanResponse.toolExecutionResult) {
        // ✅ MCP execution result - array format as shown in docs
        resumeValue = [{
          toolId: humanResponse.id,
          success: humanResponse.toolExecutionResult.success,
          result: humanResponse.toolExecutionResult.result,
          error: humanResponse.toolExecutionResult.error,
          toolName: humanResponse.toolExecutionResult.toolName,
          mcpServer: humanResponse.toolExecutionResult.mcpServer
        }];
      } else {
        // ✅ Approval decision - array format for multiple approvals
        resumeValue = [{
          id: humanResponse.id,
          approved: humanResponse.approved,
          timestamp: Date.now()
        }];
      }
      
      const config = { configurable: { thread_id: threadId } };
      
      // ✅ Resume using Command as per LangGraph documentation
      const result = await compiledGraph.stream(
        new Command({ resume: resumeValue }),
        config
      );
      
      // ✅ Process the stream result properly
      let finalResult: any = null;
      for await (const event of result) {
        finalResult = event;
      }
      
      const isCompleted = finalResult?.synthesizedResult || finalResult?.currentPhase === 'completed';
      
      if (isCompleted) {
        LangGraphOSSwarmWorkflow.activeWorkflows.delete(threadId);
      }
      
      return {
        success: true,
        completed: isCompleted,
        result: finalResult?.synthesizedResult || finalResult,
        requiresHumanInteraction: !isCompleted
      };
      
    } catch (error: any) {
      if (error.name === 'GraphInterrupt') {
        return {
          success: true,
          completed: false,
          result: 'Workflow paused for interaction',
          requiresHumanInteraction: true,
          interruptData: error.interrupts?.[0]?.value
        };
      }
      
      console.error(`🔍 [RESUME] Resume error:`, error);
      LangGraphOSSwarmWorkflow.activeWorkflows.delete(threadId);
      
      return {
        success: false,
        completed: false,
        error: error.message
      };
    }
  }
  
  public static cleanupWorkflow(threadId: string) {
    LangGraphOSSwarmWorkflow.activeWorkflows.delete(threadId);
    console.log(`[LangGraph] Cleaned up workflow for thread: ${threadId}`);
  }

  // ✅ Add the missing sendHumanInteractionToRenderer method
  private async sendHumanInteractionToRenderer(request: HumanInteractionRequest): Promise<void> {
    console.log(`[LangGraph-DEBUG] Sending interaction to renderer:`, {
      requestId: request.id,
      type: request.type,
      threadId: request.threadId,
      timestamp: request.timestamp,
      hasData: !!request.data
    });
    
    const webContents = (global as any).osswarmWebContents;
    console.log(`[LangGraph-DEBUG] WebContents state:`, {
      exists: !!webContents,
      isDestroyed: webContents ? webContents.isDestroyed() : 'N/A',
      globalExists: !!(global as any).osswarmWebContents
    });
    
    if (webContents && !webContents.isDestroyed()) {
      webContents.send('agent:human_interaction_request', {
        interactionId: request.id,
        request
      });
      
      console.log(`[LangGraph-DEBUG] IPC message sent successfully`);
    } else {
      console.log(`[LangGraph-DEBUG] Cannot send IPC - WebContents unavailable`);
    }
  }
}
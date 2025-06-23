import { WorkflowState } from './types';

export class WorkflowRouters {
  routeAfterExecution = (state: WorkflowState): string => {
    console.log(`🔍 [ROUTER-EXEC] ==================== ROUTING AFTER EXECUTION ====================`);
    console.log(`🔍 [ROUTER-EXEC] Active agent cards:`, Object.keys(state.activeAgentCards));
    console.log(`🔍 [ROUTER-EXEC] Agent results:`, Object.keys(state.agentResults));
    console.log(`🔍 [ROUTER-EXEC] Pending approvals:`, state.pendingApprovals?.length || 0);
    
    const selectedRoles = Object.keys(state.activeAgentCards);
    
    // If no agents were selected, something is wrong
    if (selectedRoles.length === 0) {
      console.log(`🔍 [ROUTER-EXEC] ❌ NO AGENTS SELECTED - this should not happen!`);
      return 'agent_completion'; // Go to completion to avoid infinite loop
    }
    
    // Check for pending tool approvals first
    const hasPendingToolApprovals = state.pendingApprovals && 
      state.pendingApprovals.some(approval => approval.status === 'pending');
    
    if (hasPendingToolApprovals) {
      const pendingCount = state.pendingApprovals.filter(a => a.status === 'pending').length;
      console.log(`🔍 [ROUTER-EXEC] ➡️ Found ${pendingCount} pending tool approvals - routing to approval processor`);
      return 'tool_approval';
    }
    
    // Check if we have completed tools that need to be processed
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
    
    // Check if we're waiting for tool execution results
    const approvedButNotExecuted = state.pendingApprovals?.filter(approval => 
      approval.status === 'approved'
    ) || [];
    
    if (approvedButNotExecuted.length > 0) {
      console.log(`🔍 [ROUTER-EXEC] ➡️ Found ${approvedButNotExecuted.length} approved but not executed tools - routing to tool approval`);
      return 'tool_approval';
    }
    
    // Check for idle agents that haven't been executed yet
    const pendingAgent = selectedRoles.find(role => 
      state.activeAgentCards[role].status === 'idle'
    );
    
    if (pendingAgent) {
      console.log(`🔍 [ROUTER-EXEC] ➡️ Found idle agent: ${pendingAgent} - continuing execution`);
      return 'agent_executor';
    }
    
    // Check if all agents are completed - route to agent_completion (not result_synthesizer directly!)
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
  
  routeAfterCompletion = (state: WorkflowState): string => {
    console.log('[ROUTER-COMPLETE] analysing state…');

    // More robust check for truly pending approvals
    const trulyPendingApprovals = state.pendingApprovals?.filter(a => 
      a.status === 'pending' && 
      !a.processed && 
      !state.mcpExecutionResults[a.id]
    ) || [];

    console.log('[ROUTER-COMPLETE] Detailed approval analysis:', {
      totalApprovals: state.pendingApprovals?.length || 0,
      trulyPending: trulyPendingApprovals.length,
      pendingDetails: state.pendingApprovals?.map(a => ({
        id: a.id,
        status: a.status,
        processed: a.processed,
        hasMcpResult: !!state.mcpExecutionResults[a.id]
      }))
    });

    if (trulyPendingApprovals.length > 0) {
      console.log(`[ROUTER-COMPLETE] ▶ ${trulyPendingApprovals.length} truly pending approvals detected`);
      return 'tool_approval';
    }

    // Check for approved tools that haven't been executed AND processed
    const approvedNotExecuted = state.pendingApprovals?.filter(a => 
      a.status === 'approved' && 
      !a.processed && 
      !state.mcpExecutionResults[a.id]
    ) || [];

    if (approvedNotExecuted.length > 0) {
      console.log(`[ROUTER-COMPLETE] ▶ ${approvedNotExecuted.length} approved tools waiting for execution`);
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
} 
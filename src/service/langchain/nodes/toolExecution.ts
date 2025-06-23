import { interrupt } from "@langchain/langgraph";
import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { ToolApprovalRequest } from '../agent/state';

export class ToolExecutionNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph-Timer] Tool execution node - processing approved tools...');
    
    const approvedTools = state.pendingApprovals?.filter(approval => approval.status === 'approved') || [];
    
    if (approvedTools.length === 0) {
      console.log('[LangGraph-Timer] No approved tools to execute');
      return { currentPhase: 'agent_completion' };
    }
    
    // Update execution start times for approved tools
    const updatedToolTimings = { ...state.toolTimings };
    const executionStartTime = Date.now();
    
    approvedTools.forEach(tool => {
      if (updatedToolTimings[tool.id]) {
        updatedToolTimings[tool.id].executionStartTime = executionStartTime;
        console.log(`[LangGraph-Timer] Started execution timer for ${tool.id} at ${new Date(executionStartTime).toLocaleTimeString()}`);
      }
    });
    
    // Wait for MCP execution results using interrupt
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
    
    // Process MCP execution results with timing (this runs after resume with results)
    console.log('[LangGraph-Timer] Processing MCP execution results:', mcpResults);
    const executionEndTime = Date.now();
    
    const updatedApprovals = state.pendingApprovals?.map(approval => {
      const mcpResult = Array.isArray(mcpResults) ?
        mcpResults.find((r: any) => r.toolId === approval.id) :
        (mcpResults?.toolId === approval.id ? mcpResults : null);
      
      if (mcpResult && approval.status === 'approved') {
        // Update timing information
        const timing = updatedToolTimings[approval.id];
        if (timing) {
          timing.executionEndTime = executionEndTime;
          if (timing.executionStartTime) {
            timing.executionDuration = Math.floor((timing.executionEndTime - timing.executionStartTime) / 1000);
          }
          if (timing.approvalStartTime) {
            timing.totalDuration = Math.floor((timing.executionEndTime - timing.approvalStartTime) / 1000);
          }
          
          console.log(`[LangGraph-Timer] Tool ${approval.id} execution completed:`, {
            executionDuration: timing.executionDuration,
            totalDuration: timing.totalDuration,
            success: mcpResult.success
          });
        }
        
        return {
          ...approval,
          status: mcpResult.success ? 'executed' as const : 'failed' as const,
          result: mcpResult.success ? mcpResult.result : mcpResult.error,
          timestamp: executionEndTime
        };
      }
      return approval;
    }) || [];
    
    // Store MCP results in state for agent processing
    const mcpExecutionResults = { ...state.mcpExecutionResults };
    if (Array.isArray(mcpResults)) {
      mcpResults.forEach((result: any) => {
        mcpExecutionResults[result.toolId] = {
          ...result,
          timing: updatedToolTimings[result.toolId]
        };
      });
    }
    
    return {
      pendingApprovals: updatedApprovals as ToolApprovalRequest[],
      mcpExecutionResults,
      toolTimings: updatedToolTimings,
      currentPhase: 'agent_completion'
    };
  }
} 
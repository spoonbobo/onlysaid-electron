import { interrupt } from "@langchain/langgraph";
import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult, EnhancedHumanInteractionResponse } from './types';
import { ToolApprovalRequest } from '../agent/state';
import { HumanInteractionRequest } from '../human_in_the_loop/renderer/human_in_the_loop';

export class ToolApprovalNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph-Timer] Tool approval node - processing pending approvals...');
    const currentTime = Date.now();
    
    // Check for truly pending approvals that need human interaction
    const pendingApprovals = state.pendingApprovals?.filter(approval => 
      approval.status === 'pending' && !approval.processed && !state.mcpExecutionResults[approval.id]
    ) || [];
    
    console.log('[LangGraph-Timer] Pending approvals analysis:', {
      totalApprovals: state.pendingApprovals?.length || 0,
      trulyPending: pendingApprovals.length,
      hasMcpResults: Object.keys(state.mcpExecutionResults || {}).length,
      pendingIds: pendingApprovals.map(a => a.id)
    });
    
    // Initialize timing for new pending approvals
    const updatedToolTimings = { ...state.toolTimings };
    pendingApprovals.forEach(approval => {
      if (!updatedToolTimings[approval.id]) {
        updatedToolTimings[approval.id] = {
          approvalStartTime: approval.timestamp || currentTime
        };
        console.log(`[LangGraph-Timer] Started approval timer for ${approval.id} at ${new Date(updatedToolTimings[approval.id].approvalStartTime).toLocaleTimeString()}`);
      }
    });
    
    // Check if we're receiving tool execution results from resume
    const hasToolExecutionResults = state.mcpExecutionResults && Object.keys(state.mcpExecutionResults).length > 0;
    
    if (hasToolExecutionResults && pendingApprovals.length === 0) {
      console.log('[LangGraph-Timer] Processing tool execution results from resume...');
      
      // Update approvals and calculate timing
      const updatedApprovals = state.pendingApprovals?.map(approval => {
        const mcpResult = state.mcpExecutionResults[approval.id];
        if (mcpResult && !approval.processed) {
          const timing = updatedToolTimings[approval.id];
          if (timing) {
            timing.executionEndTime = currentTime;
            if (timing.executionStartTime) {
              timing.executionDuration = Math.floor((timing.executionEndTime - timing.executionStartTime) / 1000);
            }
            if (timing.approvalStartTime) {
              timing.totalDuration = Math.floor((timing.executionEndTime - timing.approvalStartTime) / 1000);
            }
            
            console.log(`[LangGraph-Timer] Tool ${approval.id} completed - Total: ${timing.totalDuration}s, Execution: ${timing.executionDuration}s`);
          }
          
          console.log(`[LangGraph-Timer] Updating approval ${approval.id} with execution result:`, mcpResult.success ? 'executed' : 'failed');
          return {
            ...approval,
            status: mcpResult.success ? 'executed' as const : 'failed' as const,
            result: mcpResult.success ? mcpResult.result : mcpResult.error,
            timestamp: currentTime,
            processed: true
          };
        }
        return approval;
      }) || [];
      
      console.log('[LangGraph-Timer] Tool execution results processed, moving to agent completion');
      
      return {
        pendingApprovals: updatedApprovals as ToolApprovalRequest[],
        toolTimings: updatedToolTimings,
        currentPhase: 'agent_completion'
      };
    }
    
    // Check if any tools have been marked as executed by the UI
    const executedByUI = state.pendingApprovals?.some(approval => 
      approval.status === 'executed' && !approval.processed
    ) || false;
    
    if (executedByUI && pendingApprovals.length === 0) {
      console.log('[LangGraph-Timer] Found tools executed by UI, proceeding to agent completion...');
      
      // Mark executed tools as processed and update timing
      const updatedApprovals = state.pendingApprovals?.map(approval => {
        if (approval.status === 'executed' && !approval.processed) {
          const timing = updatedToolTimings[approval.id];
          if (timing && !timing.executionEndTime) {
            timing.executionEndTime = currentTime;
            if (timing.executionStartTime) {
              timing.executionDuration = Math.floor((timing.executionEndTime - timing.executionStartTime) / 1000);
            }
            if (timing.approvalStartTime) {
              timing.totalDuration = Math.floor((timing.executionEndTime - timing.approvalStartTime) / 1000);
            }
          }
          return { ...approval, processed: true };
        }
        return approval;
      }) || [];
      
      return { 
        pendingApprovals: updatedApprovals as ToolApprovalRequest[],
        toolTimings: updatedToolTimings,
        currentPhase: 'agent_completion' 
      };
    }
    
    // Handle truly pending approvals that need human interaction
    if (pendingApprovals.length === 0) {
      console.log('[LangGraph-Timer] No truly pending approvals, checking for approved tools...');
      
      const approvedTools = state.pendingApprovals?.filter(approval => 
        approval.status === 'approved' && !approval.processed && !state.mcpExecutionResults[approval.id]
      ) || [];
      
      if (approvedTools.length > 0) {
        console.log('[LangGraph-Timer] Found approved tools, moving to tool execution...');
        
        // ✅ ADD: Save tool executions to database via IPC
        const webContents = (global as any).osswarmWebContents;
        
        if (webContents && approvedTools.length > 0) {
          for (const approval of approvedTools) {
            try {
              console.log('[ToolApproval] Saving tool execution to database via IPC:', approval.toolCall.function?.name);
              
              webContents.send('agent:save_tool_execution_to_db', {
                executionId: state.executionId,
                agentId: approval.agentCard.runtimeId || 'default',
                toolName: approval.toolCall.function?.name || 'unknown',
                toolArguments: approval.toolCall.function?.arguments,
                approvalId: approval.id,
                taskId: null,
                mcpServer: approval.mcpServer
              });
              
              webContents.send('agent:add_log_to_db', {
                executionId: state.executionId,
                logType: 'tool_request',
                message: `Tool execution approved: ${approval.toolCall.function?.name}`,
                metadata: { approval }
              });
              
            } catch (error) {
              console.error('[ToolApproval] Error emitting save tool execution IPC:', error);
            }
          }
        }
        
        return { 
          toolTimings: updatedToolTimings,
          currentPhase: 'tool_execution' 
        };
      }
      
      console.log('[LangGraph-Timer] No pending or approved tools, moving to agent completion...');
      return { 
        toolTimings: updatedToolTimings,
        currentPhase: 'agent_completion' 
      };
    }
    
    console.log(`[LangGraph-Timer] Processing ${pendingApprovals.length} pending approvals - sending to UI for approval`);
    
    // Send interaction requests to renderer BEFORE interrupt
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
    
    // Enhanced interrupt with proper typing - THIS IS WHERE IT SHOULD PAUSE
    const approvalDecisions = interrupt({
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
    
    // This code only runs after human response - process approval decisions
    console.log('[LangGraph-Timer] Processing approval decision from resume:', approvalDecisions);
    
    let updatedMcpResults = { ...state.mcpExecutionResults };
    const approvalTime = Date.now();
    
    const updatedApprovals = state.pendingApprovals?.map(approval => {
      // Handle case where resume contains execution results with timing
      if (approvalDecisions.toolExecutionResult && approvalDecisions.id === approval.id) {
        const execResult = approvalDecisions.toolExecutionResult;
        
        // Update timing information
        const timing = updatedToolTimings[approval.id] || { approvalStartTime: approval.timestamp || currentTime };
        
        if (!timing.executionStartTime && execResult.startTime) {
          timing.executionStartTime = execResult.startTime;
        }
        
        if (execResult.endTime) {
          timing.executionEndTime = execResult.endTime;
        } else {
          timing.executionEndTime = approvalTime;
        }
        
        // Calculate durations
        if (timing.executionStartTime && timing.executionEndTime) {
          timing.executionDuration = execResult.executionDuration || Math.floor((timing.executionEndTime - timing.executionStartTime) / 1000);
        }
        
        if (timing.approvalStartTime) {
          timing.approvalDuration = Math.floor((timing.executionStartTime || approvalTime) - timing.approvalStartTime) / 1000;
          timing.totalDuration = Math.floor((timing.executionEndTime || approvalTime) - timing.approvalStartTime) / 1000;
        }
        
        updatedToolTimings[approval.id] = timing;
        
        console.log(`[LangGraph-Timer] Processing tool execution result for ${approval.id}:`, {
          success: execResult.success,
          toolName: execResult.toolName,
          executionDuration: timing.executionDuration,
          totalDuration: timing.totalDuration,
          approvalDuration: timing.approvalDuration
        });
        
        // Store execution result in mcpExecutionResults
        updatedMcpResults[approval.id] = {
          toolId: approval.id,
          success: execResult.success,
          result: execResult.result,
          error: execResult.error,
          toolName: execResult.toolName,
          mcpServer: execResult.mcpServer,
          timing: timing
        };
        
        return {
          ...approval,
          status: execResult.success ? 'executed' as const : 'failed' as const,
          result: execResult.success ? execResult.result : execResult.error,
          timestamp: approvalTime,
          processed: true
        };
      }
      
      // Standard approval/denial logic with timing
      if (approvalDecisions.id === approval.id) {
        const timing = updatedToolTimings[approval.id] || { approvalStartTime: approval.timestamp || currentTime };
        
        if (approvalDecisions.approved) {
          // Set execution start time for approved tools
          timing.executionStartTime = approvalTime;
          timing.approvalDuration = Math.floor((approvalTime - timing.approvalStartTime) / 1000);
          
          console.log(`[LangGraph-Timer] Tool ${approval.id} approved after ${timing.approvalDuration}s - execution starting`);
        } else {
          // Mark as denied with timing
          timing.executionEndTime = approvalTime;
          timing.totalDuration = Math.floor((approvalTime - timing.approvalStartTime) / 1000);
          
          console.log(`[LangGraph-Timer] Tool ${approval.id} denied after ${timing.totalDuration}s`);
        }
        
        updatedToolTimings[approval.id] = timing;
        
        return {
          ...approval,
          status: approvalDecisions.approved ? ('approved' as const) : ('denied' as const),
          timestamp: approvalTime,
          processed: approvalDecisions.approved ? false : true
        };
      }
      
      return approval;
    }) || [];
    
    // Check if any tools were executed directly
    const hasDirectExecutions = updatedApprovals.some(approval => 
      approval.status === 'executed' && approval.processed
    );
    
    console.log(`[LangGraph-Timer] Approval processing complete:`, {
      hasDirectExecutions,
      nextPhase: hasDirectExecutions ? 'agent_completion' : 'tool_execution',
      timingUpdates: Object.keys(updatedToolTimings).length
    });
    
    return {
      pendingApprovals: updatedApprovals as ToolApprovalRequest[],
      mcpExecutionResults: updatedMcpResults,
      toolTimings: updatedToolTimings,
      currentPhase: hasDirectExecutions ? 'agent_completion' : 'tool_execution'
    };
  }

  private async sendHumanInteractionToRenderer(request: HumanInteractionRequest): Promise<void> {
    console.log(`[LangGraph-DEBUG] Sending interaction to renderer:`, {
      requestId: request.id,
      type: request.type,
      threadId: request.threadId
    });
    
    const webContents = (global as any).osswarmWebContents;
    if (webContents && !webContents.isDestroyed()) {
      webContents.send('agent:human_interaction_request', {
        interactionId: request.id,
        request
      });
    }
  }
} 
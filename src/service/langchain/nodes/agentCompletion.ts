import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { ToolApprovalRequest } from '../agent/state';
import { SubTask } from './taskDecomposer';

export class AgentCompletionNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph-Timer] Agent completion node - finalizing agent results...');
    
    // Only process tools that have been executed/failed/denied and not yet processed into agent results
    const completedTools = state.pendingApprovals?.filter(approval => 
      (approval.status === 'executed' || approval.status === 'failed' || approval.status === 'denied') &&
      approval.processed !== false // Either processed=true or undefined (legacy)
    ) || [];
    
    const updatedAgentCards = { ...state.activeAgentCards };
    const updatedAgentResults = { ...state.agentResults };
    
    // Group tools by agent and create results using MCP execution data with timing
    const toolsByAgent = completedTools.reduce((acc, tool) => {
      const agentRole = tool.agentCard.role || '';
      if (!acc[agentRole]) acc[agentRole] = [];
      acc[agentRole].push(tool);
      return acc;
    }, {} as Record<string, ToolApprovalRequest[]>);
    
    let anyAgentUpdated = false;
    
    for (const [role, agentTools] of Object.entries(toolsByAgent)) {
      if (agentTools.length > 0 && updatedAgentCards[role] && !updatedAgentResults[role]) {
        const executedTools = agentTools.filter(tool => tool.status === 'executed');
        const hasSuccessfulTools = executedTools.length > 0;
        const newStatus = hasSuccessfulTools ? 'completed' : 'failed';
        
        // Create comprehensive result using MCP execution results with timing
        const toolResults = agentTools.map(tool => {
          const mcpResult = state.mcpExecutionResults[tool.id];
          const timing = state.toolTimings[tool.id];
          
          let resultStr = `**${tool.toolCall.function?.name}**`;
          
          // Add timing information
          if (timing) {
            const timingParts = [];
            if (timing.totalDuration !== undefined) timingParts.push(`Total: ${timing.totalDuration}s`);
            if (timing.executionDuration !== undefined) timingParts.push(`Exec: ${timing.executionDuration}s`);
            if (timing.approvalDuration !== undefined) timingParts.push(`Approval: ${timing.approvalDuration}s`);
            
            if (timingParts.length > 0) {
              resultStr += ` (${timingParts.join(', ')})`;
            }
          }
          
          // Add result content
          if (mcpResult && tool.status === 'executed') {
            const resultContent = typeof mcpResult.result === 'string' ? 
              mcpResult.result : JSON.stringify(mcpResult.result);
            resultStr += `:\n${resultContent}`;
          } else {
            resultStr += `: ${tool.status}`;
          }
          
          return resultStr;
        }).join('\n\n');
        
        // Enhanced result with subtask context
        let finalResult = toolResults || `Agent ${role} completed with ${agentTools.length} tools`;
        
        // Add context about which subtasks this agent was working on
        if (state.decomposedSubtasks && state.decomposedSubtasks.length > 0) {
          const relevantSubtasks = this.getRelevantSubtasks(role, state.decomposedSubtasks);
          if (relevantSubtasks.length > 0) {
            finalResult += `\n\n**Subtasks Addressed:**\n${relevantSubtasks.map(task => 
              `- ${task.description} (Priority: ${task.priority})`
            ).join('\n')}`;
          }
        }
        
        const completedAgentCard = { ...updatedAgentCards[role], status: newStatus as 'completed' | 'failed' };
        updatedAgentCards[role] = completedAgentCard;
        updatedAgentResults[role] = {
          agentCard: completedAgentCard,
          result: finalResult,
          toolExecutions: [],
          status: newStatus,
          startTime: Date.now(),
          endTime: Date.now()
        };

        // ✅ IMPROVED: Emit agent status update with enhanced data
        await this.sendRendererUpdate(state, {
          type: 'agent_status',
          data: {
            agentCard: completedAgentCard,
            status: newStatus,
            result: updatedAgentResults[role].result,
            toolTimings: agentTools.reduce((acc, tool) => {
              if (state.toolTimings[tool.id]) {
                acc[tool.id] = state.toolTimings[tool.id];
              }
              return acc;
            }, {} as Record<string, any>),
            subtasksAddressed: state.decomposedSubtasks ? 
              this.getRelevantSubtasks(role, state.decomposedSubtasks).length : 0
          }
        });
        
        console.log(`[LangGraph-Timer] ✅ Agent ${role} completed with status: ${newStatus}, ${agentTools.length} tools with timing`);
        anyAgentUpdated = true;
      }
    }
    
    // ✅ NEW: Also check for agents that need status updates even without tools
    for (const [role, agentCard] of Object.entries(state.activeAgentCards)) {
      if (!updatedAgentResults[role] && agentCard.status === 'busy') {
        // Agent was busy but has no tools - mark as completed with subtask context
        let completionMessage = `Agent ${role} completed without tools`;
        
        // Add subtask context for agents without tools
        if (state.decomposedSubtasks && state.decomposedSubtasks.length > 0) {
          const relevantSubtasks = this.getRelevantSubtasks(role, state.decomposedSubtasks);
          if (relevantSubtasks.length > 0) {
            completionMessage += `\n\n**Assigned Subtasks:**\n${relevantSubtasks.map(task => 
              `- ${task.description} (Priority: ${task.priority})`
            ).join('\n')}\n\n*Note: Agent completed without using external tools*`;
          }
        }
        
        const completedAgentCard = { ...agentCard, status: 'completed' as const };
        updatedAgentCards[role] = completedAgentCard;
        updatedAgentResults[role] = {
          agentCard: completedAgentCard,
          result: completionMessage,
          toolExecutions: [],
          status: 'completed',
          startTime: Date.now(),
          endTime: Date.now()
        };
        
        await this.sendRendererUpdate(state, {
          type: 'agent_status',
          data: {
            agentCard: completedAgentCard,
            status: 'completed',
            result: completionMessage,
            subtasksAddressed: state.decomposedSubtasks ? 
              this.getRelevantSubtasks(role, state.decomposedSubtasks).length : 0
          }
        });
        
        console.log(`[LangGraph-Timer] ✅ Agent ${role} marked as completed (no tools)`);
        anyAgentUpdated = true;
      }
    }
    
    // Mark processed tools to prevent re-processing
    const finalApprovals = state.pendingApprovals?.map(approval => {
      if (completedTools.some(tool => tool.id === approval.id)) {
        return { ...approval, processed: true };
      }
      return approval;
    }) || [];
    
    console.log('[LangGraph-Timer] Agent completion processing complete:', {
      anyAgentUpdated,
      completedToolsCount: completedTools.length,
      finalApprovalsCount: finalApprovals.length,
      timingDataAvailable: Object.keys(state.toolTimings).length,
      subtasksAvailable: state.decomposedSubtasks?.length || 0
    });
    
    return {
      activeAgentCards: updatedAgentCards,
      agentResults: updatedAgentResults,
      pendingApprovals: finalApprovals as ToolApprovalRequest[]
    };
  }

  private getRelevantSubtasks(agentRole: string, subtasks: SubTask[]): SubTask[] {
    return subtasks.filter(task => 
      task.suggestedAgentTypes.includes(agentRole) || 
      task.requiredSkills.some(skill => this.agentHasSkill(agentRole, skill))
    );
  }

  private agentHasSkill(role: string, skill: string): boolean {
    // Map common skills to agent types
    const skillMapping: { [key: string]: string[] } = {
      'research': ['research', 'data_analysis', 'investigation'],
      'analysis': ['analysis', 'critical_thinking', 'evaluation'],
      'creative': ['creativity', 'design', 'marketing', 'content'],
      'communication': ['writing', 'presentation', 'documentation'],
      'technical': ['programming', 'development', 'engineering'],
      'validation': ['testing', 'quality_assurance', 'verification']
    };
    
    const agentSkills = skillMapping[role] || [role];
    return agentSkills.some(agentSkill => 
      skill.toLowerCase().includes(agentSkill.toLowerCase()) ||
      agentSkill.toLowerCase().includes(skill.toLowerCase())
    );
  }
} 
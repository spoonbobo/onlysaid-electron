import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { ToolApprovalRequest } from '../agent/state';
import { AgentRegistry } from '../agent/registry';
import { LangChainServiceFactory } from '../factory/factory';
import { LangChainAgentOptions } from '../agent';

export class AgentExecutorNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
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
        
        const awaitingAgentCard = { ...updatedAgentCard, status: 'awaiting_approval' as const };
        await this.sendRendererUpdate(state, {
          type: 'agent_status',
          data: {
            agentCard: awaitingAgentCard,
            status: 'awaiting_approval',
            currentTask: `Waiting for approval of ${result.pendingApprovals.length} tools`
          }
        });
        
        return {
          activeAgentCards: {
            ...state.activeAgentCards,
            [nextRole]: awaitingAgentCard
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
      
      // Update matching decomposed tasks to completed/failed
      try {
        if (state.webContents && !state.webContents.isDestroyed() && state.executionId && state.decomposedSubtasks && Array.isArray(state.decomposedSubtasks)) {
          const relevant = (state.decomposedSubtasks as any[]).filter(st => Array.isArray(st?.suggestedAgentTypes) && st.suggestedAgentTypes.includes(nextRole));
          for (const st of relevant) {
            // Send update with subtask_id for proper linkage
            state.webContents.send('agent:update_task_status', {
              executionId: state.executionId,
              subtaskId: st.id, // Use the decomposed subtask ID
              taskDescription: st.description,
              status: finalAgentCard.status === 'completed' ? 'completed' : 'failed',
              result: result.output,
              agentId: updatedAgentCard.runtimeId || nextRole
            });
          }
        }
      } catch (e) {
        console.warn('[LangGraph] Failed to update decomposed task status:', e);
      }

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
      // Also mark relevant decomposed tasks failed
      try {
        if (state.webContents?.isValid() && state.executionId && state.decomposedSubtasks && Array.isArray(state.decomposedSubtasks)) {
          const relevant = (state.decomposedSubtasks as any[]).filter(st => Array.isArray(st?.suggestedAgentTypes) && st.suggestedAgentTypes.includes(nextRole));
          for (const st of relevant) {
            state.webContents.send('agent:update_task_status', {
              executionId: state.executionId,
              taskDescription: st.description,
              status: 'failed',
              error: error.message,
              agentId: updatedAgentCard.runtimeId || nextRole
            });
          }
        }
      } catch (e) {
        console.warn('[LangGraph] Failed to update decomposed task status on error:', e);
      }
      
      const failedAgentCard: AgentCard = {
        ...updatedAgentCard,
        status: 'failed'
      };
      
      await this.sendRendererUpdate(state, {
        type: 'agent_status',
        data: {
          agentCard: failedAgentCard,
          status: 'failed',
          error: error.message
        }
      });
      
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
  }

  private async executeAgentWithApproval(
    agentCard: AgentCard,
    state: WorkflowState,
    role: string
  ): Promise<{ 
    success: boolean; 
    output: string; 
    toolExecutions?: any[]; 
    startTime?: number; 
    pendingApprovals?: ToolApprovalRequest[] 
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`[LangGraph] executeAgentWithApproval starting for ${role} agent at ${new Date(startTime).toLocaleTimeString()}`);
      
      const webContents = (state as any).webContents || (global as any).osswarmWebContents;
      const taskDescription = `${role} agent execution: ${state.originalTask}`;
      
      // Find matching decomposed subtask for this role
      let matchingSubtask: any = null;
      if (state.decomposedSubtasks && Array.isArray(state.decomposedSubtasks)) {
        matchingSubtask = (state.decomposedSubtasks as any[]).find(st => {
          const suggestMatch = Array.isArray(st?.suggestedAgentTypes) && st.suggestedAgentTypes.includes(role);
          const skillMatch = Array.isArray(st?.requiredSkills) && st.requiredSkills.some((skill: string) => {
            const mapping: { [key: string]: string[] } = {
              'research': ['research', 'data_analysis', 'investigation'],
              'analysis': ['analysis', 'critical_thinking', 'evaluation'],
              'creative': ['creativity', 'design', 'marketing', 'content'],
              'communication': ['writing', 'presentation', 'documentation'],
              'technical': ['programming', 'development', 'engineering'],
              'validation': ['testing', 'quality_assurance', 'verification']
            };
            const agentSkills = mapping[role] || [role];
            return agentSkills.some(s => skill.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(skill.toLowerCase()));
          });
          return suggestMatch || skillMatch;
        });
      }
      
      if (webContents && !webContents.isDestroyed() && state.executionId) {
        // Mark matching decomposed task as running if found
        if (matchingSubtask) {
          webContents.send('agent:update_task_status', {
            executionId: state.executionId,
            subtaskId: matchingSubtask.id,
            taskDescription: matchingSubtask.description,
            status: 'running',
            agentId: agentCard.runtimeId || agentCard.role
          });
          
          webContents.send('agent:add_log_to_db', {
            executionId: state.executionId,
            logType: 'info',
            message: `Started decomposed task ${matchingSubtask.id} for ${role} agent`,
            agentId: agentCard.runtimeId
          });
        } else {
          // Create new task if no decomposed task exists
          webContents.send('agent:save_task_to_db', {
            executionId: state.executionId,
            agentId: agentCard.runtimeId || agentCard.role,
            taskDescription: taskDescription,
            priority: 1
          });
          // Immediately mark task as running
          webContents.send('agent:update_task_status', {
            executionId: state.executionId,
            taskId: taskDescription,
            status: 'running',
            agentId: agentCard.runtimeId || agentCard.role,
            taskDescription
          });
          
          webContents.send('agent:add_log_to_db', {
            executionId: state.executionId,
            logType: 'info',
            message: `Task created for ${role} agent: ${taskDescription}`,
            agentId: agentCard.runtimeId
          });
        }
      }
      
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
      
      await this.sendRendererUpdate(state, {
        type: 'agent_status',
        data: {
          agentCard: { ...agentCard, status: 'executing' },
          status: 'executing',
          currentTask: taskDescription
        }
      });
      
      console.log(`[LangGraph] Calling agent service with prompt...`);
      const response = await agentService.getCompletion([{
        role: 'user',
        content: `As a ${role} agent, help with this task: ${state.originalTask}`
      }]);
      
      const output = response.choices[0]?.message?.content || '';
      
      if (response.choices[0]?.message?.tool_calls && response.choices[0].message.tool_calls.length > 0) {
        console.log(`[LangGraph] Agent ${role} wants to use ${response.choices[0].message.tool_calls.length} tools`);
        
        const pendingApprovals: ToolApprovalRequest[] = [];
        const currentTime = Date.now();
        
        for (const toolCall of response.choices[0].message.tool_calls) {
          const toolName = toolCall.function?.name || 'unknown';
          const originalTool = agentOptions.tools?.find(t => t.function?.name === toolName);
          const mcpServer = (originalTool as any)?.mcpServer || 'unknown';
          const risk = this.assessToolRisk(toolName, mcpServer);
          
          const toolId = `langgraph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log(`[LangGraph-Timer] Creating pending approval for tool: ${toolName} from ${mcpServer} at ${new Date(currentTime).toLocaleTimeString()}`);
          
          if (webContents && !webContents.isDestroyed() && state.executionId) {
            webContents.send('agent:add_log_to_db', {
              executionId: state.executionId,
              logType: 'tool_request',
              message: `${role} agent requested tool: ${toolName} with arguments: ${JSON.stringify(toolCall.function?.arguments || {})}`,
              agentId: agentCard.runtimeId,
              metadata: {
                toolName,
                mcpServer,
                arguments: toolCall.function?.arguments,
                risk
              }
            });
          }
          
          const approvalRequest: ToolApprovalRequest = {
            id: toolId,
            agentCard: agentCard,
            toolCall: {
              ...toolCall,
              mcpServer: mcpServer
            },
            context: `${role} agent wants to use ${toolName} for: ${state.originalTask}`,
            timestamp: currentTime,
            risk: risk,
            status: 'pending',
            mcpServer: mcpServer
          };
          
          pendingApprovals.push(approvalRequest);
        }
        
        console.log(`[LangGraph-Timer] Returning ${pendingApprovals.length} pending approvals for processing`);
        
        return {
          success: false,
          output: `${output}\n\n**Waiting for approval of ${pendingApprovals.length} tools...**`,
          startTime,
          pendingApprovals
        };
      }
      
      if (webContents && !webContents.isDestroyed() && state.executionId) {
        webContents.send('agent:add_log_to_db', {
          executionId: state.executionId,
          logType: 'info',
          message: `${role} agent completed successfully: ${output.substring(0, 100)}...`,
          agentId: agentCard.runtimeId
        });
        // Mark task as completed (renderer will resolve by description/assignment)
        webContents.send('agent:update_task_status', {
          executionId: state.executionId,
          taskId: taskDescription,
          status: 'completed',
          result: output,
          agentId: agentCard.runtimeId || agentCard.role,
          taskDescription
        });
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
      const _webContents = (state as any).webContents || (global as any).osswarmWebContents;
      if (_webContents && !_webContents.isDestroyed() && state.executionId) {
        _webContents.send('agent:update_task_status', {
          executionId: state.executionId,
          taskId: `${role} agent execution: ${state.originalTask}`,
          status: 'failed',
          error: error.message,
          agentId: agentCard.runtimeId || role,
          taskDescription: `${role} agent execution: ${state.originalTask}`
        });
      }
      return {
        success: false,
        output: `Agent execution failed: ${error.message}`,
        startTime
      };
    }
  }
} 
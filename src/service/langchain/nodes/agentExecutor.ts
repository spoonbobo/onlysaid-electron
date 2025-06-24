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
          currentTask: `Executing ${role} logic...`
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
} 
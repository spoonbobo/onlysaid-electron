// Base class for workflow nodes
import { WorkflowState, WorkflowNodeResult } from './types';
import { LangChainAgentOptions } from '../agent';

export abstract class BaseWorkflowNode {
  protected agentOptions: LangChainAgentOptions;

  constructor(agentOptions: LangChainAgentOptions) {
    this.agentOptions = agentOptions;
  }

  abstract execute(state: WorkflowState): WorkflowNodeResult;

  // Shared utility methods
  protected async sendRendererUpdate(state: WorkflowState, update: any): Promise<void> {
    if (state.streamCallback) {
      state.streamCallback(`[LangGraph OSSwarm] ${update.type}: ${JSON.stringify(update.data)}`);
    }
    
    const webContents = state.webContents;
    if (webContents?.isValid()) {
      try {
        switch (update.type) {
          case 'agent_status':
            webContents.send('agent:agent_updated', {
              agentCard: update.data.agentCard,
              status: update.data.status,
              currentTask: update.data.currentTask,
              executionId: state.executionId,
              toolTimings: update.data.toolTimings
            });
            break;
            
          case 'execution_progress':
            webContents.send('agent:execution_updated', {
              executionId: state.executionId,
              status: update.data.status,
              progress: update.data,
              toolTimings: state.toolTimings
            });
            break;
            
          case 'result_synthesis':
            console.log('[BaseWorkflowNode] Sending result_synthesized event:', {
              executionId: state.executionId,
              resultLength: update.data.result?.length || 0,
              agentCardsCount: Object.values(state.activeAgentCards).length,
              isAutoGrading: state.executionId?.startsWith('autograde_')
            });
            webContents.send('agent:result_synthesized', {
              executionId: state.executionId,
              result: update.data.result,
              agentCards: Object.values(state.activeAgentCards),
              toolTimings: state.toolTimings
            });
            console.log('[BaseWorkflowNode] Result_synthesized event sent successfully');
            break;
        }
      } catch (error: any) {
        console.warn('[BaseWorkflowNode] Failed to send renderer update:', error.message);
      }
    }
  }

  protected assessToolRisk(toolName: string, mcpServer: string): 'low' | 'medium' | 'high' {
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
} 
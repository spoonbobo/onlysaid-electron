import { HumanMessage } from "@langchain/core/messages";
import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentFactory } from '../factory/factory';

export class MasterCoordinatorNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph] Master coordinator starting with enhanced swarm architecture...');
    console.log('[LangGraph] Original task:', state.originalTask);
    
    // Load both swarms and individual agents
    const availableAgentCards = AgentFactory.createRegistryAgentCardsWithSwarms();
    
    await this.sendRendererUpdate(state, {
      type: 'execution_progress',
      data: {
        status: 'initializing',
        availableAgents: availableAgentCards.length,
        phase: 'master_coordination',
        architecture: 'enhanced_swarm_with_decomposition',
        originalTask: state.originalTask
      }
    });
    
    const swarmCards = availableAgentCards.filter(card => card.role?.endsWith('_swarm'));
    const individualCards = availableAgentCards.filter(card => card.role && !card.role.endsWith('_swarm'));
    
    console.log('[LangGraph] Master coordinator loaded enhanced workflow components:');
    console.log('  - Available swarms:', swarmCards.map(c => c.role));
    console.log('  - Available individual agents:', individualCards.map(c => c.role));
    console.log('  - Next phase: Task decomposition and analysis');
    
    // ✅ Log task details to database using state webContents
    const webContents = state.webContents;
    if (webContents?.isValid() && state.executionId) {
      webContents.send('agent:add_log_to_db', {
        executionId: state.executionId,
        logType: 'info',
        message: `Master coordinator initialized with ${availableAgentCards.length} available agents (${swarmCards.length} swarms, ${individualCards.length} individual agents)`
      });
    }
    
    return {
      availableAgentCards,
      currentPhase: 'decomposition',
      messages: [new HumanMessage(`Enhanced swarm task execution: ${state.originalTask}`)]
    };
  }
} 
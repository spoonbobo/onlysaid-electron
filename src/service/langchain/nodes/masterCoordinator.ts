import { HumanMessage } from "@langchain/core/messages";
import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentFactory } from '../factory/factory';

export class MasterCoordinatorNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
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
  }
} 
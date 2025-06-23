import { AIMessage } from "@langchain/core/messages";
import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentRegistry } from '../agent/registry';
import { LangChainServiceFactory } from '../factory/factory';
import { LangChainAgentOptions } from '../agent';

export class TaskDecomposerNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
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
    
    // ✅ FIX: Don't create tasks yet since activeAgentCards is empty at this stage
    // Task creation will happen in AgentExecutorNode after agents are selected and available
    console.log('[TaskDecomposer] Task analysis completed. Task creation will be handled after agent selection.');
    
    await this.sendRendererUpdate(state, {
      type: 'execution_progress',
      data: {
        status: 'decomposed',
        analysis: analysis.substring(0, 200) + '...'
      }
    });
    
    // ✅ REMOVE: Don't save tasks to database yet - wait for agent selection
    // The AgentExecutorNode will create tasks when agents are actually executing
    // This prevents the "default" agent error since we'll have real agent IDs by then
    
    return {
      currentPhase: 'agent_selection',
      messages: [...state.messages, new AIMessage(analysis)]
    };
  }
} 
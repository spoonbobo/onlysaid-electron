import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentCard } from '@/../../types/Agent/AgentCard';

export class AgentSelectorNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph] Agent selector choosing optimal agents...');
    
    const selectedAgentCards = this.selectOptimalAgents(
      state.originalTask,
      state.availableAgentCards,
      state.currentPhase
    );
    
    const activeAgentCards = selectedAgentCards.reduce((acc, card) => {
      if (card.role) {
        acc[card.role] = {
          ...card,
          status: 'idle',
          runtimeId: `langgraph-${card.role}-${Date.now()}`
        };
      }
      return acc;
    }, {} as { [role: string]: AgentCard });
    
    await this.sendRendererUpdate(state, {
      type: 'execution_progress',
      data: {
        status: 'agents_selected',
        selectedAgents: Object.values(activeAgentCards).map(card => ({
          name: card.name,
          role: card.role,
          capabilities: card.capabilities
        }))
      }
    });
    
    for (const [role, agentCard] of Object.entries(activeAgentCards)) {
      try {
        console.log('[AgentSelector] Creating agent:', role, 'with runtimeId:', agentCard.runtimeId);
        
        const webContents = (global as any).osswarmWebContents;
        if (webContents && !webContents.isDestroyed()) {
          webContents.send('agent:save_agent_to_db', {
            executionId: state.executionId,
            agentId: agentCard.runtimeId,
            role: agentCard.role,
            expertise: agentCard.expertise
          });
        }
        
        await this.sendRendererUpdate(state, {
          type: 'agent_status',
          data: {
            agentCard: agentCard,
            status: 'idle',
            currentTask: 'Agent selected and ready'
          }
        });
        
        console.log(`[AgentSelector] ✅ Agent ${role} created and status emitted`);
        
      } catch (error) {
        console.error('[AgentSelector] Error creating agent:', error);
      }
    }
    
    return {
      activeAgentCards,
      currentPhase: 'execution'
    };
  }

  private selectOptimalAgents(
    task: string,
    availableCards: AgentCard[],
    kbContext?: any
  ): AgentCard[] {
    console.log('[LangGraph] Selecting agents from:', availableCards.map(c => c.role));
    
    const selectedCards: AgentCard[] = [];
    
    const researchAgent = availableCards.find(card => card.role === 'research');
    if (researchAgent) selectedCards.push(researchAgent);
    
    if (kbContext?.enabled) {
      const ragAgent = availableCards.find(card => card.role === 'rag');
      if (ragAgent) selectedCards.push(ragAgent);
    }
    
    if (task.length > 100) {
      const analysisAgent = availableCards.find(card => card.role === 'analysis');
      if (analysisAgent) selectedCards.push(analysisAgent);
    }
    
    // FALLBACK: If no agents selected, pick the first available one
    if (selectedCards.length === 0 && availableCards.length > 0) {
      console.log('[LangGraph] No agents matched criteria, selecting first available agent');
      selectedCards.push(availableCards[0]);
    }
    
    console.log('[LangGraph] Selected agents:', selectedCards.map(c => c.role));
    return selectedCards;
  }
} 
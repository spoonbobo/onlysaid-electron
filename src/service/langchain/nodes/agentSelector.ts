import { BaseWorkflowNode } from './base';
import { WorkflowState, WorkflowNodeResult } from './types';
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { SwarmRegistry } from '../agent/registry';
import { LangChainServiceFactory } from '../factory/factory';
import { LangChainAgentOptions } from '../agent';
import { SubTask } from './taskDecomposer';

export class AgentSelectorNode extends BaseWorkflowNode {
  async execute(state: WorkflowState): WorkflowNodeResult {
    console.log('[LangGraph] Agent selector using LLM-based selection with swarm limits...');
    
    // Get swarm limits from settings (will be passed through agent options)
    const swarmLimits = this.getSwarmLimits();
    
    // Use decomposed subtasks if available, otherwise fall back to original task
    const tasksToProcess = state.decomposedSubtasks || [{
      id: 'original_task',
      description: state.originalTask,
      requiredSkills: ['general'],
      suggestedAgentTypes: [],
      priority: 1,
      estimatedComplexity: 'medium' as const
    }];
    
    console.log('[LangGraph] Agent selection with limits:', {
      subtasks: tasksToProcess.length,
      maxSwarmSize: swarmLimits.maxSwarmSize,
      maxParallelAgents: swarmLimits.maxParallelAgents
    });
    
    const selectedAgentCards = await this.selectOptimalAgentsWithLLM(
      tasksToProcess,
      state.availableAgentCards,
      state.originalTask,
      swarmLimits
    );
    
    // Apply swarm size limits
    const limitedAgentCards = this.enforceSwarmLimits(selectedAgentCards, swarmLimits);
    
    const activeAgentCards = limitedAgentCards.reduce((acc, card) => {
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
        })),
        selectionMethod: 'llm_based',
        subtaskCount: tasksToProcess.length,
        swarmLimits: swarmLimits,
        agentsWithinLimits: limitedAgentCards.length <= swarmLimits.maxSwarmSize
      }
    });
    
    for (const [role, agentCard] of Object.entries(activeAgentCards)) {
      try {
        console.log('[AgentSelector] Creating agent:', role, 'with runtimeId:', agentCard.runtimeId);
        
        const webContents = state.webContents;
        if (webContents?.isValid()) {
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
            currentTask: 'Agent selected and ready for coordinated execution'
          }
        });
        
        console.log(`[AgentSelector] ✅ Agent ${role} created and status emitted`);
        
      } catch (error) {
        console.error('[AgentSelector] Error creating agent:', error);
      }
    }
    
    return {
      activeAgentCards,
      currentPhase: 'swarm_execution'
    };
  }

  private getSwarmLimits() {
    // Default limits if not available from settings
    const defaultLimits = {
      maxIterations: 15,
      maxParallelAgents: 8,
      maxSwarmSize: 4,
      maxActiveSwarms: 2,
      maxConversationLength: 50
    };
    
    // Try to get limits from agent options (passed from renderer)
    return (this.agentOptions as any)?.swarmLimits || defaultLimits;
  }

  private enforceSwarmLimits(selectedCards: AgentCard[], limits: any): AgentCard[] {
    console.log('[LangGraph] Enforcing swarm limits:', {
      selectedCount: selectedCards.length,
      maxSwarmSize: limits.maxSwarmSize,
      maxParallelAgents: limits.maxParallelAgents
    });
    
    // Apply maxSwarmSize limit (most restrictive for single swarm)
    if (selectedCards.length > limits.maxSwarmSize) {
      console.log(`[LangGraph] Limiting swarm size from ${selectedCards.length} to ${limits.maxSwarmSize} agents`);
      
      // Prioritize based on agent importance (research and analysis first)
      const priorityOrder = ['research', 'analysis', 'creative', 'communication', 'technical', 'validation'];
      
      const sortedCards = selectedCards.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.role || '');
        const bIndex = priorityOrder.indexOf(b.role || '');
        const aPriority = aIndex === -1 ? 999 : aIndex;
        const bPriority = bIndex === -1 ? 999 : bIndex;
        return aPriority - bPriority;
      });
      
      return sortedCards.slice(0, limits.maxSwarmSize);
    }
    
    return selectedCards;
  }

  private async selectOptimalAgentsWithLLM(
    subtasks: SubTask[],
    availableCards: AgentCard[],
    originalTask: string,
    swarmLimits: any
  ): Promise<AgentCard[]> {
    console.log('[LangGraph] Using LLM for intelligent agent selection with limits...');
    
    // Separate swarms from individual agents
    const swarmCards = availableCards.filter(card => card.role && card.role.endsWith('_swarm'));
    const individualAgentCards = availableCards.filter(card => card.role && !card.role.endsWith('_swarm'));
    
    // Prepare agent information for LLM
    const availableAgentsInfo = availableCards.map(card => ({
      role: card.role,
      name: card.name,
      description: card.description,
      expertise: card.expertise || [],
      isSwarm: card.role?.endsWith('_swarm') || false
    }));
    
    // Enhanced LLM selection prompt with limits
    const selectionPrompt = `
You are an intelligent agent coordinator. Your job is to select the most suitable agents for executing tasks within system limits.

ORIGINAL TASK: ${originalTask}

DECOMPOSED SUBTASKS:
${subtasks.map((task, idx) => 
  `${idx + 1}. ${task.description}
     Required skills: ${task.requiredSkills.join(', ')}
     Suggested types: ${task.suggestedAgentTypes.join(', ')}
     Priority: ${task.priority}, Complexity: ${task.estimatedComplexity}`
).join('\n\n')}

AVAILABLE AGENTS:
${availableAgentsInfo.map(agent => 
  `- ${agent.role}${agent.isSwarm ? ' (SWARM)' : ''}: ${agent.description}
    Expertise: ${agent.expertise.join(', ')}`
).join('\n')}

SYSTEM LIMITS:
- Maximum agents in this swarm: ${swarmLimits.maxSwarmSize}
- Maximum parallel agents: ${swarmLimits.maxParallelAgents}
- Maximum iterations: ${swarmLimits.maxIterations}

SELECTION RULES:
1. Choose MAXIMUM ${swarmLimits.maxSwarmSize} agents that can best handle ALL the subtasks
2. Prefer quality over quantity - fewer specialized agents are better than many generalists
3. Prefer swarms for complex tasks requiring multiple skills (but they count as multiple agents when expanded)
4. Consider agent expertise overlap with required skills
5. Prioritize agents that can handle multiple subtasks
6. Balance workload distribution within the agent limit

Respond with ONLY a JSON array of selected agent roles (max ${swarmLimits.maxSwarmSize}), like:
["research", "analysis"] or ["research_swarm"] (if swarm is more efficient)

Selected agents:`;

    try {
      // Use the first available agent's configuration for LLM access
      const sampleAgent = availableCards[0];
      const llmOptions: LangChainAgentOptions = {
        ...this.agentOptions,
        systemPrompt: "You are an expert at selecting the right agents for tasks within system constraints.",
      };
      
      const llmService = LangChainServiceFactory.createAgent(llmOptions);
      
      const response = await llmService.getCompletion([{
        role: 'user',
        content: selectionPrompt
      }]);
      
      const responseContent = response.choices[0]?.message?.content || '';
      
      // Parse LLM response
      let selectedRoles: string[] = [];
      try {
        // Extract JSON array from response
        const jsonMatch = responseContent.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          selectedRoles = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: extract role names from text
          selectedRoles = responseContent
            .split(/[,\n]/)
            .map(s => s.trim().replace(/["\[\]]/g, ''))
            .filter(s => s && availableAgentsInfo.some(a => a.role === s));
        }
      } catch (parseError) {
        console.warn('[AgentSelector] Failed to parse LLM response, using fallback selection');
        selectedRoles = this.getFallbackSelection(subtasks, availableAgentsInfo, swarmLimits);
      }
      
      // Enforce limits on LLM selection
      if (selectedRoles.length > swarmLimits.maxSwarmSize) {
        console.log(`[LangGraph] LLM selected ${selectedRoles.length} agents, limiting to ${swarmLimits.maxSwarmSize}`);
        selectedRoles = selectedRoles.slice(0, swarmLimits.maxSwarmSize);
      }
      
      console.log('[LangGraph] LLM selected agent roles (with limits):', selectedRoles);
      
      // Convert selected roles to agent cards
      let selectedCards = selectedRoles
        .map(role => availableCards.find(card => card.role === role))
        .filter(Boolean) as AgentCard[];
      
      // If swarms were selected, expand them to individual agents (but respect limits)
      const expandedCards: AgentCard[] = [];
      for (const card of selectedCards) {
        if (card.role?.endsWith('_swarm')) {
          const swarmConfig = SwarmRegistry.getSwarmConfig(card.role);
          if (swarmConfig) {
            console.log('[LangGraph] Expanding swarm to agents:', swarmConfig.agents.map(a => a.role));
            const swarmMembers = swarmConfig.agents
              .map(agentConfig => individualAgentCards.find(c => c.role === agentConfig.role))
              .filter(Boolean) as AgentCard[];
            
            // Check if adding swarm members would exceed limits
            if (expandedCards.length + swarmMembers.length <= swarmLimits.maxSwarmSize) {
              expandedCards.push(...swarmMembers);
            } else {
              // Add only what we can within limits
              const remainingSlots = swarmLimits.maxSwarmSize - expandedCards.length;
              expandedCards.push(...swarmMembers.slice(0, remainingSlots));
              console.log(`[LangGraph] Limited swarm expansion to ${remainingSlots} agents due to swarm size limit`);
            }
          }
        } else {
          if (expandedCards.length < swarmLimits.maxSwarmSize) {
            expandedCards.push(card);
          }
        }
      }
      
      // Ensure we have at least one agent
      if (expandedCards.length === 0) {
        console.warn('[LangGraph] No agents selected by LLM, using fallback');
        return this.getFallbackAgents(availableCards, swarmLimits);
      }
      
      return expandedCards;
      
    } catch (error) {
      console.error('[LangGraph] Error in LLM agent selection:', error);
      return this.getFallbackAgents(availableCards, swarmLimits);
    }
  }

  private getFallbackSelection(subtasks: SubTask[], availableAgents: any[], swarmLimits: any): string[] {
    // Simple fallback based on suggested agent types from subtasks
    const suggestedTypes = [...new Set(subtasks.flatMap(task => task.suggestedAgentTypes))];
    const availableRoles = availableAgents.map(a => a.role);
    
    const validSuggestions = suggestedTypes.filter(type => availableRoles.includes(type));
    
    if (validSuggestions.length > 0) {
      // Limit to max swarm size
      return validSuggestions.slice(0, swarmLimits.maxSwarmSize);
    }
    
    // Ultimate fallback
    return ['research', 'analysis'].filter(role => availableRoles.includes(role)).slice(0, swarmLimits.maxSwarmSize);
  }

  private getFallbackAgents(availableCards: AgentCard[], swarmLimits: any): AgentCard[] {
    // Fallback to research and analysis if available, respecting limits
    const fallbackRoles = ['research', 'analysis'];
    const fallbackAgents = fallbackRoles
      .map(role => availableCards.find(card => card.role === role))
      .filter(Boolean) as AgentCard[];
    
    if (fallbackAgents.length > 0) {
      return fallbackAgents.slice(0, swarmLimits.maxSwarmSize);
    }
    
    // Ultimate fallback - return first available agent(s) within limit
    return availableCards.slice(0, Math.min(1, swarmLimits.maxSwarmSize));
  }

} 
import { LangChainAgentService, LangChainAgentOptions } from '../agent';
import { LangChainServiceFactory } from '../factory';
import type OpenAI from 'openai';

export interface OSSwarmLimits {
  maxConversationLength: number;    // e.g., 100 messages
  maxParallelAgents: number;        // e.g., 10 agents
  maxSwarmSize: number;             // e.g., 5 agents per swarm
  maxActiveSwarms: number;          // e.g., 3 concurrent swarms
  maxIterations: number;            // e.g., 20 iterations total
  conversationTTL: number;          // Auto-cleanup after X hours
}

export interface SwarmAgent {
  id: string;
  role: string;
  expertise: string[];
  status: 'idle' | 'busy' | 'completed' | 'failed';
  currentTask?: string;
  agentService: LangChainAgentService;
}

export interface SwarmTask {
  id: string;
  description: string;
  priority: number;
  assignedAgents: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  iterations: number;
  maxIterations: number;
}

export interface OSSwarmConfig {
  limits: OSSwarmLimits;
  agentOptions: LangChainAgentOptions;
  masterPrompt?: string;
  swarmPrompts: Record<string, string>;
}

export class OSSwarmCore {
  private agents: Map<string, SwarmAgent> = new Map();
  private tasks: Map<string, SwarmTask> = new Map();
  private activeSwarms: Set<string> = new Set();
  private masterAgent: LangChainAgentService | null = null;
  private iterationCount: number = 0;

  constructor(private config: OSSwarmConfig) {
    this.initializeMasterAgent();
  }

  private async initializeMasterAgent(): Promise<void> {
    const masterOptions = {
      ...this.config.agentOptions,
      systemPrompt: this.config.masterPrompt || this.getDefaultMasterPrompt(),
    };

    this.masterAgent = LangChainServiceFactory.createAgent(masterOptions);
    console.log('[OSSwarm] Master agent initialized');
  }

  private getDefaultMasterPrompt(): string {
    return `You are the Master Agent of OSSwarm, a distributed AI agent system.

Your responsibilities:
1. Decompose complex tasks into subtasks
2. Assign subtasks to specialized agents
3. Coordinate agent collaboration
4. Synthesize results into final deliverables
5. Monitor progress and handle failures

Available agent types: Research, Analysis, Creative, Technical, Communication, Validation

When processing requests:
1. Break down the task into logical subtasks
2. Determine which agents are needed
3. Coordinate their work
4. Provide regular status updates
5. Synthesize final results

Be concise but informative in your responses.`;
  }

  async createSwarm(swarmType: string, size: number): Promise<string[]> {
    if (this.activeSwarms.size >= this.config.limits.maxActiveSwarms) {
      throw new Error(`Maximum active swarms (${this.config.limits.maxActiveSwarms}) reached`);
    }

    if (size > this.config.limits.maxSwarmSize) {
      throw new Error(`Swarm size (${size}) exceeds maximum (${this.config.limits.maxSwarmSize})`);
    }

    const swarmId = `swarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const agentIds: string[] = [];

    for (let i = 0; i < size; i++) {
      const agentId = await this.createAgent(swarmType, swarmId);
      agentIds.push(agentId);
    }

    this.activeSwarms.add(swarmId);
    console.log(`[OSSwarm] Created swarm ${swarmId} with ${size} agents`);

    return agentIds;
  }

  private async createAgent(role: string, swarmId: string): Promise<string> {
    if (this.agents.size >= this.config.limits.maxParallelAgents) {
      throw new Error(`Maximum parallel agents (${this.config.limits.maxParallelAgents}) reached`);
    }

    const agentId = `agent-${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const agentOptions = {
      ...this.config.agentOptions,
      systemPrompt: this.config.swarmPrompts[role] || this.getDefaultAgentPrompt(role),
    };

    const agentService = LangChainServiceFactory.createAgent(agentOptions);

    const agent: SwarmAgent = {
      id: agentId,
      role,
      expertise: this.getAgentExpertise(role),
      status: 'idle',
      agentService,
    };

    this.agents.set(agentId, agent);
    console.log(`[OSSwarm] Created agent ${agentId} with role ${role}`);

    return agentId;
  }

  private getAgentExpertise(role: string): string[] {
    const expertiseMap: Record<string, string[]> = {
      research: ['information_gathering', 'fact_checking', 'data_analysis'],
      analysis: ['logical_reasoning', 'problem_decomposition', 'critical_thinking'],
      creative: ['brainstorming', 'design_thinking', 'innovation'],
      technical: ['programming', 'system_design', 'implementation'],
      communication: ['writing', 'presentation', 'synthesis'],
      validation: ['testing', 'quality_assurance', 'verification'],
    };

    return expertiseMap[role.toLowerCase()] || ['general'];
  }

  private getDefaultAgentPrompt(role: string): string {
    const prompts: Record<string, string> = {
      research: "You are a Research Agent specializing in information gathering, fact-checking, and data analysis. Provide accurate, well-sourced information.",
      analysis: "You are an Analysis Agent specializing in logical reasoning and problem decomposition. Break down complex problems systematically.",
      creative: "You are a Creative Agent specializing in innovative solutions and design thinking. Generate creative, practical ideas.",
      technical: "You are a Technical Agent specializing in implementation and system design. Provide technical solutions and code.",
      communication: "You are a Communication Agent specializing in clear writing and synthesis. Create well-structured, understandable content.",
      validation: "You are a Validation Agent specializing in quality assurance and testing. Verify accuracy and completeness.",
    };

    return prompts[role.toLowerCase()] || "You are a specialized AI agent. Follow instructions carefully and provide helpful responses.";
  }

  async processTask(
    taskDescription: string,
    streamCallback?: (update: string) => void
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    if (this.iterationCount >= this.config.limits.maxIterations) {
      return { success: false, error: `Maximum iterations (${this.config.limits.maxIterations}) reached` };
    }

    if (!this.masterAgent) {
      return { success: false, error: 'Master agent not initialized' };
    }

    try {
      this.iterationCount++;
      
      // Stream update
      streamCallback?.(`[OSSwarm] Master Agent analyzing task... (Iteration ${this.iterationCount}/${this.config.limits.maxIterations})`);

      // Master agent decomposes the task
      const decompositionResult = await this.masterAgent.getCompletion([
        {
          role: 'user',
          content: `Decompose this task into subtasks and determine which agent types are needed: ${taskDescription}`
        }
      ]);

      const decomposition = decompositionResult.choices[0]?.message?.content || '';
      streamCallback?.(`[OSSwarm] Task decomposition complete: ${decomposition}`);

      // For now, create a simple swarm (this can be enhanced to parse the decomposition)
      const swarmAgents = await this.createSwarm('research', 2);
      streamCallback?.(`[OSSwarm] Created research swarm with ${swarmAgents.length} agents`);

      // Execute tasks with agents
      const results: string[] = [];
      for (const agentId of swarmAgents) {
        const agent = this.agents.get(agentId);
        if (agent) {
          streamCallback?.(`[OSSwarm] Agent ${agent.role} processing subtask...`);
          
          agent.status = 'busy';
          const agentResult = await agent.agentService.getCompletion([
            {
              role: 'user',
              content: `As a ${agent.role} agent, help with this task: ${taskDescription}`
            }
          ]);

          const agentResponse = agentResult.choices[0]?.message?.content || '';
          results.push(`${agent.role}: ${agentResponse}`);
          agent.status = 'completed';
          
          streamCallback?.(`[OSSwarm] Agent ${agent.role} completed subtask`);
        }
      }

      // Master agent synthesizes results
      streamCallback?.(`[OSSwarm] Master Agent synthesizing results...`);
      
      const synthesisResult = await this.masterAgent.getCompletion([
        {
          role: 'user',
          content: `Synthesize these agent results into a final response for: ${taskDescription}\n\nAgent Results:\n${results.join('\n\n')}`
        }
      ]);

      const finalResult = synthesisResult.choices[0]?.message?.content || '';
      streamCallback?.(`[OSSwarm] Task completed successfully`);

      // Cleanup
      this.cleanup();

      return { success: true, result: finalResult };

    } catch (error: any) {
      streamCallback?.(`[OSSwarm] Error: ${error.message}`);
      this.cleanup();
      return { success: false, error: error.message };
    }
  }

  private cleanup(): void {
    // Clean up agents and swarms
    this.agents.clear();
    this.activeSwarms.clear();
    console.log('[OSSwarm] Cleanup completed');
  }

  getStatus(): {
    activeAgents: number;
    activeSwarms: number;
    iterations: number;
    limits: OSSwarmLimits;
  } {
    return {
      activeAgents: this.agents.size,
      activeSwarms: this.activeSwarms.size,
      iterations: this.iterationCount,
      limits: this.config.limits,
    };
  }
} 
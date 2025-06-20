import { OSSwarmCore, OSSwarmConfig, OSSwarmLimits } from './core';
import { LangChainAgentOptions } from '../agent';

export class OSSwarmService {
  private swarmCore: OSSwarmCore | null = null;

  async initializeSwarm(
    agentOptions: LangChainAgentOptions,
    limits?: Partial<OSSwarmLimits>
  ): Promise<void> {
    const defaultLimits: OSSwarmLimits = {
      maxConversationLength: 100,
      maxParallelAgents: 10,
      maxSwarmSize: 5,
      maxActiveSwarms: 3,
      maxIterations: 20,
      conversationTTL: 24 * 60 * 60 * 1000, // 24 hours
    };

    const swarmLimits = { ...defaultLimits, ...limits };

    const config: OSSwarmConfig = {
      limits: swarmLimits,
      agentOptions,
      swarmPrompts: {
        research: "You are a Research Agent in OSSwarm. Gather information, verify facts, and provide detailed analysis.",
        analysis: "You are an Analysis Agent in OSSwarm. Break down problems, analyze data, and provide logical insights.",
        creative: "You are a Creative Agent in OSSwarm. Generate innovative ideas, creative solutions, and design concepts.",
        technical: "You are a Technical Agent in OSSwarm. Provide technical implementations, code solutions, and system designs.",
        communication: "You are a Communication Agent in OSSwarm. Create clear, well-structured content and presentations.",
        validation: "You are a Validation Agent in OSSwarm. Test, verify, and ensure quality of outputs.",
      },
    };

    this.swarmCore = new OSSwarmCore(config);
    console.log('[OSSwarm Service] Swarm initialized with limits:', swarmLimits);
  }

  async executeTask(
    task: string,
    streamCallback?: (update: string) => void
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    if (!this.swarmCore) {
      throw new Error('OSSwarm not initialized. Call initializeSwarm first.');
    }

    return this.swarmCore.processTask(task, streamCallback);
  }

  getSwarmStatus() {
    if (!this.swarmCore) {
      return null;
    }

    return this.swarmCore.getStatus();
  }

  isInitialized(): boolean {
    return this.swarmCore !== null;
  }
} 
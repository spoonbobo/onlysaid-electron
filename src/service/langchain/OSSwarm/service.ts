import { OSSwarmCore, OSSwarmConfig, OSSwarmLimits } from './core';
import { LangChainAgentOptions } from '../agent';

export class OSSwarmService {
  private swarmCore: OSSwarmCore | null = null;

  async initializeSwarm(
    agentOptions: LangChainAgentOptions,
    limits?: Partial<OSSwarmLimits>,
    humanInTheLoop: boolean = true,
    knowledgeBases?: {
      enabled: boolean;
      selectedKbIds: string[];
      workspaceId?: string;
    }
  ): Promise<void> {
    console.log('[OSSwarm Service] initializeSwarm called with agentOptions:', {
      provider: agentOptions.provider,
      model: agentOptions.model,
      toolsCount: agentOptions.tools?.length || 0,
      toolsList: agentOptions.tools?.map((t: any) => ({
        name: t.function?.name,
        mcpServer: t.mcpServer
      })) || [],
      hasKnowledgeBases: !!knowledgeBases?.enabled
    });

    const defaultLimits: OSSwarmLimits = {
      maxConversationLength: 100,
      maxParallelAgents: 10,
      maxSwarmSize: 5,
      maxActiveSwarms: 3,
      maxIterations: 20,
      conversationTTL: 24 * 60 * 60 * 1000, // 24 hours
    };

    const swarmLimits = { ...defaultLimits, ...limits };

    const enhancedAgentOptions = {
      ...agentOptions,
      knowledgeBases
    };

    console.log('[OSSwarm Service] enhancedAgentOptions created:', {
      toolsCount: enhancedAgentOptions.tools?.length || 0,
      toolsList: enhancedAgentOptions.tools?.map((t: any) => ({
        name: t.function?.name,
        mcpServer: t.mcpServer
      })) || [],
      hasKnowledgeBases: !!enhancedAgentOptions.knowledgeBases?.enabled
    });

    const config: OSSwarmConfig = {
      limits: swarmLimits,
      agentOptions: enhancedAgentOptions,
      humanInTheLoop,
      swarmPrompts: {
        research: "You are a Research Agent in OSSwarm with human oversight. All tool usage requires human approval. Gather information, verify facts, and provide detailed analysis.",
        analysis: "You are an Analysis Agent in OSSwarm with human oversight. All tool usage requires human approval. Break down problems, analyze data, and provide logical insights.",
        creative: "You are a Creative Agent in OSSwarm with human oversight. All tool usage requires human approval. Generate innovative ideas, creative solutions, and design concepts.",
        technical: "You are a Technical Agent in OSSwarm with human oversight. All tool usage requires human approval. Provide technical implementations, code solutions, and system designs.",
        communication: "You are a Communication Agent in OSSwarm with human oversight. All tool usage requires human approval. Create clear, well-structured content and presentations.",
        validation: "You are a Validation Agent in OSSwarm with human oversight. All tool usage requires human approval. Test, verify, and ensure quality of outputs.",
        rag: "You are a RAG (Retrieval-Augmented Generation) Agent in OSSwarm with human oversight and access to knowledge bases. You can retrieve relevant information from knowledge bases to enhance your responses. All tool usage requires human approval. Provide accurate, well-sourced answers based on retrieved knowledge and your reasoning capabilities.",
      },
    };

    console.log('[OSSwarm Service] Final config.agentOptions:', {
      toolsCount: config.agentOptions.tools?.length || 0,
      toolsList: config.agentOptions.tools?.map((t: any) => ({
        name: t.function?.name,
        mcpServer: t.mcpServer
      })) || []
    });

    this.swarmCore = new OSSwarmCore(config);
    console.log('[OSSwarm Service] Swarm initialized with human-in-the-loop:', humanInTheLoop, 'and KB support:', !!knowledgeBases?.enabled);
  }

  async executeTask(
    task: string,
    streamCallback?: (update: string) => void,
    chatId?: string, // ✅ Add chat context
    workspaceId?: string // ✅ Add workspace context
  ): Promise<{ success: boolean; result?: string; error?: string }> {
    if (!this.swarmCore) {
      throw new Error('OSSwarm not initialized. Call initializeSwarm first.');
    }

    // ✅ Pass context to processTask
    return this.swarmCore.processTask(task, streamCallback, chatId, workspaceId);
  }

  // Add method to handle approval responses
  handleApprovalResponse(approvalId: string, approved: boolean): void {
    console.log(`[OSSwarm Service] 🔧 handleApprovalResponse called at ${Date.now()}:`, {
      approvalId,
      approved,
      hasSwarmCore: !!this.swarmCore
    });
    
    if (this.swarmCore) {
      console.log(`[OSSwarm Service] 🔧 Forwarding to swarm core...`);
      this.swarmCore.handleApprovalResponse(approvalId, approved);
      console.log(`[OSSwarm Service] 🔧 Forwarded to swarm core successfully`);
    } else {
      console.error(`[OSSwarm Service] 🔧 No swarm core available for approval ${approvalId}`);
    }
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

  // ✅ Add abort method
  abortExecution(): { success: boolean; message: string } {
    if (!this.swarmCore) {
      return { success: false, message: 'No swarm core available to abort' };
    }

    return this.swarmCore.abortExecution();
  }
} 
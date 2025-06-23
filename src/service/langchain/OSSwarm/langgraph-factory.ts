import { LangChainAgentOptions } from '../agent';
import { LangGraphOSSwarmWorkflow } from './langgraph-workflow';
import { v4 as uuidv4 } from 'uuid';

export class LangGraphOSSwarmFactory {
  private static instances: Map<string, LangGraphOSSwarmWorkflow> = new Map();
  private static currentWorkflow: LangGraphOSSwarmWorkflow | null = null;

  static async createWorkflow(
    options: LangChainAgentOptions,
    limits?: any,
    humanInTheLoop: boolean = true,
    knowledgeBases?: {
      enabled: boolean;
      selectedKbIds: string[];
      workspaceId?: string;
    }
  ): Promise<LangGraphOSSwarmWorkflow> {
    console.log('[LangGraph Factory] Creating workflow with options:', {
      provider: options.provider,
      model: options.model,
      toolsCount: options.tools?.length || 0,
      hasApiKeys: !!options.apiKeys,
      hasKnowledgeBases: !!knowledgeBases?.enabled
    });

    const workflow = new LangGraphOSSwarmWorkflow(options);
    const executionId = uuidv4();
    
    this.instances.set(executionId, workflow);
    this.currentWorkflow = workflow;
    
    return workflow;
  }

  static getCurrentWorkflow(): LangGraphOSSwarmWorkflow | null {
    return this.currentWorkflow;
  }

  static clearCache(): void {
    console.log(`[LangGraph Factory] Clearing ${this.instances.size} workflow instances`);
    this.instances.clear();
    this.currentWorkflow = null;
  }

  static getCacheSize(): number {
    return this.instances.size;
  }
}
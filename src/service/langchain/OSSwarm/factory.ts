import { OSSwarmService } from './service';
import { LangChainAgentOptions } from '../agent';
import { OSSwarmLimits } from './core';

export class OSSwarmFactory {
  private static instances: Map<string, OSSwarmService> = new Map();
  private static currentSwarm: OSSwarmService | null = null;

  static async createSwarm(
    options: LangChainAgentOptions,
    limits?: Partial<OSSwarmLimits>,
    humanInTheLoop: boolean = true,
    knowledgeBases?: {
      enabled: boolean;
      selectedKbIds: string[];
      workspaceId?: string;
    }
  ): Promise<OSSwarmService> {
    console.log('[OSSwarm Factory] createSwarm called with options:', {
      provider: options.provider,
      model: options.model,
      toolsCount: options.tools?.length || 0,
      toolsList: options.tools?.map((t: any) => ({
        name: t.function?.name,
        mcpServer: t.mcpServer
      })) || [],
      hasKnowledgeBases: !!knowledgeBases?.enabled
    });

    const key = this.generateKey(options);
    
    let instance = this.instances.get(key);
    
    if (!instance) {
      console.log(`[OSSwarm Factory] Creating new swarm for ${options.provider}:${options.model} with human-in-the-loop: ${humanInTheLoop} and KB: ${!!knowledgeBases?.enabled}`);
      instance = new OSSwarmService();
      await instance.initializeSwarm(options, limits, humanInTheLoop, knowledgeBases);
      this.instances.set(key, instance);
    } else {
      console.log(`[OSSwarm Factory] Using cached swarm instance`);
    }

    this.currentSwarm = instance;
    return instance;
  }

  static getCurrentSwarm(): OSSwarmService | null {
    return this.currentSwarm;
  }

  private static generateKey(options: LangChainAgentOptions): string {
    return `${options.provider}:${options.model}:${options.temperature || 0.7}`;
  }

  static clearCache(): void {
    console.log(`[OSSwarm Factory] Clearing ${this.instances.size} swarm instances`);
    this.instances.clear();
    this.currentSwarm = null;
  }

  static getCacheSize(): number {
    return this.instances.size;
  }
} 
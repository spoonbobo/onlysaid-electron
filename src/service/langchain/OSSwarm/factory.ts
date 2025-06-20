import { OSSwarmService } from './service';
import { LangChainAgentOptions } from '../agent';
import { OSSwarmLimits } from './core';

export class OSSwarmFactory {
  private static instances: Map<string, OSSwarmService> = new Map();

  static async createSwarm(
    options: LangChainAgentOptions,
    limits?: Partial<OSSwarmLimits>
  ): Promise<OSSwarmService> {
    const key = this.generateKey(options);
    
    let instance = this.instances.get(key);
    
    if (!instance) {
      console.log(`[OSSwarm Factory] Creating new swarm for ${options.provider}:${options.model}`);
      instance = new OSSwarmService();
      await instance.initializeSwarm(options, limits);
      this.instances.set(key, instance);
    }

    return instance;
  }

  private static generateKey(options: LangChainAgentOptions): string {
    return `${options.provider}:${options.model}:${options.temperature || 0.7}`;
  }

  static clearCache(): void {
    console.log(`[OSSwarm Factory] Clearing ${this.instances.size} swarm instances`);
    this.instances.clear();
  }

  static getCacheSize(): number {
    return this.instances.size;
  }
} 
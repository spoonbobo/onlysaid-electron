import { LangChainAgentService, LangChainAgentOptions } from './agent';

export class LangChainServiceFactory {
  private static instances: Map<string, LangChainAgentService> = new Map();

  /**
   * Create or get a LangChain agent service instance
   */
  static createAgent(options: LangChainAgentOptions): LangChainAgentService {
    const key = this.generateKey(options);
    
    let instance = this.instances.get(key);
    
    if (!instance) {
      console.log(`[LangChain Factory] Creating new agent instance for ${options.provider}:${options.model}`);
      instance = new LangChainAgentService(options);
      this.instances.set(key, instance);
    } else {
      // Update existing instance with new options
      instance.updateOptions(options);
    }

    return instance;
  }

  /**
   * Generate a unique key for caching instances
   */
  private static generateKey(options: LangChainAgentOptions): string {
    return `${options.provider}:${options.model}:${options.temperature || 0.7}`;
  }

  /**
   * Clear all cached instances
   */
  static clearCache(): void {
    console.log(`[LangChain Factory] Clearing ${this.instances.size} cached instances`);
    this.instances.clear();
  }

  /**
   * Get cached instance count
   */
  static getCacheSize(): number {
    return this.instances.size;
  }

  /**
   * Remove specific instance from cache
   */
  static removeInstance(options: LangChainAgentOptions): boolean {
    const key = this.generateKey(options);
    return this.instances.delete(key);
  }
} 
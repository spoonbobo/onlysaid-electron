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
      console.log(`[LangChain Factory] Creating new agent instance for ${options.provider}:${options.model} with ${options.tools?.length || 0} tools`);
      instance = new LangChainAgentService(options);
      this.instances.set(key, instance);
    } else {
      console.log(`[LangChain Factory] Using cached agent instance for ${options.provider}:${options.model} with ${options.tools?.length || 0} tools`);
      // Update existing instance with new options (this should now be safe since cache key includes tools)
      instance.updateOptions(options);
    }

    return instance;
  }

  /**
   * Generate a unique key for caching instances
   * Now includes tools to prevent tool mismatch between cached instances
   */
  private static generateKey(options: LangChainAgentOptions): string {
    // Create a hash of tool names and MCP servers for cache key
    let toolsHash = 'no-tools';
    if (options.tools && options.tools.length > 0) {
      const toolSignatures = options.tools.map(tool => {
        const toolName = tool.function?.name || 'unknown';
        const mcpServer = (tool as any).mcpServer || 'unknown';
        return `${toolName}@${mcpServer}`;
      }).sort(); // Sort to ensure consistent ordering
      
      toolsHash = toolSignatures.join('|');
    }
    
    // Include knowledge bases in cache key as well
    let kbHash = 'no-kb';
    if (options.knowledgeBases?.enabled && options.knowledgeBases.selectedKbIds?.length > 0) {
      kbHash = options.knowledgeBases.selectedKbIds.sort().join(',');
    }
    
    const cacheKey = `${options.provider}:${options.model}:${options.temperature || 0.7}:${toolsHash}:${kbHash}`;
    
    console.log(`[LangChain Factory] Generated cache key: ${cacheKey.substring(0, 100)}${cacheKey.length > 100 ? '...' : ''}`);
    
    return cacheKey;
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

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): { totalInstances: number; cacheKeys: string[] } {
    return {
      totalInstances: this.instances.size,
      cacheKeys: Array.from(this.instances.keys()).map(key => 
        key.length > 100 ? key.substring(0, 100) + '...' : key
      )
    };
  }
} 
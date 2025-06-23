// DEPRECATED: This file is deprecated in favor of LangGraph implementation
// Use LangGraphOSSwarmFactory from './langgraph-factory' instead

import { LangChainAgentOptions } from '../agent';

/**
 * @deprecated Use LangGraphOSSwarmFactory instead
 * This class is kept for backward compatibility but will be removed
 */
export class OSSwarmFactory {
  private static instances: Map<string, any> = new Map();
  private static currentSwarm: any = null;

  /**
   * @deprecated Use LangGraphOSSwarmFactory.createWorkflow() instead
   */
  static async createSwarm(
    options: LangChainAgentOptions,
    limits?: any,
    humanInTheLoop: boolean = true,
    knowledgeBases?: {
      enabled: boolean;
      selectedKbIds: string[];
      workspaceId?: string;
    }
  ): Promise<any> {
    console.warn('[OSSwarm Factory] DEPRECATED: OSSwarmFactory is deprecated. Use LangGraphOSSwarmFactory instead.');
    throw new Error('OSSwarmFactory is deprecated. Use LangGraphOSSwarmFactory.createWorkflow() instead.');
  }

  /**
   * @deprecated No longer supported in LangGraph implementation
   */
  static getCurrentSwarm(): any {
    console.warn('[OSSwarm Factory] DEPRECATED: getCurrentSwarm() is not supported in LangGraph implementation.');
    return null;
  }

  /**
   * @deprecated Use LangGraphOSSwarmFactory.clearCache() instead
   */
  static clearCache(): void {
    console.warn('[OSSwarm Factory] DEPRECATED: Use LangGraphOSSwarmFactory.clearCache() instead.');
    this.instances.clear();
    this.currentSwarm = null;
  }

  /**
   * @deprecated Use LangGraphOSSwarmFactory.getCacheSize() instead
   */
  static getCacheSize(): number {
    console.warn('[OSSwarm Factory] DEPRECATED: Use LangGraphOSSwarmFactory.getCacheSize() instead.');
    return 0;
  }

  static getCacheStats(): { totalInstances: number; cacheKeys: string[] } {
    console.warn('[OSSwarm Factory] DEPRECATED: getCacheStats() is not supported.');
    return { totalInstances: 0, cacheKeys: [] };
  }

  static removeInstance(): boolean {
    console.warn('[OSSwarm Factory] DEPRECATED: removeInstance() is not supported.');
    return false;
  }
} 
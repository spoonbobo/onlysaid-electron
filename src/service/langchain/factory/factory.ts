import { LangChainAgentService, LangChainAgentOptions } from '../agent';
import { LangGraphOSSwarmWorkflow } from '../agent/workflow';
import { AgentCard } from '@/../../types/Agent/AgentCard';
import { AgentRegistry } from '../agent/registry';
import { v4 as uuidv4 } from 'uuid';

// Define a simplified agent interface for LangGraph
export interface LangGraphAgent {
  id: string;
  role: string;
  expertise: string[];
  status: 'idle' | 'busy' | 'completed' | 'failed';
  agentService: LangChainAgentService;
  currentTask?: string;
}

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

// =============================================================================
// LangGraph OSSwarm Factory
// =============================================================================

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

// =============================================================================
// Agent Factory
// =============================================================================

export class AgentFactory {
  /**
   * Create a LangGraph Agent with the specified role and configuration
   */
  static createLangGraphAgent(
    role: string,
    agentOptions: LangChainAgentOptions,
    customSystemPrompt?: string
  ): LangGraphAgent {
    const config = AgentRegistry.getAgentConfig(role);
    if (!config) {
      throw new Error(`Unknown agent role: ${role}`);
    }

    const agentId = `agent-${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const finalAgentOptions = {
      ...agentOptions,
      systemPrompt: customSystemPrompt || config.systemPrompt,
    };

    const agentService = LangChainServiceFactory.createAgent(finalAgentOptions);
    
    return {
      id: agentId,
      role,
      expertise: config.expertise,
      status: 'idle',
      agentService,
    };
  }

  /**
   * Convert LangGraph Agent to AgentCard using registry configuration
   */
  static langGraphAgentToAgentCard(agent: LangGraphAgent): AgentCard {
    const config = AgentRegistry.getAgentConfig(agent.role);
    if (!config) {
      throw new Error(`Unknown agent role: ${agent.role}`);
    }

    return {
      name: config.name,
      description: config.description,
      url: `onlysaid://agent/${agent.id}`,
      iconUrl: config.iconUrl,
      provider: {
        name: 'OnlySaid',
        documentationUrl: 'https://docs.onlysaid.com/agents'
      },
      version: '1.0.0',
      documentationUrl: `https://docs.onlysaid.com/agents/${agent.role}`,
      capabilities: config.capabilities,
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],
      skills: config.skills,
      supportsAuthenticatedExtendedCard: false,
      status: agent.status,
      currentTask: agent.currentTask,
      expertise: agent.expertise,
      runtimeId: agent.id,
      role: agent.role
    };
  }

  /**
   * Create master agent card using registry
   */
  static createMasterAgentCard(): AgentCard {
    const config = AgentRegistry.getAgentConfig('master');
    if (!config) {
      throw new Error('Master agent configuration not found');
    }

    return {
      name: config.name,
      description: config.description,
      url: 'onlysaid://master',
      iconUrl: config.iconUrl,
      provider: {
        name: 'OnlySaid',
        documentationUrl: 'https://docs.onlysaid.com/agents'
      },
      version: '1.0.0',
      documentationUrl: 'https://docs.onlysaid.com/agents/master',
      capabilities: config.capabilities,
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],
      skills: config.skills,
      supportsAuthenticatedExtendedCard: false,
      status: 'idle',
      expertise: config.expertise,
      runtimeId: 'master',
      role: 'master'
    };
  }

  /**
   * Create agent cards directly from registry for showcase/preview purposes
   */
  static createRegistryAgentCards(): AgentCard[] {
    const configs = AgentRegistry.getAllAgentConfigs();
    
    return configs.map(config => ({
      // Required fields
      name: config.name,
      description: config.description,
      url: `onlysaid://registry/${config.role}`,
      version: '1.0.0',
      capabilities: config.capabilities,
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],
      skills: config.skills,
      
      // Optional fields from registry
      iconUrl: config.iconUrl,
      provider: {
        name: 'OnlySaid',
        documentationUrl: 'https://docs.onlysaid.com/agents'
      },
      documentationUrl: `https://docs.onlysaid.com/agents/${config.role}`,
      supportsAuthenticatedExtendedCard: false,
      
      // Optional runtime fields (for showcase, these would be undefined/default)
      status: 'idle' as const,
      currentTask: undefined,
      expertise: config.expertise,
      runtimeId: `registry-${config.role}`,
      role: config.role,
      
      // Missing/undefined optional fields
      securitySchemes: undefined,
      security: undefined,
    }));
  }

  /**
   * Create a specific agent card from registry by role
   */
  static createRegistryAgentCard(role: string): AgentCard | null {
    const config = AgentRegistry.getAgentConfig(role);
    if (!config) {
      return null;
    }

    return {
      // Required fields
      name: config.name,
      description: config.description,
      url: `onlysaid://registry/${config.role}`,
      version: '1.0.0',
      capabilities: config.capabilities,
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],
      skills: config.skills,
      
      // Optional fields
      iconUrl: config.iconUrl,
      provider: {
        name: 'OnlySaid',
        documentationUrl: 'https://docs.onlysaid.com/agents'
      },
      documentationUrl: `https://docs.onlysaid.com/agents/${config.role}`,
      supportsAuthenticatedExtendedCard: false,
      status: 'idle',
      currentTask: undefined,
      expertise: config.expertise,
      runtimeId: `registry-${config.role}`,
      role: config.role,
      
      // These are truly missing/unused for registry showcase
      securitySchemes: undefined,
      security: undefined,
    };
  }

  // DEPRECATED: Legacy methods for backward compatibility
  /**
   * @deprecated Use createLangGraphAgent instead
   */
  static createSwarmAgent(
    role: string,
    swarmId: string,
    agentOptions: LangChainAgentOptions,
    customSystemPrompt?: string
  ): any {
    console.warn('[AgentFactory] DEPRECATED: createSwarmAgent is deprecated. Use createLangGraphAgent instead.');
    throw new Error('createSwarmAgent is deprecated. Use createLangGraphAgent instead.');
  }

  /**
   * @deprecated Use langGraphAgentToAgentCard instead
   */
  static swarmAgentToAgentCard(swarmAgent: any): AgentCard {
    console.warn('[AgentFactory] DEPRECATED: swarmAgentToAgentCard is deprecated. Use langGraphAgentToAgentCard instead.');
    throw new Error('swarmAgentToAgentCard is deprecated. Use langGraphAgentToAgentCard instead.');
  }

  /**
   * @deprecated Not supported in LangGraph implementation
   */
  static osswarmAgentToAgentCard(osswarmAgent: any): AgentCard {
    console.warn('[AgentFactory] DEPRECATED: osswarmAgentToAgentCard is not supported in LangGraph implementation.');
    throw new Error('osswarmAgentToAgentCard is deprecated and not supported in LangGraph implementation.');
  }
}

// =============================================================================
// OSSwarm Factory (DEPRECATED)
// =============================================================================

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
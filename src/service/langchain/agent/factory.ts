import { AgentCard } from '@/../../types/Agent/AgentCard';
import { AgentRegistry } from './registry';
import { LangChainAgentService, LangChainAgentOptions } from '../agent';
import { LangChainServiceFactory } from '../factory';

// Define a simplified agent interface for LangGraph
export interface LangGraphAgent {
  id: string;
  role: string;
  expertise: string[];
  status: 'idle' | 'busy' | 'completed' | 'failed';
  agentService: LangChainAgentService;
  currentTask?: string;
}

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
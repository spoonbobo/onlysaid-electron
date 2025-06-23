import { AgentCard } from '@/../../types/Agent/AgentCard';
import { AgentRegistry } from '../../agent/registry';

/**
 * Renderer-safe Agent Factory
 * Only contains methods for creating UI-related objects like AgentCards
 * No actual LangChain execution or Node.js dependencies
 */
export class RendererAgentFactory {
  /**
   * Convert OSSwarm agent data to AgentCard
   */
  static osswarmAgentToAgentCard(osswarmAgent: any): AgentCard {
    const config = AgentRegistry.getAgentConfig(osswarmAgent.role);
    if (!config) {
      // Fallback for unknown agent types
      return {
        name: `${osswarmAgent.role} Agent`,
        description: `Agent with role: ${osswarmAgent.role}`,
        url: `onlysaid://agent/${osswarmAgent.id}`,
        version: '1.0.0',
        capabilities: {
          streaming: true,
          toolCalling: true,
          knowledgeBase: false,
          pushNotifications: false,
          multiModal: false
        },
        defaultInputModes: ['text/plain'],
        defaultOutputModes: ['text/plain'],
        skills: [],
        iconUrl: '/icons/agents/default.svg',
        provider: {
          name: 'OnlySaid',
          documentationUrl: 'https://docs.onlysaid.com/agents'
        },
        supportsAuthenticatedExtendedCard: false,
        status: osswarmAgent.status || 'idle',
        currentTask: osswarmAgent.current_task,
        expertise: [],
        runtimeId: osswarmAgent.id,
        role: osswarmAgent.role,
        securitySchemes: undefined,
        security: undefined,
      };
    }

    return {
      name: config.name,
      description: config.description,
      url: `onlysaid://agent/${osswarmAgent.id}`,
      iconUrl: config.iconUrl,
      provider: {
        name: 'OnlySaid',
        documentationUrl: 'https://docs.onlysaid.com/agents'
      },
      version: '1.0.0',
      documentationUrl: `https://docs.onlysaid.com/agents/${config.role}`,
      capabilities: config.capabilities,
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],
      skills: config.skills,
      supportsAuthenticatedExtendedCard: false,
      status: osswarmAgent.status || 'idle',
      currentTask: osswarmAgent.current_task,
      expertise: config.expertise,
      runtimeId: osswarmAgent.id,
      role: osswarmAgent.role,
      securitySchemes: undefined,
      security: undefined,
    };
  }

  /**
   * Create agent cards directly from registry for showcase/preview purposes
   */
  static createRegistryAgentCards(): AgentCard[] {
    const configs = AgentRegistry.getAllAgentConfigs();
    
    return configs.map(config => ({
      name: config.name,
      description: config.description,
      url: `onlysaid://registry/${config.role}`,
      version: '1.0.0',
      capabilities: config.capabilities,
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain'],
      skills: config.skills,
      iconUrl: config.iconUrl,
      provider: {
        name: 'OnlySaid',
        documentationUrl: 'https://docs.onlysaid.com/agents'
      },
      documentationUrl: `https://docs.onlysaid.com/agents/${config.role}`,
      supportsAuthenticatedExtendedCard: false,
      status: 'idle' as const,
      currentTask: undefined,
      expertise: config.expertise,
      runtimeId: `registry-${config.role}`,
      role: config.role,
      securitySchemes: undefined,
      security: undefined,
    }));
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

  // Deprecated methods for backward compatibility
  /**
   * @deprecated Use osswarmAgentToAgentCard instead
   */
  static swarmAgentToAgentCard(swarmAgent: any): AgentCard {
    console.warn('[RendererAgentFactory] DEPRECATED: swarmAgentToAgentCard is deprecated. Use osswarmAgentToAgentCard instead.');
    return this.osswarmAgentToAgentCard(swarmAgent);
  }
}

// Export individual functions for backward compatibility
export const osswarmAgentToAgentCard = RendererAgentFactory.osswarmAgentToAgentCard;
export const createRegistryAgentCards = RendererAgentFactory.createRegistryAgentCards;
export const createMasterAgentCard = RendererAgentFactory.createMasterAgentCard;
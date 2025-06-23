import { AgentFactory } from '@/service/langchain/agent/factory';

// Export AgentFactory methods for backward compatibility
export const swarmAgentToAgentCard = AgentFactory.swarmAgentToAgentCard;
export const osswarmAgentToAgentCard = AgentFactory.osswarmAgentToAgentCard;
export const createMasterAgentCard = AgentFactory.createMasterAgentCard; 
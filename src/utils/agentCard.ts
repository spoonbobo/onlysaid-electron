import { osswarmAgentToAgentCard } from '@/service/langchain/factory/renderer/factory';

// Export renderer factory functions for backward compatibility
export { 
  osswarmAgentToAgentCard, 
  createRegistryAgentCards, 
  createMasterAgentCard 
} from '@/service/langchain/factory/renderer/factory';

// Legacy exports (deprecated but kept for compatibility)
export const swarmAgentToAgentCard = osswarmAgentToAgentCard;
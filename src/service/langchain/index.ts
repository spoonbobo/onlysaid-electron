export { LangChainServiceFactory } from './factory/factory';
export { LangChainAgentService } from './agent';
export { setupLangChainHandlers } from './ipc_handlers';

// LangGraph OSSwarm exports (replacing old OSSwarm)
export { 
  LangGraphOSSwarmWorkflow
} from './agent/workflow';

// Re-export types
export type { LangChainAgentOptions, OpenAIMessage } from './agent';
export type { LangGraphOSSwarmState } from './agent/state';

// Re-export commonly used LangChain types
export type { BaseMessage } from '@langchain/core/messages';
export type { DynamicStructuredTool } from '@langchain/core/tools'; 
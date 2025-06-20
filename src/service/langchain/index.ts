export { LangChainAgentService } from './agent';
export { LangChainServiceFactory } from './factory';
export { setupLangChainHandlers } from './handlers';
export { LangChainToolsHelper } from './tools';

// OSSwarm exports
export { OSSwarmCore, OSSwarmService, OSSwarmFactory, setupOSSwarmHandlers } from './OSSwarm';

export type { LangChainAgentOptions, OpenAIMessage } from './agent';
export type { MCPToolResult } from './tools';
export type { OSSwarmConfig, OSSwarmLimits, SwarmAgent, SwarmTask } from './OSSwarm';

// Re-export commonly used LangChain types
export type { BaseMessage } from '@langchain/core/messages';
export type { DynamicStructuredTool } from '@langchain/core/tools'; 
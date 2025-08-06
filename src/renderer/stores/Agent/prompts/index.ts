// Central export for all Agent mode prompts
export { getQueryModeSystemPrompt } from './queryMode';
export { getAgentModeSystemPrompt } from './agentMode';
export { getAskModeSystemPrompt } from './askMode';
export { getToolSummarySystemPrompt } from './toolSummary';

// Types for prompt parameters
export interface BasePromptParams {
  user: import('@/../../types/User/User').IUser;
  agent: import('@/../../types/User/User').IUser;
  avatarName?: string;
}

export interface QueryModePromptParams extends BasePromptParams {
  kbIds: string[];
  queryEngine: string;
  embeddingModel: string;
}

export interface AgentModePromptParams extends BasePromptParams {
  kbIds?: string[];
}

export interface AskModePromptParams extends BasePromptParams {
  fileContent?: string;
  fileName?: string;
  fileExtension?: string;
}

export interface ToolSummaryPromptParams {
  assistantName: string;
  userName: string;
}
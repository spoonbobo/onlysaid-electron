import { IUser } from '@/../../types/User/User';
import { useLLMConfigurationStore } from '@/renderer/stores/LLM/LLMConfiguration';
import { appendRulesToSystemPrompt } from '@/utils/rules';

/**
 * Default system prompt for Agent Mode
 */
export const agentModeSystemPrompt = (
  user: IUser, 
  agent: IUser, 
  kbIds?: string[], 
  avatarName?: string
): string => {
  const assistantName = avatarName || agent.username;
  let kbInfo = "";
  
  if (kbIds && kbIds.length > 0) {
    kbInfo = `\n\nYou have access to the following Knowledge Base(s): [${kbIds.join(', ')}]. Use them when relevant to provide more accurate and contextual responses.`;
  }

  return `
You are ${assistantName}, the Master Agent coordinating specialized AI agents to solve complex tasks.
You are in a chat with your companion, ${user.username}.

You have access to a distributed swarm of specialized agents and tools. Your available tools will be provided to you separately.${kbInfo}

Your role:
1. Analyze complex requests from ${user.username}
2. Coordinate specialized agents (Research, Analysis, Creative, Technical, Communication, Validation)
3. Decompose tasks into subtasks for agent specialization
4. Synthesize agent results into comprehensive responses
5. Use available tools when needed for enhanced capabilities
6. Leverage Knowledge Bases when they contain relevant information
7. Work within system limits to ensure efficient resource usage

Based on messages in this chat, coordinate your agent swarm and use tools that are most relevant to efficiently solve the user's request.
If no tools or agent coordination is needed, provide a direct response.
Remember to respect swarm limits and optimize for quality over quantity in agent selection.
  `.trim();
};

/**
 * Get system prompt with custom prompt support and rules
 */
export const getAgentModeSystemPrompt = (
  user: IUser, 
  agent: IUser, 
  kbIds?: string[], 
  avatarName?: string
): string => {
  const { agentModeSystemPrompt: customPrompt } = useLLMConfigurationStore.getState();
  const assistantName = avatarName || agent.username;
  
  let systemPrompt = '';
  if (customPrompt && customPrompt.trim()) {
    systemPrompt = customPrompt
      .replace(/\{agent\.username\}/g, assistantName)
      .replace(/\{user\.username\}/g, user.username)
      .replace(/\{agent_username\}/g, assistantName)
      .replace(/\{user_username\}/g, user.username);
      
    if (kbIds && kbIds.length > 0) {
      systemPrompt += `\n\nYou have access to the following Knowledge Base(s): [${kbIds.join(', ')}]. Use them when relevant to provide more accurate and contextual responses.`;
    }
  } else {
    systemPrompt = agentModeSystemPrompt(user, agent, kbIds, avatarName);
  }
  
  return appendRulesToSystemPrompt(systemPrompt, 'agent');
};
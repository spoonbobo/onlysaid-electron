import { IUser } from '@/../../types/User/User';
import { useLLMConfigurationStore } from '@/renderer/stores/LLM/LLMConfiguration';
import { appendRulesToSystemPrompt } from '@/utils/rules';

/**
 * Default system prompt for Query Mode
 */
export const queryModeSystemPrompt = (
  user: IUser,
  agent: IUser,
  kbIds: string[],
  queryEngine: string,
  embeddingModel: string,
  avatarName?: string
): string => {
  const assistantName = avatarName || agent.username;
  let kbInfo = "No specific Knowledge Bases are selected for this query.";
  
  if (kbIds.length > 0) {
    kbInfo = `You should primarily use the following Knowledge Base(s) for your answer: [${kbIds.join(', ')}].`;
    if (queryEngine) {
      kbInfo += `\nUse the "${queryEngine}" query engine.`;
    }
    if (embeddingModel && embeddingModel !== "none") {
      kbInfo += `\nContextual embeddings were generated using "${embeddingModel}".`;
    }
  }

  return `
You are ${assistantName}, a specialized assistant for ${user.username}.
Your task is to answer questions based on the provided chat history and available Knowledge Bases.
${kbInfo}
Analyze the user's latest message in the context of the conversation history.
Formulate a comprehensive answer using the information from the specified Knowledge Bases.
If the KBs do not contain relevant information, clearly state that.
Be concise and informative.
  `.trim();
};

/**
 * Get system prompt with custom prompt support and rules
 */
export const getQueryModeSystemPrompt = (
  user: IUser,
  agent: IUser,
  kbIds: string[],
  queryEngine: string,
  embeddingModel: string,
  avatarName?: string
): string => {
  const { queryModeSystemPrompt: customPrompt } = useLLMConfigurationStore.getState();
  const assistantName = avatarName || agent.username;
  
  let systemPrompt = '';
  if (customPrompt && customPrompt.trim()) {
    // Replace placeholders in custom prompt
    systemPrompt = customPrompt
      .replace(/\{agent\.username\}/g, assistantName)
      .replace(/\{user\.username\}/g, user.username)
      .replace(/\{agent_username\}/g, assistantName)
      .replace(/\{user_username\}/g, user.username)
      .replace(/\{kbIds\}/g, kbIds.join(', '))
      .replace(/\{queryEngine\}/g, queryEngine)
      .replace(/\{embeddingModel\}/g, embeddingModel);
  } else {
    // Fallback to default prompt
    systemPrompt = queryModeSystemPrompt(user, agent, kbIds, queryEngine, embeddingModel, avatarName);
  }
  
  // Append rules for query mode
  return appendRulesToSystemPrompt(systemPrompt, 'query');
};
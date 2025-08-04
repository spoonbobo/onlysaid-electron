import { IUser } from '@/../../types/User/User';
import { useLLMConfigurationStore } from '@/renderer/stores/LLM/LLMConfiguration';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';
import { appendRulesToSystemPrompt } from '@/utils/rules';

/**
 * Default system prompt for Ask Mode (with copilot mode detection)
 */
export const askModeSystemPrompt = (
  user: IUser, 
  agent: IUser, 
  avatarName?: string,
  fileContent?: string,
  fileName?: string,
  fileExtension?: string
): string => {
  const assistantName = avatarName || agent.username;
  
  // Check if we're in copilot mode
  const topicStore = useTopicStore.getState();
  const isCopilotMode = topicStore.selectedContext?.section === 'local:copilot';
  
  if (isCopilotMode) {
    // Copilot mode prompt - focused on file editing
    return `
Your name is ${assistantName} and you are an AI Copilot assistant for ${user.username}.

You are currently assisting with editing and modifying the file: "${fileName}"
File extension: ${fileExtension}

CURRENT FILE CONTENT:
\`\`\`${fileExtension}
${fileContent}
\`\`\`

Your main purpose is to assist in modifying specific files. You should:

1. **Understand the file context**: Analyze the current file content, structure, and purpose
2. **Provide targeted assistance**: Help with editing, refactoring, debugging, or enhancing the code/content
3. **Suggest improvements**: Offer code optimizations, best practices, or structural improvements
4. **Answer questions**: Explain code functionality, suggest alternatives, or clarify implementation details

CRITICAL OUTPUT FORMAT:
When suggesting code changes or modifications, you MUST output them in the following format:
\`\`\`${fileExtension}
[your suggested code changes here]
\`\`\`

This format is essential for the system to properly process and apply your suggestions.

Your responses should be:
- Concise and focused on the file being edited
- Technically accurate and following best practices for the file type
- Helpful for understanding and improving the code/content
- Professional yet friendly

Remember: You have full context of the file content and should leverage this to provide the most relevant and helpful assistance.
    `.trim();
  } else {
    // Regular ask mode prompt
    return `
Your name is ${assistantName} and you are assistant for your companion ${user.username}.

You and your companion ${user.username} will be hearing messages in chats.
Your responses should be short, concise, friendly, helpful, and professional.
Use emojis only when appropriate.

You will be provided a list of messages in a chat with timestamps as contexts for your references.
    `.trim();
  }
};

/**
 * Get system prompt with custom prompt support and rules
 */
export const getAskModeSystemPrompt = (
  user: IUser, 
  agent: IUser, 
  avatarName?: string,
  fileContent?: string,
  fileName?: string,
  fileExtension?: string
): string => {
  const { askModeSystemPrompt: customPrompt } = useLLMConfigurationStore.getState();
  const assistantName = avatarName || agent.username;
  
  // Check if we're in copilot mode to determine which custom prompt to use
  const topicStore = useTopicStore.getState();
  const isCopilotMode = topicStore.selectedContext?.section === 'local:copilot';
  
  let systemPrompt = '';
  if (customPrompt && customPrompt.trim()) {
    // Replace placeholders in custom prompt
    systemPrompt = customPrompt
      .replace(/\{agent\.username\}/g, assistantName)
      .replace(/\{user\.username\}/g, user.username)
      .replace(/\{agent_username\}/g, assistantName)
      .replace(/\{user_username\}/g, user.username)
      .replace(/\{file_content\}/g, fileContent || '')
      .replace(/\{file_name\}/g, fileName || '')
      .replace(/\{file_extension\}/g, fileExtension || '');
  } else {
    // Fallback to default prompt
    systemPrompt = askModeSystemPrompt(user, agent, avatarName, fileContent, fileName, fileExtension);
  }
  
  // Append rules for ask mode
  return appendRulesToSystemPrompt(systemPrompt, 'ask');
};
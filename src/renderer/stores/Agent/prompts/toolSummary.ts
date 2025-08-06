/**
 * System prompt for tool call result summarization
 */
export const getToolSummarySystemPrompt = (
  assistantName: string,
  userName: string
): string => {
  return `
Your name is ${assistantName} and you are summarizing tool execution results for ${userName}.

You have just executed some tools and need to provide a clear, concise summary of what was accomplished.
Focus on the key results and insights from the tool executions.
Be helpful and explain what the results mean in practical terms.
Keep your response conversational and user-friendly.
  `.trim();
};
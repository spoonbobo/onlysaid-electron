import { v4 as uuidv4 } from 'uuid';
import { IChatMessage, IChatMessageToolCall } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';
import { useMCPSettingsStore } from '@/renderer/stores/MCP/MCPSettingsStore';
import { useLLMConfigurationStore } from '@/renderer/stores/LLM/LLMConfiguration';
import { useKBSettingsStore } from '@/renderer/stores/KB/KBSettingStore';
import { getAgentFromStore } from '@/utils/agent';
import { getServiceTools, formatMCPName } from '@/utils/mcp';
import { formatMessagesForContext } from '@/utils/message';
import type OpenAI from 'openai';
import { appendRulesToSystemPrompt } from '@/utils/rules';
import { useAgentStore } from '@/renderer/stores/Agent/AgentStore';
import { getHumanInTheLoopManager } from '@/service/langchain/human_in_the_loop/renderer/human_in_the_loop';

export const agentModeSystemPrompt = (user: IUser, agent: IUser, kbIds?: string[]) => {
  let kbInfo = "";
  if (kbIds && kbIds.length > 0) {
    kbInfo = `\n\nYou have access to the following Knowledge Base(s): [${kbIds.join(', ')}]. Use them when relevant to provide more accurate and contextual responses.`;
  }

  return `
You are ${agent.username}, the Master Agent coordinating specialized AI agents to solve complex tasks.
You are in a chat with your companion, ${user.username}.

You have access to a distributed swarm of specialized agents and tools. Your available tools will be provided to you separately.${kbInfo}

Your role:
1. Analyze complex requests from ${user.username}
2. Coordinate specialized agents (Research, Analysis, Creative, Technical, Communication, Validation)
3. Decompose tasks into subtasks for agent specialization
4. Synthesize agent results into comprehensive responses
5. Use available tools when needed for enhanced capabilities
6. Leverage Knowledge Bases when they contain relevant information

Based on messages in this chat, coordinate your agent swarm and use tools that are most relevant to efficiently solve the user's request.
If no tools or agent coordination is needed, provide a direct response.
  `.trim();
};

const getSystemPrompt = (user: IUser, agent: IUser, kbIds?: string[]): string => {
  const { agentModeSystemPrompt: customPrompt } = useLLMConfigurationStore.getState();
  
  let systemPrompt = '';
  if (customPrompt && customPrompt.trim()) {
    systemPrompt = customPrompt
      .replace(/\{agent\.username\}/g, agent.username)
      .replace(/\{user\.username\}/g, user.username)
      .replace(/\{agent_username\}/g, agent.username)
      .replace(/\{user_username\}/g, user.username);
      
    if (kbIds && kbIds.length > 0) {
      systemPrompt += `\n\nYou have access to the following Knowledge Base(s): [${kbIds.join(', ')}]. Use them when relevant to provide more accurate and contextual responses.`;
    }
  } else {
    systemPrompt = agentModeSystemPrompt(user, agent, kbIds);
  }
  
  return appendRulesToSystemPrompt(systemPrompt, 'agent');
};

interface ProcessAgentModeAIResponseParams {
  activeChatId: string;
  workspaceId?: string;
  userMessageText: string;
  agent?: IUser | null;
  currentUser: IUser | null;
  existingMessages: IChatMessage[];
  appendMessage: (chatId: string, message: IChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<IChatMessage>) => Promise<void>;
  setStreamingState: (messageId: string | null, chatId: string | null) => void;
  markStreamAsCompleted: (chatId: string, messageText: string, messageId: string) => void;
}

export async function processAgentModeAIResponse({
  activeChatId,
  workspaceId,
  userMessageText,
  agent,
  currentUser,
  existingMessages,
  appendMessage,
  updateMessage,
  setStreamingState,
  markStreamAsCompleted,
}: ProcessAgentModeAIResponseParams): Promise<{ success: boolean; responseText?: string; assistantMessageId?: string; error?: any; toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]; aborted?: boolean }> {
  const threadId = `agent_mode_${activeChatId}_${Date.now()}`;
  const humanInTheLoopManager = getHumanInTheLoopManager();
  const assistantSender = agent || getAgentFromStore();
  const assistantSenderId = assistantSender?.id || "agent-master";

  const { executeAgentTask } = useAgentStore.getState();
  const { selectedMcpServerIds } = useMCPSettingsStore.getState();
  const { selectedKbIds } = useKBSettingsStore.getState();
  
  const {
    provider,
    modelId,
    openAIKey,
    deepSeekKey,
    oneasiaKey,
    ollamaBaseURL,
    temperature: configTemperature,
  } = useLLMConfigurationStore.getState();

  if (!provider || !modelId) {
    return { success: false, error: "No model or provider selected for Agent Task." };
  }

  let allSelectedToolsFromMCPs: (OpenAI.Chat.Completions.ChatCompletionTool & { mcpServer?: string })[] = [];
  
  if (selectedMcpServerIds && selectedMcpServerIds.length > 0) {
    try {
      selectedMcpServerIds.forEach(serverId => {
        const storedTools = getServiceTools(serverId);

        if (storedTools && storedTools.length > 0) {
          const toolsFromServer = storedTools
            .filter(tool => {
              const isValid = tool && typeof tool.name === 'string' && tool.inputSchema;
              return isValid;
            })
            .map(tool => {
              const formattedTool = {
                type: "function" as const,
                function: {
                  name: tool.name,
                  description: tool.description || "No description available.",
                  parameters: tool.inputSchema,
                },
                mcpServer: serverId
              };
              return formattedTool;
            });
          
          allSelectedToolsFromMCPs.push(...toolsFromServer);
        }
      });

      const uniqueToolsMap = new Map<string, OpenAI.Chat.Completions.ChatCompletionTool & { mcpServer?: string }>();
      allSelectedToolsFromMCPs.forEach(tool => {
        if (tool.function && tool.function.name && !uniqueToolsMap.has(tool.function.name)) {
          uniqueToolsMap.set(tool.function.name, tool);
        }
      });
      allSelectedToolsFromMCPs = Array.from(uniqueToolsMap.values());
    } catch (error) {
      console.error("Error processing tools from MCPStore:", error);
    }
  }

  let systemPromptText = "";
  if (currentUser && assistantSender) {
    systemPromptText = getSystemPrompt(currentUser, assistantSender, selectedKbIds.length > 0 ? selectedKbIds : undefined);
  }

  const recentMessages = existingMessages.slice(-10);
  const formattedMessagesContext = formatMessagesForContext(recentMessages, currentUser);
  
  let taskDescription = userMessageText;
  if (formattedMessagesContext.trim()) {
    taskDescription = `Context: ${formattedMessagesContext}\n\nCurrent request: ${userMessageText}`;
  }

  if (selectedKbIds.length > 0) {
    taskDescription += `\n\nNote: You have access to Knowledge Base(s): [${selectedKbIds.join(', ')}]. Consider using them if they contain relevant information for this request.`;
  }

  const agentOptions = {
    model: modelId,
    provider: provider,
    temperature: configTemperature || 0.7,
    apiKeys: {
      openAI: openAIKey,
      deepSeek: deepSeekKey,
      oneasia: oneasiaKey,
    },
    ollamaConfig: {
      baseUrl: ollamaBaseURL,
    },
    tools: allSelectedToolsFromMCPs,
    systemPrompt: systemPromptText,
    humanInTheLoop: true,
    threadId: threadId,
    knowledgeBases: selectedKbIds.length > 0 && workspaceId ? {
      enabled: true,
      selectedKbIds: selectedKbIds,
      workspaceId: workspaceId,
    } : undefined,
  };

  console.log("Agent Task configuration:", {
    toolsCount: agentOptions.tools?.length || 0,
    knowledgeBases: selectedKbIds.length > 0 ? selectedKbIds : "None selected",
    workspaceId: workspaceId || "Not provided",
    toolsDetails: agentOptions.tools?.map(t => ({
      name: t.function?.name,
      hasParams: !!t.function?.parameters,
      mcpServer: (t as any).mcpServer
    })),
    fullAgentOptions: agentOptions
  });

  try {
    const result = await executeAgentTask(
      taskDescription,
      agentOptions,
      activeChatId,
      workspaceId
    );

    if (result.requiresHumanInteraction) {
      return {
        success: true,
        responseText: "Workflow paused for human interaction"
      };
    }

    if (result.success && result.result && !result.requiresHumanInteraction) {
      return {
        success: true,
        responseText: result.result,
      };
    }

    if (!result.success) {
      const errorMsg = result.error || "Agent task execution failed without specific error.";
      return { success: false, error: errorMsg };
    }

    return { success: false, error: "Unexpected workflow result state" };

  } catch (error: any) {
    humanInTheLoopManager.clearInteractions(threadId);
    return { success: false, error: error.message };
  } finally {
    setTimeout(() => {
      humanInTheLoopManager.clearInteractions(threadId);
    }, 30000);
  }
}
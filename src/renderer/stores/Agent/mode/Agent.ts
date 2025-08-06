import { v4 as uuidv4 } from 'uuid';
import { IChatMessage, IChatMessageToolCall } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';
import { useMCPSettingsStore } from '@/renderer/stores/MCP/MCPSettingsStore';
import { useLLMConfigurationStore } from '@/renderer/stores/LLM/LLMConfiguration';
import { useKBSettingsStore } from '@/renderer/stores/KB/KBSettingStore';
import { useAgentSettingsStore } from '@/renderer/stores/Agent/AgentSettingStore';
import { useThreeStore } from '@/renderer/stores/Avatar/ThreeStore';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { getAgentFromStore } from '@/utils/agent';
import { getServiceTools, formatMCPName } from '@/utils/mcp';
import { formatMessagesForContext } from '@/utils/message';
import type OpenAI from 'openai';
import { useAgentStore } from '@/renderer/stores/Agent/AgentStore';
import { getHumanInTheLoopManager } from '@/service/langchain/human_in_the_loop/renderer/human_in_the_loop';
import { getAgentModeSystemPrompt } from '../prompts';



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
  
  // NEW: Check if we're in avatar mode and get avatar info
  const topicStore = useTopicStore.getState();
  const isAvatarMode = topicStore.selectedContext?.section === 'workspace:avatar';
  
  let assistantSenderId = assistantSender?.id || "agent-master";
  let assistantSenderObject = assistantSender as IUser;
  
  if (isAvatarMode) {
    // In avatar mode, use avatar name and create a custom sender object
    const { selectedModel, getModelById } = useThreeStore.getState();
    const currentAvatar = getModelById(selectedModel || 'alice-3d');
    const avatarName = currentAvatar?.name || 'Avatar';
    
    // Create a custom sender object with avatar name
    assistantSenderObject = {
      ...assistantSender,
      id: avatarName.toLowerCase(),
      username: avatarName,
      name: avatarName,
      display_name: avatarName,
      settings: {}
    } as IUser;
    
    assistantSenderId = avatarName.toLowerCase();
  }

  const { executeAgentTask } = useAgentStore.getState();
  const { selectedMcpServerIds } = useMCPSettingsStore.getState();
  const { selectedKbIds } = useKBSettingsStore.getState();
  const { swarmLimits } = useAgentSettingsStore.getState();
  
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
    const avatarName = isAvatarMode ? assistantSenderObject.username : undefined;
    systemPromptText = getAgentModeSystemPrompt(
      currentUser, 
      assistantSender, 
      selectedKbIds.length > 0 ? selectedKbIds : undefined,
      avatarName
    );
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
    swarmLimits: swarmLimits,
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
    swarmLimits: swarmLimits,
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

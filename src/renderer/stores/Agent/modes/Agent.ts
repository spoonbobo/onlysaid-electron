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
import { useStreamStore } from '@/renderer/stores/Stream/StreamStore';

export const agentModeSystemPrompt = (user: IUser, agent: IUser, kbIds?: string[]) => {
  let kbInfo = "";
  if (kbIds && kbIds.length > 0) {
    kbInfo = `\n\nYou have access to the following Knowledge Base(s): [${kbIds.join(', ')}]. Use them when relevant to provide more accurate and contextual responses.`;
  }

  return `
You are ${agent.username}, the Master Agent of OSSwarm coordinating specialized AI agents to solve complex tasks.
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

// Helper function to get system prompt with fallback and rules
const getSystemPrompt = (user: IUser, agent: IUser, kbIds?: string[]): string => {
  const { agentModeSystemPrompt: customPrompt } = useLLMConfigurationStore.getState();
  
  let systemPrompt = '';
  if (customPrompt && customPrompt.trim()) {
    // Replace placeholders in custom prompt
    systemPrompt = customPrompt
      .replace(/\{agent\.username\}/g, agent.username)
      .replace(/\{user\.username\}/g, user.username)
      .replace(/\{agent_username\}/g, agent.username)
      .replace(/\{user_username\}/g, user.username);
      
    // Add KB info if available
    if (kbIds && kbIds.length > 0) {
      systemPrompt += `\n\nYou have access to the following Knowledge Base(s): [${kbIds.join(', ')}]. Use them when relevant to provide more accurate and contextual responses.`;
    }
  } else {
    // Fallback to default prompt
    systemPrompt = agentModeSystemPrompt(user, agent, kbIds);
  }
  
  // Append rules for agent mode
  return appendRulesToSystemPrompt(systemPrompt, 'agent');
};

interface ProcessAgentModeAIResponseParams {
  activeChatId: string;
  workspaceId?: string; // Add workspaceId parameter
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
  workspaceId, // Add workspaceId parameter
  userMessageText,
  agent,
  currentUser,
  existingMessages,
  appendMessage,
  updateMessage,
  setStreamingState,
  markStreamAsCompleted,
}: ProcessAgentModeAIResponseParams): Promise<{ success: boolean; responseText?: string; assistantMessageId?: string; error?: any; toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]; aborted?: boolean }> {
  // Use provided agent or get from store
  const assistantSender = agent || getAgentFromStore();
  const assistantSenderId = assistantSender?.id || "osswarm-master";

  if (!assistantSender) {
    console.warn("[AgentMode] No agent available, using fallback ID for OSSwarm master.");
  }

  // ========== REUSE EXISTING OSSWARM LOGIC ==========
  console.log("[AgentMode DEBUG] Delegating to existing OSSwarm infrastructure...");

  // Get the executeOSSwarmTask function from StreamStore (reusing existing logic)
  const { executeOSSwarmTask } = useStreamStore.getState();
  const { selectedMcpServerIds } = useMCPSettingsStore.getState();
  const { selectedKbIds } = useKBSettingsStore.getState();
  
  // Get LLM configuration
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
    const errMsg = "No model or provider selected for OSSwarm.";
    console.error(`[AgentMode DEBUG] ${errMsg}`);
    return { success: false, error: errMsg };
  }

  // Collect MCP tools with server information
  let allSelectedToolsFromMCPs: (OpenAI.Chat.Completions.ChatCompletionTool & { mcpServer?: string })[] = [];
  
  if (selectedMcpServerIds && selectedMcpServerIds.length > 0) {
    try {
      selectedMcpServerIds.forEach(serverId => {
        const storedTools = getServiceTools(serverId);
        console.log(`[AgentMode DEBUG] Loading tools for server ${serverId}:`, storedTools?.length || 0);

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
                mcpServer: serverId // ✅ Store the original MCP server
              };
              return formattedTool;
            });
          
          allSelectedToolsFromMCPs.push(...toolsFromServer);
        }
      });

      // Remove duplicates but preserve MCP server info
      const uniqueToolsMap = new Map<string, OpenAI.Chat.Completions.ChatCompletionTool & { mcpServer?: string }>();
      allSelectedToolsFromMCPs.forEach(tool => {
        if (tool.function && tool.function.name && !uniqueToolsMap.has(tool.function.name)) {
          uniqueToolsMap.set(tool.function.name, tool);
        }
      });
      allSelectedToolsFromMCPs = Array.from(uniqueToolsMap.values());

      console.log(`[AgentMode DEBUG] Total unique tools available for OSSwarm: ${allSelectedToolsFromMCPs.length}`);
      console.log(`[AgentMode DEBUG] Final tools being passed to OSSwarm:`, allSelectedToolsFromMCPs);
    } catch (error) {
      console.error("[AgentMode DEBUG] Error processing tools from MCPStore:", error);
    }
  }

  // Get system prompt with KB integration
  let systemPromptText = "";
  if (currentUser && assistantSender) {
    systemPromptText = getSystemPrompt(currentUser, assistantSender, selectedKbIds.length > 0 ? selectedKbIds : undefined);
  }

  // Format conversation context
  const recentMessages = existingMessages.slice(-10);
  const formattedMessagesContext = formatMessagesForContext(recentMessages, currentUser);
  
  let taskDescription = userMessageText;
  if (formattedMessagesContext.trim()) {
    taskDescription = `Context: ${formattedMessagesContext}\n\nCurrent request: ${userMessageText}`;
  }

  // Add KB context if available
  if (selectedKbIds.length > 0) {
    taskDescription += `\n\nNote: You have access to Knowledge Base(s): [${selectedKbIds.join(', ')}]. Consider using them if they contain relevant information for this request.`;
  }

  // Prepare OSSwarm options with explicit tool logging and KB integration
  const swarmOptions = {
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
    knowledgeBases: selectedKbIds.length > 0 ? {
      enabled: true,
      selectedKbIds: selectedKbIds,
      workspaceId: workspaceId,
    } : undefined,
  };

  console.log("[AgentMode DEBUG] OSSwarm configuration:");
  console.log("[AgentMode DEBUG] - Tools count:", swarmOptions.tools?.length || 0);
  console.log("[AgentMode DEBUG] - Knowledge Bases:", selectedKbIds.length > 0 ? selectedKbIds : "None selected");
  console.log("[AgentMode DEBUG] - Workspace ID:", workspaceId || "Not provided");
  console.log("[AgentMode DEBUG] - Tools details:", swarmOptions.tools?.map(t => ({
    name: t.function?.name,
    hasParams: !!t.function?.parameters,
    mcpServer: (t as any).mcpServer
  })));
  console.log("[AgentMode DEBUG] - Full swarmOptions:", swarmOptions);

  try {
    console.log('[AgentMode] Calling executeOSSwarmTask with:', {
      taskLength: taskDescription.length,
      toolsCount: swarmOptions.tools?.length || 0,
      kbCount: selectedKbIds.length,
      workspaceId: workspaceId,
      provider: swarmOptions.provider,
      model: swarmOptions.model
    });

    const result = await executeOSSwarmTask(
      taskDescription,
      swarmOptions,
      activeChatId,
      workspaceId // Pass workspaceId to executeOSSwarmTask
    );

    console.log('[AgentMode] executeOSSwarmTask result:', {
      success: result.success,
      hasResult: !!result.result,
      hasError: !!result.error,
      resultType: typeof result.result,
      errorMessage: result.error
    });

    if (result.error && result.error.includes('aborted')) {
      console.log("[AgentMode] OSSwarm task was aborted by user");
      return { success: false, error: result.error, aborted: true };
    }

    if (result.success && result.result) {
      // Create assistant message using OSSwarm result
      const assistantMessage: IChatMessage = {
        id: uuidv4(),
        chat_id: activeChatId,
        sender: assistantSenderId,
        sender_object: assistantSender as IUser,
        text: result.result,
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        status: "completed",
      };

      appendMessage(activeChatId, assistantMessage);
      markStreamAsCompleted(activeChatId, result.result, assistantMessage.id);

      console.log("[AgentMode DEBUG] OSSwarm task completed successfully via existing infrastructure with KB integration");

      return {
        success: true,
        responseText: result.result,
        assistantMessageId: assistantMessage.id,
      };

    } else {
      const errorMsg = result.error || "OSSwarm execution failed without specific error.";
      console.error("[AgentMode] OSSwarm execution failed:", {
        error: errorMsg,
        fullResult: result
      });
      
      return { success: false, error: errorMsg };
    }

  } catch (error: any) {
    if (error.message && error.message.includes('aborted')) {
      return { success: false, error: error.message, aborted: true };
    }
    
    console.error("[AgentMode] Critical error in OSSwarm AgentMode processing:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return { success: false, error: error.message || error };
  }
}
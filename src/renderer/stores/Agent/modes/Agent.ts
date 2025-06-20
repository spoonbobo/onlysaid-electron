import { v4 as uuidv4 } from 'uuid';
import { IChatMessage, IChatMessageToolCall } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';
import { OpenAIMessage } from '@/renderer/stores/Stream/StreamStore';
import { useMCPSettingsStore } from '@/renderer/stores/MCP/MCPSettingsStore';
import { useMCPStore } from '@/renderer/stores/MCP/MCPStore';
import { useLLMStore } from '@/renderer/stores/LLM/LLMStore';
import { useLLMConfigurationStore } from '@/renderer/stores/LLM/LLMConfiguration';
import { getAgentFromStore } from '@/utils/agent';
import { getServiceTools, formatMCPName } from '@/utils/mcp';
import { formatMessagesForContext } from '@/utils/message';
import type OpenAI from 'openai';
import { appendRulesToSystemPrompt } from '@/utils/rules';
import { useStreamStore } from '@/renderer/stores/Stream/StreamStore';

export const agentModeSystemPrompt = (user: IUser, agent: IUser) => {
  return `
You are ${agent.username}, the Master Agent of OSSwarm coordinating specialized AI agents to solve complex tasks.
You are in a chat with your companion, ${user.username}.

You have access to a distributed swarm of specialized agents and tools. Your available tools will be provided to you separately.

Your role:
1. Analyze complex requests from ${user.username}
2. Coordinate specialized agents (Research, Analysis, Creative, Technical, Communication, Validation)
3. Decompose tasks into subtasks for agent specialization
4. Synthesize agent results into comprehensive responses
5. Use available tools when needed for enhanced capabilities

Based on messages in this chat, coordinate your agent swarm and use tools that are most relevant to efficiently solve the user's request.
If no tools or agent coordination is needed, provide a direct response.
  `.trim();
};

// Helper function to get system prompt with fallback and rules
const getSystemPrompt = (user: IUser, agent: IUser): string => {
  const { agentModeSystemPrompt: customPrompt } = useLLMConfigurationStore.getState();
  
  let systemPrompt = '';
  if (customPrompt && customPrompt.trim()) {
    // Replace placeholders in custom prompt
    systemPrompt = customPrompt
      .replace(/\{agent\.username\}/g, agent.username)
      .replace(/\{user\.username\}/g, user.username)
      .replace(/\{agent_username\}/g, agent.username)
      .replace(/\{user_username\}/g, user.username);
  } else {
    // Fallback to default prompt
    systemPrompt = agentModeSystemPrompt(user, agent);
  }
  
  // Append rules for agent mode
  return appendRulesToSystemPrompt(systemPrompt, 'agent');
};

interface ProcessAgentModeAIResponseParams {
  activeChatId: string;
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

  // Get system prompt
  let systemPromptText = "";
  if (currentUser && assistantSender) {
    systemPromptText = getSystemPrompt(currentUser, assistantSender);
  }

  // Format conversation context
  const recentMessages = existingMessages.slice(-10);
  const formattedMessagesContext = formatMessagesForContext(recentMessages, currentUser);
  
  let taskDescription = userMessageText;
  if (formattedMessagesContext.trim()) {
    taskDescription = `Context: ${formattedMessagesContext}\n\nCurrent request: ${userMessageText}`;
  }

  // Prepare OSSwarm options with explicit tool logging
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
    tools: allSelectedToolsFromMCPs, // Pass the MCP tools to OSSwarm
    systemPrompt: systemPromptText, // Use agent mode system prompt
    humanInTheLoop: true, // Enable human-in-the-loop
  };

  console.log("[AgentMode DEBUG] OSSwarm configuration:");
  console.log("[AgentMode DEBUG] - Tools count:", swarmOptions.tools?.length || 0);
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
      provider: swarmOptions.provider,
      model: swarmOptions.model
    });

    const result = await executeOSSwarmTask(
      taskDescription,
      swarmOptions,
      activeChatId,
      undefined
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

      console.log("[AgentMode DEBUG] OSSwarm task completed successfully via existing infrastructure");

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

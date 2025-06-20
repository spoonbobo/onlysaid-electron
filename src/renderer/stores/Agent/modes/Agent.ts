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

export const agentModeSystemPrompt = (user: IUser, agent: IUser) => {
  return `
You are ${agent.username}, an autonomous AI agent. You are in a chat with your companion, ${user.username}.
You have access to a set of tools. Your available tools will be provided to you separately.

Based on messages in this chat, select and use tools that are most relevant to the conversation and briefly explain why you are using them.
If no tools are relevant, you can ignore the messages and do nothing.
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
}: ProcessAgentModeAIResponseParams): Promise<{ success: boolean; responseText?: string; assistantMessageId?: string; error?: any; toolCalls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] }> {
  // Use provided agent or get from store
  const assistantSender = agent || getAgentFromStore();
  const assistantSenderId = assistantSender?.id || "agent-assistant";

  if (!assistantSender) {
    console.warn("[AgentMode] No agent available, using fallback ID for assistant message sender.");
  }

  const { selectedMcpServerIds } = useMCPSettingsStore.getState();
  const mcpStore = useMCPStore.getState();
  const getLangChainCompletion = useLLMStore.getState().getLangChainCompletion;
  let allSelectedToolsFromMCPs: OpenAI.Chat.Completions.ChatCompletionTool[] = [];

  // Create mapping from tool name to MCP server
  const toolToServerMap = new Map<string, string>();
  const serverNameMap = new Map<string, string>();

  // Service type mapping (same as Playground and MCPSelector)
  const serviceTypeMapping: Record<string, string> = {
    tavily: 'tavily',
    weather: 'weather',
    location: 'location',
    weatherForecast: 'weather-forecast',
    nearbySearch: 'nearby-search',
    web3Research: 'web3-research',
    doorDash: 'doordash',
    whatsApp: 'whatsapp',
    github: 'github',
    ipLocation: 'ip-location',
    airbnb: 'airbnb',
    linkedIn: 'linkedin',
    googleCalendar: 'google-calendar',
    ms365: 'ms365',
    msTeams: 'ms-teams',
    lara: 'lara-translate',
    chess: 'chess'
  };

  if (selectedMcpServerIds && selectedMcpServerIds.length > 0) {
    try {
      // Build server name mapping using shared utility
      selectedMcpServerIds.forEach(serverId => {
        serverNameMap.set(serverId, formatMCPName(serverId));
      });

      // Use stored tools from shared utility
      selectedMcpServerIds.forEach(serverId => {
        const storedTools = getServiceTools(serverId);

        console.log(`[AgentMode] Loading tools for server ${serverId}, tools:`, storedTools);

        if (storedTools && storedTools.length > 0) {
          const toolsFromServer = storedTools
            .filter(tool => tool && typeof tool.name === 'string' && tool.inputSchema)
            .map(tool => {
              // Map tool name to server ID
              toolToServerMap.set(tool.name, serverId);
              return {
                type: "function" as const,
                function: {
                  name: tool.name,
                  description: tool.description || "No description available.",
                  parameters: tool.inputSchema,
                }
              };
            });
          allSelectedToolsFromMCPs.push(...toolsFromServer);
        }
      });

      // Remove duplicates
      const uniqueToolsMap = new Map<string, OpenAI.Chat.Completions.ChatCompletionTool>();
      allSelectedToolsFromMCPs.forEach(tool => {
        if (tool.function && tool.function.name && !uniqueToolsMap.has(tool.function.name)) {
          uniqueToolsMap.set(tool.function.name, tool);
        }
      });
      allSelectedToolsFromMCPs = Array.from(uniqueToolsMap.values());

      console.log(`[AgentMode] Total unique tools available: ${allSelectedToolsFromMCPs.length}`);
    } catch (error) {
      console.error("[AgentMode] Error processing tools from MCPStore:", error);
    }
  }

  let systemPromptText = "";
  if (currentUser && assistantSender) {
    systemPromptText = getSystemPrompt(currentUser, assistantSender);
  }

  const assistantMessage: IChatMessage = {
    id: uuidv4(),
    chat_id: activeChatId,
    sender: assistantSenderId,
    sender_object: assistantSender as IUser,
    text: "Searching for tools...",
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    status: "pending",
  };

  appendMessage(activeChatId, assistantMessage);

  try {
    const lastMessages: OpenAIMessage[] = [];
    const recentMessages = existingMessages.slice(-10);

    // Format all past messages into a single context message
    const formattedMessagesContext = formatMessagesForContext(recentMessages, currentUser);

    if (systemPromptText) {
      lastMessages.push({ role: "system", content: systemPromptText });
    }

    // Add the formatted context as a single user message if there are past messages
    if (formattedMessagesContext.trim()) {
      lastMessages.push({
        role: "user",
        content: `Previous conversation context:\n${formattedMessagesContext}`
      });
    }

    // Add the current user message
    const currentUserName = currentUser?.username || "user";
    lastMessages.push({
      role: "user",
      content: `${currentUserName} (User) [${new Date().toISOString()}]: ${userMessageText}`
    });

    // Use LangChain completion instead of direct OpenAI
    const completionResponse = await getLangChainCompletion(
      lastMessages,
      allSelectedToolsFromMCPs.length > 0 ? allSelectedToolsFromMCPs : undefined,
      allSelectedToolsFromMCPs.length > 0 ? "auto" : undefined,
      systemPromptText // Pass system prompt separately for LangChain
    );

    if (!completionResponse) {
      const errorMsg = useLLMStore.getState().error || "LangChain completion failed without specific error.";
      console.error("[AgentMode] LangChain completion failed:", errorMsg);
      await updateMessage(activeChatId, assistantMessage.id, {
        text: `Error: ${errorMsg}`,
        status: "failed"
      });
      markStreamAsCompleted(activeChatId, `Error: ${errorMsg}`, assistantMessage.id);
      return { success: false, error: errorMsg, assistantMessageId: assistantMessage.id };
    }

    const responseMessage = completionResponse.choices[0]?.message;
    let finalResponseText = responseMessage?.content || "";

    // Extract tool calls from LangChain response - they might be in different format
    let rawToolCalls = responseMessage?.tool_calls;

    // If no tool calls in standard format, check if LangChain stored them differently
    if (!rawToolCalls && completionResponse.choices[0]?.message) {
      // Try to extract from additional_kwargs or other LangChain-specific fields
      const additionalKwargs = (completionResponse.choices[0].message as any)?.additional_kwargs;
      if (additionalKwargs?.tool_calls) {
        rawToolCalls = additionalKwargs.tool_calls.map((tc: any) => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }));
      }
    }

    console.log("rawToolCalls", rawToolCalls);
    const openAIToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined = rawToolCalls ? JSON.parse(JSON.stringify(rawToolCalls)) : undefined;

    let assistantMessageUpdate: Partial<IChatMessage> = {
      sender: assistantSenderId,
      status: "completed",
    };

    if (openAIToolCalls && openAIToolCalls.length > 0) {
      const toolDescriptionsMap = new Map<string, string>();
      allSelectedToolsFromMCPs.forEach(toolDef => {
        if (toolDef.function && toolDef.function.name) {
          toolDescriptionsMap.set(toolDef.function.name, toolDef.function.description || "No description available.");
        }
      });

      const enrichedToolCalls: IChatMessageToolCall[] = openAIToolCalls.map(tc => {
        let parsedArgs = tc.function?.arguments;
        if (tc.function && typeof tc.function.arguments === 'string') {
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch (error) {
            console.error("[AgentMode] Error parsing tool call arguments:", error, "Raw arguments:", tc.function.arguments);
          }
        }

        // Get MCP server info for this tool
        const serverId = toolToServerMap.get(tc.function.name);

        return {
          id: tc.id,
          type: tc.type as 'function',
          function: {
            name: tc.function.name,
            arguments: parsedArgs,
          },
          tool_description: toolDescriptionsMap.get(tc.function.name) || "Description not found.",
          mcp_server: serverId || undefined,
        };
      });

      assistantMessageUpdate.tool_calls = enrichedToolCalls;

      if (!finalResponseText?.trim()) {
        finalResponseText = "";
      }
    } else if (!finalResponseText?.trim() && !openAIToolCalls) {
      finalResponseText = " ";
    }

    assistantMessageUpdate.text = finalResponseText;

    await updateMessage(activeChatId, assistantMessage.id, assistantMessageUpdate);

    if (assistantMessageUpdate.tool_calls && assistantMessageUpdate.tool_calls.length > 0) {
      try {
        const llmStoreActions = useLLMStore.getState();
        await llmStoreActions.createToolCalls(assistantMessage.id, assistantMessageUpdate.tool_calls);
      } catch (dbError) {
        console.error("[AgentMode] Failed to store tool calls to DB:", dbError);
      }
    }

    markStreamAsCompleted(activeChatId, finalResponseText, assistantMessage.id);

    return {
      success: true,
      responseText: finalResponseText,
      assistantMessageId: assistantMessage.id,
      toolCalls: openAIToolCalls
    };

  } catch (error: any) {
    console.error("[AgentMode] Error in LangChain AgentMode processing:", error);
    await updateMessage(activeChatId, assistantMessage.id, {
      text: "Error generating response in Agent Mode with LangChain. Please try again.",
      status: "failed"
    });
    markStreamAsCompleted(activeChatId, "Error generating response in Agent Mode with LangChain.", assistantMessage.id);
    return { success: false, error: error.message || error, assistantMessageId: assistantMessage.id };
  }
}

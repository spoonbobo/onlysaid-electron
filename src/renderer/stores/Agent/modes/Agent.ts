import { v4 as uuidv4 } from 'uuid';
import { IChatMessage, IChatMessageToolCall } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';
import { OpenAIMessage } from '@/renderer/stores/SSE/StreamStore';
import { useMCPClientStore } from '@/renderer/stores/MCP/MCPClient';
import { useMCPSettingsStore } from '@/renderer/stores/MCP/MCPSettingsStore';
import { useLLMStore } from '@/renderer/stores/LLM/LLMStore';
import { getAgentFromStore } from '@/utils/agent';
import type OpenAI from 'openai';

export const agentModeSystemPrompt = (user: IUser, agent: IUser) => {
  return `
You are ${agent.username}, an autonomous AI agent. You are in a chat with your companion, ${user.username}.
You have access to a set of tools. Your available tools will be provided to you separately.

Based on messages in this chat, select tools that are most relevant to the conversation and briefly explain why you are using them.
If no tools are relevant, you can ignore the messages and do nothing.

Your primary goal is to be an effective assistant within this chat.
  `.trim();
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
  const { ListMCPTool } = useMCPClientStore.getState();
  const getOpenAICompletion = useLLMStore.getState().getOpenAICompletion;
  let allSelectedToolsFromMCPs: OpenAI.Chat.Completions.ChatCompletionTool[] = [];

  // Create mapping from tool name to MCP server
  const toolToServerMap = new Map<string, string>();
  const serverNameMap = new Map<string, string>();

  if (selectedMcpServerIds && selectedMcpServerIds.length > 0) {
    try {
      // Get server names using formatMCPName function
      const formatMCPName = (key: string): string => {
        return key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim()
          .replace(/Category$/, '')
          .trim();
      };

      // Build server name mapping
      selectedMcpServerIds.forEach(serverId => {
        serverNameMap.set(serverId, formatMCPName(serverId));
      });

      const toolPromises = selectedMcpServerIds.map(serverId => ListMCPTool(serverId) as Promise<{ success: boolean, data?: { tools?: any[] }, error?: string }>);
      const results = await Promise.allSettled(toolPromises);

      results.forEach((result, index) => {
        const serverId = selectedMcpServerIds[index];
        if (result.status === 'fulfilled' && result.value) {
          const wrapper = result.value;
          if (wrapper.success && wrapper.data && Array.isArray(wrapper.data.tools)) {
            const toolsFromServer = (wrapper.data.tools as any[])
              .filter(tool => tool && typeof tool.name === 'string' && tool.inputSchema)
              .map(tool => {
                // Map tool name to server ID
                toolToServerMap.set(tool.name, serverId);
                return {
                  type: "function" as const,
                  function: {
                    name: tool.name,
                    description: typeof tool.description === 'string' ? tool.description : "No description available.",
                    parameters: tool.inputSchema,
                  }
                };
              });
            allSelectedToolsFromMCPs.push(...toolsFromServer);
          }
        }
      });

      const uniqueToolsMap = new Map<string, OpenAI.Chat.Completions.ChatCompletionTool>();
      allSelectedToolsFromMCPs.forEach(tool => {
        if (tool.function && tool.function.name && !uniqueToolsMap.has(tool.function.name)) {
          uniqueToolsMap.set(tool.function.name, tool);
        }
      });
      allSelectedToolsFromMCPs = Array.from(uniqueToolsMap.values());
    } catch (error) {
      console.error("[AgentMode] Error processing tool fetching promises:", error);
    }
  }

  let systemPromptText = "";
  if (currentUser && assistantSender) {
    systemPromptText = agentModeSystemPrompt(currentUser, assistantSender);
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

    for (const msg of recentMessages) {
      let role: "assistant" | "user" | "system" | "tool" = "assistant";
      if (msg.sender === currentUser?.id) {
        role = "user";
      } else if (msg.is_tool_response) {
        role = "tool";
      }

      const messageContent: any = {
        role: role,
        content: msg.text || ""
      };

      lastMessages.push(messageContent);
    }

    if (systemPromptText) {
      lastMessages.unshift({ role: "system", content: systemPromptText });
    }
    const currentUserName = currentUser?.username || "user";
    lastMessages.push({
      role: "user",
      content: `[${new Date().toISOString()}] ${currentUserName}: ${userMessageText}`
    });

    const completionResponse = await getOpenAICompletion(
      lastMessages,
      allSelectedToolsFromMCPs.length > 0 ? allSelectedToolsFromMCPs : undefined,
      allSelectedToolsFromMCPs.length > 0 ? "auto" : undefined
    );

    if (!completionResponse) {
      const errorMsg = useLLMStore.getState().error || "LLM completion failed without specific error.";
      console.error("[AgentMode] LLM completion failed:", errorMsg);
      await updateMessage(activeChatId, assistantMessage.id, {
        text: `Error: ${errorMsg}`,
        status: "failed"
      });
      markStreamAsCompleted(activeChatId, `Error: ${errorMsg}`, assistantMessage.id);
      return { success: false, error: errorMsg, assistantMessageId: assistantMessage.id };
    }

    const responseMessage = completionResponse.choices[0]?.message;
    let finalResponseText = responseMessage?.content || "";
    const rawToolCalls = responseMessage?.tool_calls;
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
    console.error("[AgentMode] Error in AgentMode processing:", error);
    await updateMessage(activeChatId, assistantMessage.id, {
      text: "Error generating response in Agent Mode. Please try again.",
      status: "failed"
    });
    markStreamAsCompleted(activeChatId, "Error generating response in Agent Mode.", assistantMessage.id);
    return { success: false, error: error.message || error, assistantMessageId: assistantMessage.id };
  }
}

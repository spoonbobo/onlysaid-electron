import { useAgentStore } from "@/stores/Agent/AgentStore";
import { useUserTokenStore } from "@/stores/User/UserToken";
import { useChatStore } from "@/stores/Chat/ChatStore";
import { useStreamStore } from "@/stores/SSE/StreamStore";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useSelectedModelStore } from "@/stores/LLM/SelectedModelStore";
import { useUserStore } from "@/stores/User/UserStore";
import { useMCPClientStore } from '@/stores/MCP/MCPClient';

// Get agent from store
export const getAgentFromStore = () => {
  return useAgentStore.getState().agent;
};

// Get agent processing state
export const isAgentProcessing = () => {
  return useAgentStore.getState().isProcessingResponse;
};

// Fetch agent by ID
export const fetchAgent = async (agentId: string) => {
  const token = useUserTokenStore.getState().getToken();
  if (!token) {
    throw new Error("No user token available");
  }

  return useAgentStore.getState().fetchAgent(agentId, token);
};

// Send agent message with automatic store integration
export const sendAgentMessage = async (
  chatId: string,
  prompt: string,
  mode: "ask" | "query" | "agent" = "ask"
) => {
  return useAgentStore.getState().sendAgentMessage(chatId, prompt, mode);
};

// Quick agent response without chat integration
export const getQuickAgentResponse = async (
  prompt: string,
  mode: "ask" = "ask"
) => {
  return useAgentStore.getState().quickResponse(prompt, mode);
};

// Process agent response with full context
export const processAgentResponse = async (
  chatId: string,
  userMessage: string,
  mode: "ask" | "query" | "agent" = "ask",
  workspaceId?: string
) => {
  const agent = getAgentFromStore();
  if (!agent) {
    throw new Error("No agent available");
  }

  const { appendMessage, updateMessage } = useChatStore.getState();
  const { streamChatCompletion } = useStreamStore.getState();
  const { setStreamingState, markStreamAsCompleted } = useTopicStore.getState();
  const { modelId, provider } = useSelectedModelStore.getState();
  const { user: currentUser } = useUserStore.getState();

  if (!modelId) {
    throw new Error("No model selected");
  }

  const messages = useChatStore.getState().messages[chatId] || [];

  return useAgentStore.getState().processAgentResponse({
    activeChatId: chatId,
    userMessageText: userMessage,
    modelId,
    provider: provider || "openai",
    currentUser,
    existingMessages: messages,
    workspaceId,
    aiMode: mode,
    appendMessage,
    updateMessage,
    setStreamingState,
    markStreamAsCompleted,
    streamChatCompletion,
  });
};

// Agent experience utilities
export const gainAgentExperience = async (amount: number) => {
  return useAgentStore.getState().gainExperience(amount);
};

export const levelUpAgent = async (addedXP: number) => {
  return useAgentStore.getState().levelUp(addedXP);
};

// Calculate experience for level
export const calculateExperienceForLevel = (level: number): number => {
  return 50 * level;
};

// Execute MCP tool
export const executeAgentTool = async (
  serverName: string,
  toolName: string,
  args: Record<string, any>
) => {
  return useMCPClientStore.getState().executeTool(serverName, toolName, args);
};

// Execute tool with automatic server detection (if you have MCP settings)
export const executeToolAuto = async (
  toolName: string,
  args: Record<string, any>
) => {
  // You can enhance this to automatically detect the right server
  // based on your MCP settings store
  return executeAgentTool('default', toolName, args);
};

// Summarize tool call results
export const summarizeToolResults = async (
  chatId: string,
  toolCallResults: Array<{
    toolName: string;
    result: any;
    executionTime?: number;
    status: string;
  }>
) => {
  const { appendMessage, updateMessage } = useChatStore.getState();
  const { streamChatCompletion } = useStreamStore.getState();
  const { setStreamingState, markStreamAsCompleted } = useTopicStore.getState();
  const { modelId, provider } = useSelectedModelStore.getState();
  const { user: currentUser } = useUserStore.getState();
  const agent = getAgentFromStore();

  if (!modelId) {
    throw new Error("No model selected for summarization");
  }

  const messages = useChatStore.getState().messages[chatId] || [];

  return useAgentStore.getState().summarizeToolCallResults({
    activeChatId: chatId,
    toolCallResults,
    modelId,
    provider: provider || "openai",
    agent,
    currentUser,
    existingMessages: messages,
    appendMessage,
    updateMessage,
    setStreamingState,
    markStreamAsCompleted,
    streamChatCompletion,
  });
};

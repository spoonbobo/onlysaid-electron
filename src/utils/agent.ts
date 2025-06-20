import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useStreamStore } from "@/renderer/stores/Stream/StreamStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useMCPClientStore } from '@/renderer/stores/MCP/MCPClient';
import { IUser } from "@/../../types/User/User";

// Helper function to create guest agent data
const createGuestAgentData = (): IUser => ({
  id: "guest-agent",
  username: "Guest Agent",
  email: "guest-agent@local",
  avatar: null,
  settings: {
    general: {
      theme: "system",
      language: "en"
    }
  },
  level: 1,
  xp: 0,
  is_human: false,
  agent_id: null,
});

// Get agent from store - ensure guest agent exists if no agent is available
export const getAgentFromStore = () => {
  const agent = useAgentStore.getState().agent;
  
  // If no agent exists and no user is logged in, create guest agent
  if (!agent) {
    const user = useUserStore.getState().user;
    if (!user) {
      const { createGuestAgent } = useAgentStore.getState();
      createGuestAgent();
      return useAgentStore.getState().agent || createGuestAgentData();
    }
  }
  
  return agent;
};

// Helper function to check if current agent is guest
export const isGuestAgent = () => {
  const agent = useAgentStore.getState().agent;
  return !agent || agent.id === "guest-agent";
};

// Helper function to get the actual agent (null if guest)
export const getRealAgentFromStore = () => {
  const agent = useAgentStore.getState().agent;
  return agent?.id === "guest-agent" ? null : agent;
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
  const { modelId, provider } = useLLMConfigurationStore.getState();
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
  const { modelId, provider } = useLLMConfigurationStore.getState();
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

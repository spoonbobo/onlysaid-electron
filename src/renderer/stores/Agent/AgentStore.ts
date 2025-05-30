import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "@/../../types/User/User"; // Assuming IUser is in this path
import { useUserTokenStore } from "@/renderer/stores/User/UserToken"; // For fetching the token
import { toast } from "@/utils/toast"; // For notifications
import { IChatMessage } from "@/../../types/Chat/Message";
import { processAskModeAIResponse } from "@/renderer/stores/Agent/modes/Ask";
import { processQueryModeAIResponse } from "@/renderer/stores/Agent/modes/Query";
import { processAgentModeAIResponse } from "@/renderer/stores/Agent/modes/Agent";
import { useMCPClientStore } from '@/renderer/stores/MCP/MCPClient';
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useStreamStore } from "@/renderer/stores/Stream/StreamStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { calculateExperienceForLevel } from "@/utils/agent";
import { summarizeToolCallResults } from "@/renderer/stores/Agent/modes/Ask";

interface AgentResponseParams {
  activeChatId: string;
  userMessageText: string;
  modelId: string;
  provider: string;
  currentUser: IUser | null;
  existingMessages: IChatMessage[];
  workspaceId?: string;
  aiMode: "ask" | "query" | "agent";
  appendMessage: (chatId: string, message: IChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<IChatMessage>) => Promise<void>;
  setStreamingState: (messageId: string | null, chatId: string | null) => void;
  markStreamAsCompleted: (chatId: string, messageText: string) => void;
  streamChatCompletion: any; // Type this properly based on your StreamStore
}

interface AgentState {
  agent: IUser | null;
  isLoading: boolean;
  error: string | null;
  isProcessingResponse: boolean;
  setAgent: (agent: IUser | null) => void;
  clearAgent: () => void;
  fetchAgent: (agentId: string, token: string) => Promise<void>;
  gainExperience: (amount: number) => Promise<void>; // New
  levelUp: (addedXP: number) => Promise<void>; // New

  // New agent response methods
  processAgentResponse: (params: AgentResponseParams) => Promise<{ success: boolean; assistantMessageId?: string; error?: any }>;
  setProcessingResponse: (isProcessing: boolean) => void;

  // Simplified methods
  sendAgentMessage: (chatId: string, prompt: string, mode?: "ask" | "query" | "agent") => Promise<{ success: boolean; messageId?: string; error?: any }>;
  quickResponse: (prompt: string, mode?: "ask") => Promise<{ success: boolean; response?: string; error?: any }>;

  // Add new method for tool result summarization
  summarizeToolCallResults: (params: {
    activeChatId: string;
    toolCallResults: Array<{
      toolName: string;
      result: any;
      executionTime?: number;
      status: string;
    }>;
    modelId: string;
    provider: string;
    agent?: IUser | null;
    currentUser: IUser | null;
    existingMessages: IChatMessage[];
    appendMessage: (chatId: string, message: IChatMessage) => void;
    updateMessage: (chatId: string, messageId: string, updates: Partial<IChatMessage>) => Promise<void>;
    setStreamingState: (messageId: string | null, chatId: string | null) => void;
    markStreamAsCompleted: (chatId: string, messageText: string) => void;
    streamChatCompletion: any;
  }) => Promise<{ success: boolean; responseText?: string; assistantMessageId?: string; error?: any }>;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agent: null,
      isLoading: false,
      error: null,
      isProcessingResponse: false,
      setAgent: (agent) => set({ agent, isLoading: false, error: null }),
      clearAgent: () => set({ agent: null, isLoading: false, error: null }),
      fetchAgent: async (agentId: string, token: string) => {
        if (!agentId || !token) {
          set({ agent: null, isLoading: false, error: "Agent ID or token not provided." });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          // @ts-ignore
          const response = await window.electron.user.get({
            token,
            args: { ids: [agentId] }
          });

          if (response.error) {
            throw new Error(response.error);
          }

          if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
            const agentData = response.data.data[0] as IUser;
            set({ agent: agentData, isLoading: false, error: null });
          } else if (response.data?.data) { // Handle if API returns single object not in array
            const agentData = response.data.data as IUser;
            set({ agent: agentData, isLoading: false, error: null });
          }

          else {
            throw new Error("Agent not found or invalid response structure.");
          }
        } catch (error: any) {
          console.error('[AgentStore] Error fetching agent:', error);
          set({ agent: null, isLoading: false, error: error.message || "Failed to fetch agent." });
        }
      },

      gainExperience: async (amount: number) => {
        const currentAgent = get().agent;
        if (!currentAgent) {
          console.warn("[AgentStore] gainExperience called without an agent. Skipping.");
          toast.error("No agent active to gain experience.");
          return;
        }

        const currentXP = currentAgent.xp ?? 0;
        const currentLevel = currentAgent.level ?? 0;

        let newExperience = currentXP + amount;
        let newLevel = currentLevel;
        let experienceToReachNext = calculateExperienceForLevel(newLevel === 0 ? 1 : newLevel + 1);
        let leveledUp = false;

        while (newExperience >= experienceToReachNext && experienceToReachNext > 0) {
          newExperience -= experienceToReachNext;
          newLevel++;
          experienceToReachNext = calculateExperienceForLevel(newLevel + 1);
          toast.success(`Agent leveled up! Now level ${newLevel}!`);
          leveledUp = true;
        }

        if (!leveledUp && newExperience === currentXP) { // No change if not enough for level and no partial XP gain
          // return; // Removed to allow saving partial XP gain even if no level up
        }

        const updatedAgentObject: IUser = {
          ...currentAgent,
          level: newLevel,
          xp: newExperience,
        };

        set({ agent: updatedAgentObject });

        try {
          const { token } = useUserTokenStore.getState();
          if (!token) {
            throw new Error("User token not found for backend update.");
          }
          // @ts-ignore
          const response = await window.electron.user.update({
            user: updatedAgentObject, // API expects 'user' field for the object to update
            token,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          if (response.data?.data) {
            set({ agent: response.data.data, error: null }); // Update with backend response
          } else {
            console.warn('[AgentStore] Backend did not return updated agent data as expected after gainExperience.');
          }
        } catch (error: any) {
          console.error('[AgentStore] Failed to update agent on backend after gainExperience:', error);
          toast.error(`Failed to save agent experience: ${error.message}`);
          // Optionally revert state: set({ agent: currentAgent });
        }
      },

      levelUp: async (addedXP: number) => { // Assuming addedXP is the XP for the new level
        const currentAgent = get().agent;
        if (!currentAgent) {
          console.warn("[AgentStore] levelUp called without an agent. Skipping.");
          toast.error("No agent active to level up.");
          return;
        }
        const currentLevel = currentAgent.level ?? 0;
        const newLevel = currentLevel + 1;

        const updatedAgentObject: IUser = {
          ...currentAgent,
          level: newLevel,
          xp: addedXP, // Sets XP to the provided amount for the new level
        };

        set({ agent: updatedAgentObject });
        toast.success(`Agent leveled up! Now level ${newLevel}!`);

        try {
          const { token } = useUserTokenStore.getState();
          if (!token) {
            throw new Error("User token not found for backend update.");
          }
          // @ts-ignore
          const response = await window.electron.user.update({
            user: updatedAgentObject, // API expects 'user' field
            token,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          if (response.data?.data) {
            set({ agent: response.data.data, error: null });
          } else {
            console.warn('[AgentStore] Backend did not return updated agent data as expected after levelUp.');
          }
        } catch (error: any) {
          console.error('[AgentStore] Failed to update agent on backend after levelUp:', error);
          toast.error(`Failed to save agent level up: ${error.message}`);
          // Optionally revert state: set({ agent: currentAgent });
        }
      },

      setProcessingResponse: (isProcessing) => set({ isProcessingResponse: isProcessing }),

      processAgentResponse: async (params: AgentResponseParams) => {
        const {
          activeChatId,
          userMessageText,
          modelId,
          provider,
          currentUser,
          existingMessages,
          workspaceId,
          aiMode,
          appendMessage,
          updateMessage,
          setStreamingState,
          markStreamAsCompleted,
          streamChatCompletion
        } = params;

        const currentAgent = get().agent;
        if (!currentAgent) {
          console.error("[AgentStore] No agent available for response processing");
          return { success: false, error: "No agent available" };
        }

        set({ isProcessingResponse: true, error: null });

        try {
          let result;

          switch (aiMode) {
            case "ask":
              result = await processAskModeAIResponse({
                activeChatId,
                userMessageText,
                modelId,
                provider,
                agent: currentAgent,
                currentUser,
                existingMessages,
                appendMessage,
                updateMessage,
                setStreamingState,
                markStreamAsCompleted,
                streamChatCompletion,
              });
              break;

            case "query":
              if (!workspaceId) {
                throw new Error("Workspace ID is required for query mode");
              }
              result = await processQueryModeAIResponse({
                activeChatId,
                workspaceId,
                userMessageText,
                modelId,
                provider: "onlysaid-kb",
                agent: currentAgent,
                currentUser,
                existingMessages,
                appendMessage,
                updateMessage,
                setStreamingState,
                markStreamAsCompleted,
                streamChatCompletion,
              });
              break;

            case "agent":
              // Initialize MCP tools if needed
              try {
                const { ListMCPTool } = useMCPClientStore.getState();
                const tools = await ListMCPTool("default");
                console.log("Tools available for agent:", tools);
              } catch (error) {
                console.error("Failed to list tools for agent mode:", error);
              }

              result = await processAgentModeAIResponse({
                activeChatId,
                userMessageText,
                agent: currentAgent,
                currentUser,
                existingMessages,
                appendMessage,
                updateMessage,
                setStreamingState,
                markStreamAsCompleted,
              });
              break;

            default:
              throw new Error(`Unsupported AI mode: ${aiMode}`);
          }

          if (result.success) {
            // Calculate and award experience based on response
            const tokenCount = result.responseText?.length || 0;
            const earnedXP = Math.floor(tokenCount / 10);
            if (earnedXP > 0) {
              await get().gainExperience(earnedXP);
            }
          }

          set({ isProcessingResponse: false });
          return {
            success: result.success,
            assistantMessageId: result.assistantMessageId,
            error: result.error
          };

        } catch (error: any) {
          console.error("[AgentStore] Error processing agent response:", error);
          set({ isProcessingResponse: false, error: error.message });
          return { success: false, error };
        }
      },

      sendAgentMessage: async (chatId: string, prompt: string, mode: "ask" | "query" | "agent" = "ask") => {
        const currentAgent = get().agent;
        if (!currentAgent) {
          return { success: false, error: "No agent available" };
        }

        try {
          // Get required stores
          const { appendMessage, updateMessage, fetchMessages } = useChatStore.getState();
          const { streamChatCompletion } = useStreamStore.getState();
          const { setStreamingState, markStreamAsCompleted } = useTopicStore.getState();
          const { modelId, provider } = useLLMConfigurationStore.getState();
          const { user: currentUser } = useUserStore.getState();

          if (!modelId) {
            return { success: false, error: "No model selected" };
          }

          // Get existing messages
          const messages = useChatStore.getState().messages[chatId] || [];

          const result = await get().processAgentResponse({
            activeChatId: chatId,
            userMessageText: prompt,
            modelId,
            provider: provider || "openai",
            currentUser,
            existingMessages: messages,
            aiMode: mode,
            appendMessage,
            updateMessage,
            setStreamingState,
            markStreamAsCompleted,
            streamChatCompletion,
          });

          return {
            success: result.success,
            messageId: result.assistantMessageId,
            error: result.error
          };

        } catch (error: any) {
          console.error("[AgentStore] Error in sendAgentMessage:", error);
          return { success: false, error: error.message };
        }
      },

      quickResponse: async (prompt: string, mode: "ask" = "ask") => {
        const currentAgent = get().agent;
        if (!currentAgent) {
          return { success: false, error: "No agent available" };
        }

        try {
          // This could be used for getting responses without saving to chat
          // You'd implement a simpler version that just returns the text
          const { modelId, provider } = useLLMConfigurationStore.getState();
          const { user: currentUser } = useUserStore.getState();

          if (!modelId) {
            return { success: false, error: "No model selected" };
          }

          // Create a temporary chat context for the response
          const tempChatId = `temp-${Date.now()}`;

          // Simplified response logic here...
          // This would be a lighter version without full chat integration

          return { success: true, response: "Agent response here" };

        } catch (error: any) {
          console.error("[AgentStore] Error in quickResponse:", error);
          return { success: false, error: error.message };
        }
      },

      summarizeToolCallResults: async (params) => {
        const currentAgent = get().agent;
        if (!currentAgent) {
          console.error("[AgentStore] No agent available for tool result summarization");
          return { success: false, error: "No agent available" };
        }

        set({ isProcessingResponse: true, error: null });

        try {
          const result = await summarizeToolCallResults({
            ...params,
            agent: currentAgent,
          });

          if (result.success) {
            // Award experience for summarization
            const earnedXP = Math.floor((result.responseText?.length || 0) / 20);
            if (earnedXP > 0) {
              await get().gainExperience(earnedXP);
            }
          }

          set({ isProcessingResponse: false });
          return result;

        } catch (error: any) {
          console.error("[AgentStore] Error summarizing tool results:", error);
          set({ isProcessingResponse: false, error: error.message });
          return { success: false, error };
        }
      },
    }),
    {
      name: "agent-storage", // Updated persistence key name
      partialize: (state) => ({
        agent: state.agent, // Only persist the agent object
      }),
    }
  )
);

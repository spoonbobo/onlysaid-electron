import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "@/../../types/User/User"; // Assuming IUser is in this path
import { useUserTokenStore } from "@/renderer/stores/User/UserToken"; // For fetching the token
import { toast } from "@/utils/toast"; // For notifications
import { IChatMessage } from "@/../../types/Chat/Message";
import { processAskModeAIResponse } from "@/renderer/stores/Agent/mode/Ask";
import { processQueryModeAIResponse } from "@/renderer/stores/Agent/mode/Query";
import { processAgentModeAIResponse } from "@/renderer/stores/Agent/mode/Agent";
import { useMCPClientStore } from '@/renderer/stores/MCP/MCPClient';
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useStreamStore } from "@/renderer/stores/Stream/StreamStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { calculateExperienceForLevel } from "@/utils/agent";
import { summarizeToolCallResults } from "@/renderer/stores/Agent/mode/Ask";
import { v4 as uuidv4 } from 'uuid';
import { getCurrentWorkspaceId } from "@/utils/workspace";
import { getHumanInTheLoopManager, requestApproval, HumanInteractionResponse, HumanInteractionRequest } from '@/service/langchain/human_in_the_loop/renderer/human_in_the_loop';

const rendererIpcTracker = new Map<string, { count: number; timestamps: number[] }>();

function trackRendererIpcCall(eventName: string, data?: any) {
  const timestamp = Date.now();
  const key = eventName;
  
  if (!rendererIpcTracker.has(key)) {
    rendererIpcTracker.set(key, { count: 0, timestamps: [] });
  }
  
  const tracker = rendererIpcTracker.get(key)!;
  tracker.count++;
  tracker.timestamps.push(timestamp);
  
  // Check for duplicates within 100ms
  const recentCalls = tracker.timestamps.filter(t => timestamp - t < 100);
  if (recentCalls.length > 1) {
    console.warn(`🚨 [RENDERER IPC DUPLICATE] ${eventName} called ${recentCalls.length} times within 100ms:`, {
      timestamps: recentCalls,
      data
    });
  }
  
  console.log(`📤 [RENDERER IPC] ${eventName} - Call #${tracker.count} at ${timestamp}`);
}

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
  createGuestAgent: () => void; // New method for guest agent
  gainExperience: (amount: number) => Promise<void>;
  levelUp: (addedXP: number) => Promise<void>;

  // New agent response methods
  processAgentResponse: (params: AgentResponseParams) => Promise<{ success: boolean; assistantMessageId?: string; error?: any }>;
  setProcessingResponse: (isProcessing: boolean) => void;

  // Usage logging
  logAgentUsage: (modelId: string, mode: "ask" | "query" | "agent", success: boolean, responseLength?: number) => Promise<void>;

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

  // Agent Task methods - renamed from OSSwarm
  agentTaskUpdates: Record<string, string[]>;
  activeAgentTasks: Record<string, boolean>;
  agentTaskStatus: Record<string, 'idle' | 'initializing' | 'running' | 'completing' | 'completed' | 'failed' | 'aborted' | 'awaiting_human'>;
  
  executeAgentTask: (
    task: string,
    options: any,
    chatId?: string,
    workspaceId?: string
  ) => Promise<{ success: boolean; result?: string; error?: string; aborted: boolean; requiresHumanInteraction?: boolean }>;
  abortAgentTask: (taskId?: string) => Promise<void>;
  clearAgentTaskUpdates: (taskId: string) => void;
  forceStopAgentTask: (taskId: string) => void;
  setAgentTaskStatus: (taskId: string, status: AgentState['agentTaskStatus'][string]) => void;
  processAgentTaskResponse: (params: AgentResponseParams) => Promise<{ success: boolean; assistantMessageId?: string; error?: any }>;

  // Human-in-the-loop state
  pendingHumanInteractions: Record<string, any>;
  humanInteractionCallbacks: Record<string, (response: HumanInteractionResponse) => void>;
  
  // Human-in-the-loop methods
  handleHumanInteraction: (interactionId: string, response: HumanInteractionResponse) => Promise<void>;
  getPendingInteractions: (threadId?: string) => any[];
  clearHumanInteractions: (threadId: string) => void;

  // LangGraph workflow state
  activeLangGraphWorkflows: Record<string, any>;
  
  // Methods for LangGraph integration
  resumeLangGraphWorkflow: (threadId: string, response: HumanInteractionResponse) => Promise<{
    success: boolean;
    completed: boolean;
    result?: string;
    error?: string;
  }>;

  clearAgentTaskState: (taskId: string) => void;
  clearAllAgentTaskState: () => void;
}

// Helper function to create guest agent
const createGuestAgentData = (): IUser => ({
  id: "guest-agent",
  username: "Local AI Assistant",
  email: "guest@local",
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

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => {
      // Setup Agent Task IPC listeners
      if (typeof window !== 'undefined' && window.electron) {
        window.electron.ipcRenderer.on('agent:stream_update', (...args) => {
          const payload = args[1] as { update?: string };
          if (payload?.update) {
            const taskId = 'current';
            
            // Update status based on stream content
            let newStatus: AgentState['agentTaskStatus'][string] = 'running';
            if (payload.update.includes('initializing') || payload.update.includes('analyzing')) {
              newStatus = 'initializing';
            } else if (payload.update.includes('completed') || payload.update.includes('success')) {
              newStatus = 'completing';
            } else if (payload.update.includes('error') || payload.update.includes('failed')) {
              newStatus = 'failed';
            } else if (payload.update.includes('aborted')) {
              newStatus = 'aborted';
            }
            
            set(state => ({
              agentTaskUpdates: {
                ...state.agentTaskUpdates,
                [taskId]: [...(state.agentTaskUpdates[taskId] || []), payload.update!]
              },
              agentTaskStatus: {
                ...state.agentTaskStatus,
                [taskId]: newStatus
              }
            }));
          }
        });
      }

      // Remove the old abort controller setup and replace with human-in-the-loop
      if (typeof window !== 'undefined' && window.electron) {
        // Setup human interaction IPC listeners
        window.electron.ipcRenderer.on('agent:human_interaction_request', (...args) => {
          const payload = args[1] as { interactionId: string; request: HumanInteractionRequest };
          console.log('[AgentStore] Received LangGraph human interaction request:', payload);
          
          set(state => ({
            pendingHumanInteractions: {
              ...state.pendingHumanInteractions,
              [payload.interactionId]: { request: payload.request }
            }
          }));

          // Show UI notification or modal for human interaction
          // This would trigger your UI components to show approval dialogs
        });

        // Handle human interaction responses and resume LangGraph
        window.electron.ipcRenderer.on('agent:human_interaction_response', (...args) => {
          const payload = args[1] as { interactionId: string; response: HumanInteractionResponse };
          console.log('[AgentStore] Processing LangGraph human interaction response:', payload);
          
          // Resume the LangGraph workflow
          const threadId = get().pendingHumanInteractions[payload.interactionId]?.request?.threadId;
          if (threadId) {
            get().resumeLangGraphWorkflow(threadId, payload.response);
          }
          
          // Clean up
          set(state => {
            const newInteractions = { ...state.pendingHumanInteractions };
            delete newInteractions[payload.interactionId];
            return { pendingHumanInteractions: newInteractions };
          });
        });
      }

      return {
        agent: null,
        isLoading: false,
        error: null,
        isProcessingResponse: false,
        
        // Agent Task state - renamed from OSSwarm
        agentTaskUpdates: {},
        activeAgentTasks: {},
        agentTaskStatus: {},

        // Human-in-the-loop state - ✅ Add these missing properties
        pendingHumanInteractions: {},
        humanInteractionCallbacks: {},

        // LangGraph workflow state - ✅ Add this missing property
        activeLangGraphWorkflows: {},

        setAgent: (agent) => set({ agent, isLoading: false, error: null }),
        clearAgent: () => set({ agent: null, isLoading: false, error: null }),
        
        createGuestAgent: () => {
          const guestAgent = createGuestAgentData();
          console.log('[AgentStore] Creating guest agent for offline mode');
          set({ agent: guestAgent, isLoading: false, error: null });
        },

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
            return;
          }

          // Check if this is a guest agent (offline mode)
          const isGuestAgent = currentAgent.id === "guest-agent";
          
          if (isGuestAgent) {
            // For guest agents, just update local state without backend calls
            const currentXP = currentAgent.xp ?? 0;
            const currentLevel = currentAgent.level ?? 0;

            let newExperience = currentXP + amount;
            let newLevel = currentLevel;
            let experienceToReachNext = calculateExperienceForLevel(newLevel === 0 ? 1 : newLevel + 1);

            while (newExperience >= experienceToReachNext && experienceToReachNext > 0) {
              newExperience -= experienceToReachNext;
              newLevel++;
              experienceToReachNext = calculateExperienceForLevel(newLevel + 1);
              toast.success(`Local Agent leveled up! Now level ${newLevel}!`);
            }

            const updatedAgentObject: IUser = {
              ...currentAgent,
              level: newLevel,
              xp: newExperience,
            };

            set({ agent: updatedAgentObject });
            console.log(`[AgentStore] Guest agent gained ${amount} XP (local only)`);
            return;
          }

          // Original online agent XP logic
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
            return;
          }

          // Check if this is a guest agent (offline mode)
          const isGuestAgent = currentAgent.id === "guest-agent";
          
          if (isGuestAgent) {
            // For guest agents, just update local state
            const currentLevel = currentAgent.level ?? 0;
            const newLevel = currentLevel + 1;

            const updatedAgentObject: IUser = {
              ...currentAgent,
              level: newLevel,
              xp: addedXP,
            };

            set({ agent: updatedAgentObject });
            toast.success(`Local Agent leveled up! Now level ${newLevel}!`);
            console.log(`[AgentStore] Guest agent leveled up to ${newLevel} (local only)`);
            return;
          }

          // Original online agent level up logic
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

        logAgentUsage: async (modelId: string, mode: "ask" | "query" | "agent", success: boolean, responseLength: number = 0) => {
          const currentAgent = get().agent;
          
          // Skip usage logging for guest agents
          if (currentAgent?.id === "guest-agent") {
            console.log(`[AgentStore] Skipping usage logging for guest agent - Mode: ${mode}, Model: ${modelId}`);
            return;
          }

          try {
            const { token } = useUserTokenStore.getState();
            if (!token) {
              console.warn("[AgentStore] No token available for usage logging");
              return;
            }

            // Calculate cost based on response length (simple estimation)
            const estimatedCost = responseLength > 0 ? Math.max(0.1, responseLength / 1000) : 0.5;

            // @ts-ignore
            await window.electron.user.logUsage({
              token,
              data: {
                kind: 'Included in Pro', // You might want to get this from user's plan
                max_mode: false,
                model: modelId,
                cost_requests: estimatedCost,
              }
            });

            console.log(`[AgentStore] Usage logged - Mode: ${mode}, Model: ${modelId}, Cost: ${estimatedCost}`);
          } catch (error: any) {
            console.error('[AgentStore] Failed to log usage:', error);
            // Don't throw error to avoid breaking the main flow
          }
        },

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
                  console.log("Tools available for agent mode:", tools);
                } catch (error) {
                  console.error("Failed to list tools for agent mode:", error);
                }

                result = await processAgentModeAIResponse({
                  activeChatId,
                  workspaceId,
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

            // Log usage for the agent response
            await get().logAgentUsage(
              modelId,
              aiMode,
              result.success,
              result.responseText?.length || 0
            );

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

            // Log failed usage attempt
            await get().logAgentUsage(modelId, aiMode, false, 0);

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

            // ✅ Debug: Let's see what we're getting
            const workspaceId = getCurrentWorkspaceId();
            const selectedContext = useTopicStore.getState().selectedContext;
            
            console.log("[AgentStore DEBUG] sendAgentMessage debugging:");
            console.log("[AgentStore DEBUG] - selectedContext:", selectedContext);
            console.log("[AgentStore DEBUG] - workspaceId from getCurrentWorkspaceId():", workspaceId);
            console.log("[AgentStore DEBUG] - selectedContext?.id:", selectedContext?.id);
            console.log("[AgentStore DEBUG] - mode:", mode);

            // Get existing messages
            const messages = useChatStore.getState().messages[chatId] || [];

            const result = await get().processAgentResponse({
              activeChatId: chatId,
              userMessageText: prompt,
              modelId,
              provider: provider || "openai",
              currentUser,
              existingMessages: messages,
              workspaceId, // ✅ Now properly passed
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

            // Log usage for quick response
            await get().logAgentUsage(modelId, mode, true, prompt.length);

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

            // Log usage for tool summarization
            await get().logAgentUsage(
              params.modelId,
              "agent", // Tool summarization is part of agent mode
              result.success,
              result.responseText?.length || 0
            );

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

            // Log failed usage attempt
            await get().logAgentUsage(params.modelId, "agent", false, 0);

            set({ isProcessingResponse: false, error: error.message });
            return { success: false, error };
          }
        },

        // Updated executeAgentTask method to ensure thread ID consistency
        executeAgentTask: async (task: string, options: any, chatId?: string, workspaceId?: string) => {
          trackRendererIpcCall('agent:execute_task', { 
            task: task?.substring(0, 50) + '...',
            chatId,
            workspaceId 
          });
          
          const taskId = 'current';
          // ✅ Use thread ID from options if provided, otherwise generate one
          const threadId = options.threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log('[AgentStore] Executing Agent Task with LangGraph workflow:', { 
            chatId, 
            workspaceId, 
            threadId,
            humanInTheLoop: options.humanInTheLoop,
            hasThreadIdFromOptions: !!options.threadId
          });
          
          // Set initial state
          set(state => ({
            agentTaskUpdates: { ...state.agentTaskUpdates, [taskId]: [] },
            activeAgentTasks: { ...state.activeAgentTasks, [taskId]: true },
            agentTaskStatus: { ...state.agentTaskStatus, [taskId]: 'initializing' }
          }));

          try {
            // Execute with enhanced human-in-the-loop support
            const result = await window.electron.agent.executeTask({
              task,
              options: {
                ...options,
                chatId,
                workspaceId,
                threadId,
                humanInTheLoop: true,
                workflowType: 'langgraph'
              }
            });

            // Handle LangGraph workflow results
            if (result.workflowState) {
              set(state => ({
                activeLangGraphWorkflows: {
                  ...state.activeLangGraphWorkflows,
                  [threadId]: result.workflowState
                }
              }));
            }

            // Handle human interaction requirements
            if (result.requiresHumanInteraction) {
              console.log('[AgentStore] LangGraph workflow paused for human interaction');
              
              set(state => ({
                agentTaskStatus: { ...state.agentTaskStatus, [taskId]: 'awaiting_human' }
              }));
              
              // The workflow is now paused and waiting for human response
              // UI will handle showing the approval dialog
              return {
                success: true,
                result: 'Workflow paused for human interaction',
                requiresHumanInteraction: true,
                threadId
              };
            }

            // Update final status
            const finalStatus = result.success ? 'completed' : 'failed';
            set(state => ({
              activeAgentTasks: { ...state.activeAgentTasks, [taskId]: false },
              agentTaskStatus: { ...state.agentTaskStatus, [taskId]: finalStatus }
            }));

            return result;
          } catch (error: any) {
            console.error('[AgentStore] Error in LangGraph executeAgentTask:', error);
            
            // Clear workflow state on error
            set(state => {
              const newWorkflows = { ...state.activeLangGraphWorkflows };
              delete newWorkflows[threadId];
              return { activeLangGraphWorkflows: newWorkflows };
            });
            
            return { success: false, error: error.message };
          }
        },

        // New method to resume LangGraph workflows
        resumeLangGraphWorkflow: async (threadId: string, response: HumanInteractionResponse) => {
          try {
            console.log('[AgentStore] Resuming LangGraph workflow:', { threadId, response });
            
            const result = await window.electron.agent.resumeWorkflow({
              threadId,
              response,
              workflowType: 'langgraph'
            });
            
            console.log('[AgentStore] Resume workflow result:', result);
            
            // Return the result object that ToolDisplay expects
            return {
              success: result?.success || false,
              completed: result?.completed || false,
              result: result?.result,
              error: result?.error
            };
            
          } catch (error: any) {
            console.error('[AgentStore] Error resuming LangGraph workflow:', error);
            return {
              success: false,
              completed: false,
              error: error.message
            };
          }
        },

        // Human interaction methods
        handleHumanInteraction: async (interactionId: string, response: HumanInteractionResponse) => {
          console.log('[AgentStore] Handling human interaction:', { interactionId, response });
          
          const callback = get().humanInteractionCallbacks[interactionId];
          if (callback) {
            callback(response);
            
            // Clean up by deleting properties instead of setting to undefined
            set(state => {
              const newCallbacks = { ...state.humanInteractionCallbacks };
              const newInteractions = { ...state.pendingHumanInteractions };
              delete newCallbacks[interactionId];
              delete newInteractions[interactionId];
              
              return {
                humanInteractionCallbacks: newCallbacks,
                pendingHumanInteractions: newInteractions
              };
            });
          }
        },

        getPendingInteractions: (threadId?: string) => {
          const manager = getHumanInTheLoopManager();
          return manager.getPendingInteractions(threadId);
        },

        clearHumanInteractions: (threadId: string) => {
          const manager = getHumanInTheLoopManager();
          manager.clearInteractions(threadId);
          
          // Also clear local state
          set(state => ({
            pendingHumanInteractions: {},
            humanInteractionCallbacks: {}
          }));
        },

        // Agent Task methods - renamed from OSSwarm
        abortAgentTask: async (taskId = 'current') => {
          console.log('[AgentStore] Aborting Agent Task:', taskId);
          
          try {
            // Set aborting status immediately
            set(state => ({
              agentTaskStatus: { ...state.agentTaskStatus, [taskId]: 'aborted' }
            }));

            await window.electron.agent.abortTask({ taskId });
            
            set(state => ({
              activeAgentTasks: { ...state.activeAgentTasks, [taskId]: false },
              agentTaskUpdates: { 
                ...state.agentTaskUpdates, 
                [taskId]: [...(state.agentTaskUpdates[taskId] || []), '[Agent] Task aborted by user'] 
              }
            }));

            // Clear after showing abort message
            setTimeout(() => {
              set(state => ({
                agentTaskUpdates: { ...state.agentTaskUpdates, [taskId]: [] },
                agentTaskStatus: { ...state.agentTaskStatus, [taskId]: 'idle' }
              }));
            }, 3000);

          } catch (error: any) {
            console.error('[AgentStore] Error aborting Agent Task:', error);
            set(state => ({
              agentTaskUpdates: { 
                ...state.agentTaskUpdates, 
                [taskId]: [...(state.agentTaskUpdates[taskId] || []), `[Agent] Abort failed: ${error.message}`] 
              },
              agentTaskStatus: { ...state.agentTaskStatus, [taskId]: 'failed' }
            }));
          }
        },

        clearAgentTaskUpdates: (taskId: string) => {
          set(state => ({
            agentTaskUpdates: { ...state.agentTaskUpdates, [taskId]: [] },
            agentTaskStatus: { ...state.agentTaskStatus, [taskId]: 'idle' }
          }));
        },

        forceStopAgentTask: (taskId: string) => {
          console.log('[AgentStore] Force stopping Agent Task:', taskId);
          
          set(state => ({
            activeAgentTasks: { ...state.activeAgentTasks, [taskId]: false },
            agentTaskStatus: { ...state.agentTaskStatus, [taskId]: 'aborted' },
            agentTaskUpdates: { 
              ...state.agentTaskUpdates, 
              [taskId]: [...(state.agentTaskUpdates[taskId] || []), '[Agent] Task forcefully stopped'] 
            }
          }));

          // Clear after a short delay
          setTimeout(() => {
            set(state => ({
              agentTaskUpdates: { ...state.agentTaskUpdates, [taskId]: [] },
              agentTaskStatus: { ...state.agentTaskStatus, [taskId]: 'idle' }
            }));
          }, 2000);
        },

        setAgentTaskStatus: (taskId: string, status: AgentState['agentTaskStatus'][string]) => {
          set(state => ({
            agentTaskStatus: { ...state.agentTaskStatus, [taskId]: status }
          }));
        },

        processAgentTaskResponse: async (params: AgentResponseParams) => {
          const {
            activeChatId,
            userMessageText,
            modelId,
            provider,
            currentUser,
            existingMessages,
            appendMessage,
            updateMessage,
            setStreamingState,
            markStreamAsCompleted,
          } = params;

          const currentAgent = get().agent;
          if (!currentAgent) {
            console.error("[AgentStore] No agent available for Agent Task processing");
            return { success: false, error: "No agent available" };
          }

          set({ isProcessingResponse: true, error: null });

          try {
            // Use Agent Task instead of single agent
            const { executeAgentTask } = get();

            const agentOptions = {
              model: modelId,
              provider,
              temperature: 0.7,
              apiKeys: {
                openAI: useLLMConfigurationStore.getState().openAIKey,
                deepSeek: useLLMConfigurationStore.getState().deepSeekKey,
                oneasia: useLLMConfigurationStore.getState().oneasiaKey,
              },
              ollamaConfig: {
                baseUrl: useLLMConfigurationStore.getState().ollamaBaseURL,
              },
              tools: [], // Will be populated from MCP
              systemPrompt: "You are coordinating a swarm of AI agents to solve complex tasks efficiently.",
            };

            const result = await executeAgentTask(
              userMessageText,
              agentOptions
            );

            if (result.success && result.result) {
              // Create assistant message
              const assistantMessage: IChatMessage = {
                id: uuidv4(),
                chat_id: activeChatId,
                sender: currentAgent.id || "agent-master",
                sender_object: currentAgent,
                text: result.result,
                created_at: new Date().toISOString(),
                sent_at: new Date().toISOString(),
                status: "completed",
              };

              appendMessage(activeChatId, assistantMessage);

              // Award experience for Agent Task completion
              const earnedXP = Math.floor(result.result.length / 5); // More XP for complex agent tasks
              if (earnedXP > 0) {
                await get().gainExperience(earnedXP);
              }

              set({ isProcessingResponse: false });
              return { success: true, assistantMessageId: assistantMessage.id };
            } else {
              throw new Error(result.error || "Agent task execution failed");
            }

          } catch (error: any) {
            console.error("[AgentStore] Error in Agent Task processing:", error);
            set({ isProcessingResponse: false, error: error.message });
            return { success: false, error };
          }
        },

        clearAgentTaskState: (taskId: string) => {
          console.log('[AgentStore] Clearing agent task state for:', taskId);
          
          set((state) => {
            // ✅ IMPROVED: Completely remove the task entries instead of setting to default values
            const newActiveAgentTasks = { ...state.activeAgentTasks };
            const newAgentTaskStatus = { ...state.agentTaskStatus };
            const newAgentTaskUpdates = { ...state.agentTaskUpdates };
            const newPendingHumanInteractions = { ...state.pendingHumanInteractions };
            const newHumanInteractionCallbacks = { ...state.humanInteractionCallbacks };
            
            // Remove the specific task
            delete newActiveAgentTasks[taskId];
            delete newAgentTaskStatus[taskId];
            delete newAgentTaskUpdates[taskId];
            
            // ✅ NEW: Also clear any related human interactions
            Object.keys(newPendingHumanInteractions).forEach(key => {
              if (key.includes(taskId)) {
                delete newPendingHumanInteractions[key];
              }
            });
            
            Object.keys(newHumanInteractionCallbacks).forEach(key => {
              if (key.includes(taskId)) {
                delete newHumanInteractionCallbacks[key];
              }
            });
            
            return {
              activeAgentTasks: newActiveAgentTasks,
              agentTaskStatus: newAgentTaskStatus,
              agentTaskUpdates: newAgentTaskUpdates,
              pendingHumanInteractions: newPendingHumanInteractions,
              humanInteractionCallbacks: newHumanInteractionCallbacks
            };
          });
        },

        // ✅ NEW: Add a method to clear all agent task state
        clearAllAgentTaskState: () => {
          console.log('[AgentStore] Clearing all agent task state');
          
          set((state) => ({
            activeAgentTasks: {},
            agentTaskStatus: {},
            agentTaskUpdates: {},
            pendingHumanInteractions: {},
            humanInteractionCallbacks: {},
            activeLangGraphWorkflows: {}
          }));
        },
      };
    },
    {
      name: "agent-storage",
      partialize: (state) => ({
        agent: state.agent,
        // Don't persist workflow state or human interactions
      }),
    }
  )
);

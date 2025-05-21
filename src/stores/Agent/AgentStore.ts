import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "@/../../types/User/User"; // Assuming IUser is in this path
import { useUserTokenStore } from "@/stores/User/UserToken"; // For fetching the token
import { toast } from "@/utils/toast"; // For notifications

// Moved from UserStore
const calculateExperienceForLevel = (level: number): number => {
  return 50 * level;
};

interface AgentState {
  agent: IUser | null;
  isLoading: boolean;
  error: string | null;
  setAgent: (agent: IUser | null) => void;
  clearAgent: () => void;
  fetchAgent: (agentId: string, token: string) => Promise<void>;
  gainExperience: (amount: number) => Promise<void>; // New
  levelUp: (addedXP: number) => Promise<void>; // New
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agent: null,
      isLoading: false,
      error: null,
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
        let experienceToReachNext = calculateExperienceForLevel(newLevel === 0 ? 1 : newLevel + 1); // Corrected to next level calc
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
      }
    }),
    {
      name: "agent-storage", // Updated persistence key name
      partialize: (state) => ({
        agent: state.agent, // Only persist the agent object
      }),
    }
  )
);

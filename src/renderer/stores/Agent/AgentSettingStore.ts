import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface SwarmLimits {
  maxIterations: number;
  maxParallelAgents: number;
  maxSwarmSize: number;
  maxActiveSwarms: number;
  maxConversationLength: number;
}

interface AgentSettingsState {
  swarmLimits: SwarmLimits;
  setSwarmLimits: (limits: Partial<SwarmLimits>) => void;
  resetSwarmLimitsToDefaults: () => void;
  updateSwarmLimit: (key: keyof SwarmLimits, value: number) => void;
}

const defaultSwarmLimits: SwarmLimits = {
  maxIterations: 15,
  maxParallelAgents: 8,
  maxSwarmSize: 4,
  maxActiveSwarms: 2,
  maxConversationLength: 50,
};

export const useAgentSettingsStore = create<AgentSettingsState>()(
  persist(
    (set, get) => ({
      swarmLimits: defaultSwarmLimits,
      
      setSwarmLimits: (limits) => set((state) => ({
        swarmLimits: { ...state.swarmLimits, ...limits }
      })),
      
      resetSwarmLimitsToDefaults: () => set({
        swarmLimits: defaultSwarmLimits
      }),
      
      updateSwarmLimit: (key, value) => set((state) => ({
        swarmLimits: { ...state.swarmLimits, [key]: value }
      })),
    }),
    {
      name: "agent-settings-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

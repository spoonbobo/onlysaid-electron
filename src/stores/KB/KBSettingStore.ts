import { create } from "zustand";
import { persist } from "zustand/middleware";

interface KBSettingsState {
  // Query engine settings
  queryEngineLLM: string;

  // Embedding engine settings
  embeddingEngine: string;

  // Actions
  setQueryEngineLLM: (model: string) => void;
  setEmbeddingEngine: (engine: string) => void;
  resetToDefaults: () => void;
  isKBUsable: () => boolean;
}

// Default configuration values
const DEFAULT_CONFIG = {
  queryEngineLLM: "",
  embeddingEngine: "none",
};

export const useKBSettingsStore = create<KBSettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_CONFIG,

      // Actions
      setQueryEngineLLM: (model) => set({ queryEngineLLM: model }),
      setEmbeddingEngine: (engine) => set({ embeddingEngine: engine }),
      resetToDefaults: () => set(DEFAULT_CONFIG),
      isKBUsable: () => {
        const state = get();
        // isKBUsable might need to be re-evaluated based on where contextId-dependent checks are performed.
        // For now, it only checks embeddingEngine.
        return state.embeddingEngine !== "" && state.embeddingEngine !== "none";
      }
    }),
    {
      name: "kb-settings-storage",
    }
  )
);
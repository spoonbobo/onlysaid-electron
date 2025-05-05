import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SelectedLLMState {
  // The provider of the selected LLM model (e.g., "openai", "deepseek", "ollama")
  provider: "openai" | "deepseek" | "ollama" | null;

  // The name/ID of the selected model
  modelId: string | null;

  // Display name of the model
  modelName: string | null;

  // Actions
  setSelectedModel: (provider: "openai" | "deepseek" | "ollama" | null, modelId: string | null, modelName: string | null) => void;
  resetSelection: () => void;
}

// Default values - initialize with null values to avoid errors
const DEFAULT_MODEL = {
  provider: null,
  modelId: null,
  modelName: null,
};

export const useSelectedModelStore = create<SelectedLLMState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_MODEL,

      // Actions
      setSelectedModel: (provider, modelId, modelName) =>
        set({ provider, modelId, modelName }),
      resetSelection: () =>
        set(DEFAULT_MODEL),
    }),
    {
      name: "selected-llm-model-storage",
    }
  )
);
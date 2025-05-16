import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSelectedModelStore } from "./SelectedModelStore";

type AIMode = "none" | "ask" | "query" | "agent";

interface LLMConfigurationState {
  // General settings
  temperature: number;
  trustMode: boolean;
  aiMode: AIMode;

  // Saved model state for when switching back from "none" mode
  savedProvider: "openai" | "deepseek" | "ollama" | null;
  savedModelId: string | null;
  savedModelName: string | null;

  // Public LLM settings
  openAIKey: string;
  deepSeekKey: string;
  openAIEnabled: boolean;
  deepSeekEnabled: boolean;
  openAIVerified: boolean;
  deepSeekVerified: boolean;

  // Private LLM settings
  ollamaBaseURL: string;
  ollamaModel: string;
  ollamaEnabled: boolean;
  ollamaVerified: boolean;

  // Actions
  setTemperature: (value: number) => void;
  setTrustMode: (trustMode: boolean) => void;
  setAIMode: (mode: AIMode) => void;
  setSavedModel: (provider: "openai" | "deepseek" | "ollama" | null, modelId: string | null, modelName: string | null) => void;
  setOpenAIKey: (key: string) => void;
  setDeepSeekKey: (key: string) => void;
  setOpenAIEnabled: (enabled: boolean) => void;
  setDeepSeekEnabled: (enabled: boolean) => void;
  setOpenAIVerified: (verified: boolean) => void;
  setDeepSeekVerified: (verified: boolean) => void;
  setOllamaBaseURL: (url: string) => void;
  setOllamaModel: (model: string) => void;
  setOllamaEnabled: (enabled: boolean) => void;
  setOllamaVerified: (verified: boolean) => void;
  resetToDefaults: () => void;
}

// Default configuration values
const DEFAULT_CONFIG = {
  temperature: 0.7,
  trustMode: false,
  aiMode: "ask" as AIMode,
  savedProvider: null,
  savedModelId: null,
  savedModelName: null,
  openAIKey: "",
  deepSeekKey: "",
  openAIEnabled: true,
  deepSeekEnabled: false,
  openAIVerified: false,
  deepSeekVerified: false,
  ollamaBaseURL: "",
  ollamaModel: "",
  ollamaEnabled: false,
  ollamaVerified: false,
};

export const useLLMConfigurationStore = create<LLMConfigurationState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_CONFIG,

      // Actions
      setTemperature: (value) => set({ temperature: value }),
      setTrustMode: (trustMode) => set({ trustMode }),
      setSavedModel: (provider, modelId, modelName) =>
        set({ savedProvider: provider, savedModelId: modelId, savedModelName: modelName }),
      setAIMode: (aiMode) => {
        // Get the model store - we need to set it outside the zustand store
        const { setSelectedModel, provider, modelId, modelName } = useSelectedModelStore.getState();

        if (aiMode === "none") {
          // Save current model before switching to none
          if (provider !== null && modelId !== null) {
            set({
              aiMode,
              savedProvider: provider,
              savedModelId: modelId,
              savedModelName: modelName,
              // If switching away from agent mode, disable trust mode
              trustMode: false
            });
          } else {
            set({
              aiMode,
              // If switching away from agent mode, disable trust mode
              trustMode: false
            });
          }
          // Set model to none
          setSelectedModel(null, null, "None");
        } else {
          // Get previously saved model state
          const state = useLLMConfigurationStore.getState();

          // Restore the saved model if it exists
          if (state.savedProvider !== null && state.savedModelId !== null) {
            setSelectedModel(state.savedProvider, state.savedModelId, state.savedModelName);
          }

          // Update the AI mode
          set((state) => ({
            aiMode,
            // If switching to agent mode, maintain trust mode, otherwise disable
            trustMode: aiMode === "agent" ? state.trustMode : false
          }));
        }
      },
      setOpenAIKey: (key) => set({ openAIKey: key, openAIVerified: false }),
      setDeepSeekKey: (key) => set({ deepSeekKey: key, deepSeekVerified: false }),
      setOpenAIEnabled: (enabled) => set({ openAIEnabled: enabled }),
      setDeepSeekEnabled: (enabled) => set({ deepSeekEnabled: enabled }),
      setOpenAIVerified: (verified) => set({ openAIVerified: verified }),
      setDeepSeekVerified: (verified) => set({ deepSeekVerified: verified }),
      setOllamaBaseURL: (url) => set({ ollamaBaseURL: url, ollamaVerified: false }),
      setOllamaModel: (model) => set({ ollamaModel: model, ollamaVerified: false }),
      setOllamaEnabled: (enabled) => set({ ollamaEnabled: enabled }),
      setOllamaVerified: (verified) => set({ ollamaVerified: verified }),
      resetToDefaults: () => set(DEFAULT_CONFIG),
    }),
    {
      name: "llm-configuration-storage",
    }
  )
);

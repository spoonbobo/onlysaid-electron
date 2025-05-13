import { create } from "zustand";
import { persist } from "zustand/middleware";

type AIMode = "none" | "ask" | "agent";

interface LLMConfigurationState {
  // General settings
  temperature: number;
  trustMode: boolean;
  aiMode: AIMode;

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
      setAIMode: (aiMode) => set((state) => ({
        aiMode,
        // If switching away from agent mode, disable trust mode
        trustMode: aiMode === "agent" ? state.trustMode : false
      })),
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

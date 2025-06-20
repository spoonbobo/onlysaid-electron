import { create } from "zustand";
import { persist } from "zustand/middleware";

type AIMode = "none" | "ask" | "query" | "agent";

interface Rule {
  id: string;
  content: string;
  modes: AIMode[];
  enabled: boolean;
}

interface LLMConfigurationState {
  // General settings
  temperature: number;
  trustMode: boolean;
  aiMode: AIMode;

  // Current selected model (merged from SelectedModelStore)
  provider: "openai" | "deepseek" | "ollama" | "oneasia" | null;
  modelId: string | null;
  modelName: string | null;

  // Saved model state for when switching back from "none" mode
  savedProvider: "openai" | "deepseek" | "ollama" | "oneasia" | null;
  savedModelId: string | null;
  savedModelName: string | null;

  // Rules for different modes
  rules: Rule[];

  // System prompts for different modes
  askModeSystemPrompt: string;
  queryModeSystemPrompt: string;
  agentModeSystemPrompt: string;

  // Public LLM settings
  openAIKey: string;
  deepSeekKey: string;
  oneasiaKey: string;
  openAIEnabled: boolean;
  deepSeekEnabled: boolean;
  oneasiaEnabled: boolean;
  openAIVerified: boolean;
  deepSeekVerified: boolean;
  oneasiaVerified: boolean;

  // Private LLM settings
  ollamaBaseURL: string;
  ollamaModel: string;
  ollamaEnabled: boolean;
  ollamaVerified: boolean;

  // Actions
  setTemperature: (value: number) => void;
  setTrustMode: (trustMode: boolean) => void;
  setAIMode: (mode: AIMode) => void;
  setSelectedModel: (provider: "openai" | "deepseek" | "ollama" | "oneasia" | null, modelId: string | null, modelName: string | null) => void;
  setSavedModel: (provider: "openai" | "deepseek" | "ollama" | "oneasia" | null, modelId: string | null, modelName: string | null) => void;
  resetSelection: () => void;
  
  // Rules management
  addRule: (content: string, modes: AIMode[]) => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  deleteRule: (id: string) => void;
  toggleRuleEnabled: (id: string) => void;
  getRulesForMode: (mode: AIMode) => Rule[];

  setAskModeSystemPrompt: (prompt: string) => void;
  setQueryModeSystemPrompt: (prompt: string) => void;
  setAgentModeSystemPrompt: (prompt: string) => void;
  setOpenAIKey: (key: string) => void;
  setDeepSeekKey: (key: string) => void;
  setOneasiaKey: (key: string) => void;
  setOpenAIEnabled: (enabled: boolean) => void;
  setDeepSeekEnabled: (enabled: boolean) => void;
  setOneasiaEnabled: (enabled: boolean) => void;
  setOpenAIVerified: (verified: boolean) => void;
  setDeepSeekVerified: (verified: boolean) => void;
  setOneasiaVerified: (verified: boolean) => void;
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
  // Current selected model defaults
  provider: null,
  modelId: null,
  modelName: null,
  // Saved model defaults
  savedProvider: null,
  savedModelId: null,
  savedModelName: null,
  // Rules defaults
  rules: [] as Rule[],
  // System prompt defaults (empty means use built-in defaults)
  askModeSystemPrompt: "",
  queryModeSystemPrompt: "",
  agentModeSystemPrompt: "",
  openAIKey: "",
  deepSeekKey: "",
  oneasiaKey: "",
  openAIEnabled: true,
  deepSeekEnabled: false,
  oneasiaEnabled: false,
  openAIVerified: false,
  deepSeekVerified: false,
  oneasiaVerified: false,
  ollamaBaseURL: "",
  ollamaModel: "",
  ollamaEnabled: false,
  ollamaVerified: false,
};

export const useLLMConfigurationStore = create<LLMConfigurationState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_CONFIG,

      // Actions
      setTemperature: (value) => set({ temperature: value }),
      setTrustMode: (trustMode) => set({ trustMode }),
      setSelectedModel: (provider, modelId, modelName) =>
        set({ provider, modelId, modelName }),
      setSavedModel: (provider, modelId, modelName) =>
        set({ savedProvider: provider, savedModelId: modelId, savedModelName: modelName }),
      resetSelection: () =>
        set({ provider: null, modelId: null, modelName: null }),

      // Rules management
      addRule: (content, modes) => {
        const newRule: Rule = {
          id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          modes,
          enabled: true,
        };
        set(state => ({ rules: [...state.rules, newRule] }));
      },

      updateRule: (id, updates) => {
        set(state => ({
          rules: state.rules.map(rule => 
            rule.id === id ? { ...rule, ...updates } : rule
          )
        }));
      },

      deleteRule: (id) => {
        set(state => ({
          rules: state.rules.filter(rule => rule.id !== id)
        }));
      },

      toggleRuleEnabled: (id) => {
        set(state => ({
          rules: state.rules.map(rule => 
            rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
          )
        }));
      },

      getRulesForMode: (mode) => {
        const state = get();
        return state.rules.filter(rule => 
          rule.enabled && rule.modes.includes(mode)
        );
      },

      setAskModeSystemPrompt: (prompt) => set({ askModeSystemPrompt: prompt }),
      setQueryModeSystemPrompt: (prompt) => set({ queryModeSystemPrompt: prompt }),
      setAgentModeSystemPrompt: (prompt) => set({ agentModeSystemPrompt: prompt }),
      setAIMode: (aiMode) => {
        const state = get();

        if (aiMode === "none") {
          // Save current model before switching to none
          if (state.provider !== null && state.modelId !== null) {
            set({
              aiMode,
              savedProvider: state.provider,
              savedModelId: state.modelId,
              savedModelName: state.modelName,
              // Set model to none
              provider: null,
              modelId: null,
              modelName: "None",
              // If switching away from agent mode, disable trust mode
              trustMode: false
            });
          } else {
            set({
              aiMode,
              provider: null,
              modelId: null,
              modelName: "None",
              // If switching away from agent mode, disable trust mode
              trustMode: false
            });
          }
        } else {
          // Restore the saved model if it exists
          if (state.savedProvider !== null && state.savedModelId !== null) {
            set({
              aiMode,
              provider: state.savedProvider,
              modelId: state.savedModelId,
              modelName: state.savedModelName,
              // If switching to agent mode, maintain trust mode, otherwise disable
              trustMode: aiMode === "agent" ? state.trustMode : false
            });
          } else {
            set({
              aiMode,
              // If switching to agent mode, maintain trust mode, otherwise disable
              trustMode: aiMode === "agent" ? state.trustMode : false
            });
          }
        }
      },
      setOpenAIKey: (key) => set({ openAIKey: key, openAIVerified: false }),
      setDeepSeekKey: (key) => set({ deepSeekKey: key, deepSeekVerified: false }),
      setOneasiaKey: (key) => set({ oneasiaKey: key, oneasiaVerified: false }),
      setOpenAIEnabled: (enabled) => set({ openAIEnabled: enabled }),
      setDeepSeekEnabled: (enabled) => set({ deepSeekEnabled: enabled }),
      setOneasiaEnabled: (enabled) => set({ oneasiaEnabled: enabled }),
      setOpenAIVerified: (verified) => set({ openAIVerified: verified }),
      setDeepSeekVerified: (verified) => set({ deepSeekVerified: verified }),
      setOneasiaVerified: (verified) => set({ oneasiaVerified: verified }),
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

// Export the store as the selected model store as well for backward compatibility
export const useSelectedModelStore = useLLMConfigurationStore;

// Export the Rule type for use in other components
export type { Rule, AIMode };

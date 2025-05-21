import { create } from "zustand";
import { persist } from "zustand/middleware";

interface KBSettingsState {
  // Query engine settings
  queryEngineLLM: string;

  // Embedding engine settings
  embeddingEngine: string;

  // Currently selected KBs for chat
  selectedKbIds: string[];

  // Actions
  setQueryEngineLLM: (model: string) => void;
  setEmbeddingEngine: (engine: string) => void;
  resetToDefaults: () => void;
  isKBUsable: () => boolean;
  // Actions for multi-select
  setSelectedKBs: (kbIds: string[]) => void;
  addSelectedKB: (kbId: string) => void;
  removeSelectedKB: (kbId: string) => void;
  clearSelectedKBs: () => void;
}

// Default configuration values
const DEFAULT_CONFIG = {
  queryEngineLLM: "",
  embeddingEngine: "none",
  selectedKbIds: [],
};

export const useKBSettingsStore = create<KBSettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_CONFIG,

      // Actions
      setQueryEngineLLM: (model) => set({ queryEngineLLM: model }),
      setEmbeddingEngine: (engine) => set({ embeddingEngine: engine }),

      setSelectedKBs: (kbIds) => set({ selectedKbIds: kbIds }),
      addSelectedKB: (kbId) => set((state) => ({
        selectedKbIds: state.selectedKbIds.includes(kbId) ? state.selectedKbIds : [...state.selectedKbIds, kbId]
      })),
      removeSelectedKB: (kbId) => set((state) => ({
        selectedKbIds: state.selectedKbIds.filter(id => id !== kbId)
      })),
      clearSelectedKBs: () => set({ selectedKbIds: [] }),

      resetToDefaults: () => {
        set(DEFAULT_CONFIG); // Resets selectedKbIds to []
      },
      isKBUsable: () => {
        const state = get();
        // Ensure KBs are selected for it to be usable in query mode
        return state.embeddingEngine !== "" && state.embeddingEngine !== "none" && state.selectedKbIds.length > 0;
      }
    }),
    {
      name: "kb-settings-storage",
      // Ensure all relevant parts for multi-select are persisted
      partialize: (state) => ({
        queryEngineLLM: state.queryEngineLLM,
        embeddingEngine: state.embeddingEngine,
        selectedKbIds: state.selectedKbIds,
      }),
    }
  )
);
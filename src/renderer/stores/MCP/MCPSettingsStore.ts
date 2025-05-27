import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MCPState {
  // Pagination state
  page: number;
  itemsPerPage: number;
  selectedCategory: string;

  // Smithery API configuration
  smitheryKey: string;
  smitheryVerified: boolean;

  // Selected MCP Server IDs for Agent Mode
  selectedMcpServerIds: string[];

  // Actions
  setPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  setSelectedCategory: (category: string) => void;
  resetPagination: () => void; // Renamed from reset to avoid conflict
  setSmitheryKey: (key: string) => void;
  setSmitheryVerified: (verified: boolean) => void;

  // Actions for Selected MCP Server IDs
  setSelectedMcpServerIds: (ids: string[]) => void;
  addSelectedMcpServerId: (id: string) => void;
  removeSelectedMcpServerId: (id: string) => void;
  clearSelectedMcpServerIds: () => void;
  isMcpServerSelected: (id: string) => boolean;
}

// Default configuration values
const DEFAULT_STATE = {
  // Pagination defaults
  page: 1,
  itemsPerPage: 4,
  selectedCategory: "all",

  // Smithery API defaults
  smitheryKey: "",
  smitheryVerified: false,

  // Selected MCP Server IDs default
  selectedMcpServerIds: [],
};

export const useMCPSettingsStore = create<MCPState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_STATE,

      // Pagination actions
      setPage: (page) => set({ page }),

      setItemsPerPage: (itemsPerPage) => set({
        itemsPerPage,
        page: 1 // Reset to first page when changing items per page
      }),

      setSelectedCategory: (selectedCategory) => set({
        selectedCategory,
        page: 1 // Reset to first page when changing category
      }),

      resetPagination: () => set({
        page: DEFAULT_STATE.page,
        itemsPerPage: DEFAULT_STATE.itemsPerPage,
        selectedCategory: DEFAULT_STATE.selectedCategory
      }),

      // Smithery API actions
      setSmitheryKey: (key) => set({ smitheryKey: key, smitheryVerified: false }),
      setSmitheryVerified: (verified) => set({ smitheryVerified: verified }),

      // Selected MCP Server ID actions
      setSelectedMcpServerIds: (ids) => set({ selectedMcpServerIds: ids }),
      addSelectedMcpServerId: (id) =>
        set((state) => {
          if (!state.selectedMcpServerIds.includes(id)) {
            return { selectedMcpServerIds: [...state.selectedMcpServerIds, id] };
          }
          return state;
        }),
      removeSelectedMcpServerId: (id) =>
        set((state) => ({
          selectedMcpServerIds: state.selectedMcpServerIds.filter(
            (mcpId) => mcpId !== id
          ),
        })),
      clearSelectedMcpServerIds: () => set({ selectedMcpServerIds: DEFAULT_STATE.selectedMcpServerIds }),
      isMcpServerSelected: (id) => get().selectedMcpServerIds.includes(id),
    }),
    {
      name: "mcp-store-storage", // Persistence name
    }
  )
);

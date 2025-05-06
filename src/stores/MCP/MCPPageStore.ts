import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MCPPageState {
    // Pagination state
    page: number;
    itemsPerPage: number;
    selectedCategory: string;

    // Actions
    setPage: (page: number) => void;
    setItemsPerPage: (itemsPerPage: number) => void;
    setSelectedCategory: (category: string) => void;
    reset: () => void;
}

const DEFAULT_STATE = {
    page: 1,
    itemsPerPage: 4,
    selectedCategory: "all"
};

export const useMCPPageStore = create<MCPPageState>()(
    persist(
        (set) => ({
            ...DEFAULT_STATE,

            setPage: (page) => set({ page }),

            setItemsPerPage: (itemsPerPage) => set({
                itemsPerPage,
                page: 1 // Reset to first page when changing items per page
            }),

            setSelectedCategory: (selectedCategory) => set({
                selectedCategory,
                page: 1 // Reset to first page when changing category
            }),

            reset: () => set(DEFAULT_STATE)
        }),
        {
            name: "mcp-page-storage"
        }
    )
);

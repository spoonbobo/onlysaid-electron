import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { useKBSettingsStore } from "@/stores/KB/KBSettingStore";

export interface KnowledgeBase {
    id: string;
    name: string;
    description: string;
    source: string;
    source_link: string;
    create_at: string;
    update_at: string;
    enabled: boolean;
    configured: boolean;
    embedding_engine: string;
    query_engine: string;

    size?: number;
    documents?: number;
    type: "public" | "private";
}

interface KBConfigurationState {
    databases: KnowledgeBase[];
    page: number;
    itemsPerPage: number;
    searchTerm: string;

    addDatabase: (db: Omit<KnowledgeBase, "id" | "create_at" | "update_at" | "enabled" | "configured" | "size" | "documents">) => void;
    removeDatabase: (id: string) => void;
    updateDatabase: (id: string, data: Partial<KnowledgeBase>) => void;
    toggleDatabaseStatus: (id: string, enabled: boolean) => void;
    setConfigurationStatus: (id: string, configured: boolean) => void;
    reinitializeDatabase: (id: string) => void;
    setPage: (page: number) => void;
    setItemsPerPage: (itemsPerPage: number) => void;
    setSearchTerm: (term: string) => void;
    reset: () => void;
}

const DEFAULT_STATE = {
    databases: [],
    page: 1,
    itemsPerPage: 4,
    searchTerm: ""
};

export const useKBConfigurationStore = create<KBConfigurationState>()(
    persist(
        (set) => ({
            ...DEFAULT_STATE,

            addDatabase: (db) => {
                const { queryEngineLLM } = useKBSettingsStore.getState();

                if (!db.embedding_engine || db.embedding_engine === "none") {
                    console.error("Cannot create KB: A valid embedding engine must be provided.");
                    return;
                }

                set((state) => ({
                    databases: [...state.databases, {
                        ...db,
                        id: uuidv4(),
                        create_at: new Date().toISOString(),
                        update_at: new Date().toISOString(),
                        enabled: false,
                        configured: false,
                        query_engine: db.query_engine || queryEngineLLM || "",
                    }]
                }));
            },

            removeDatabase: (id) => set((state) => ({
                databases: state.databases.filter(db => db.id !== id)
            })),

            updateDatabase: (id, data) => set((state) => ({
                databases: state.databases.map(db =>
                    db.id === id ? { ...db, ...data, update_at: new Date().toISOString() } : db
                )
            })),

            toggleDatabaseStatus: (id, enabled) => set((state) => ({
                databases: state.databases.map(db =>
                    db.id === id ? { ...db, enabled, update_at: new Date().toISOString() } : db
                )
            })),

            setConfigurationStatus: (id, configured) => set((state) => ({
                databases: state.databases.map(db =>
                    db.id === id ? { ...db, configured, update_at: new Date().toISOString() } : db
                )
            })),

            reinitializeDatabase: (id) => set((state) => {
                const isConfigured = Math.random() > 0.2;

                return {
                    databases: state.databases.map(db =>
                        db.id === id ? {
                            ...db,
                            configured: isConfigured,
                            size: isConfigured ? Math.floor(Math.random() * 1000) : undefined,
                            documents: isConfigured ? Math.floor(Math.random() * 100) : undefined,
                            update_at: new Date().toISOString()
                        } : db
                    )
                };
            }),

            setPage: (page) => set({ page }),

            setItemsPerPage: (itemsPerPage) => set({
                itemsPerPage,
                page: 1
            }),

            setSearchTerm: (searchTerm) => set({
                searchTerm,
                page: 1
            }),

            reset: () => set(DEFAULT_STATE)
        }),
        {
            name: "kb-configuration-storage"
        }
    )
);

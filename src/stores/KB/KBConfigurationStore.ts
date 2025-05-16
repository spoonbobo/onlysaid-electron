import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { useKBSettingsStore } from "@/stores/KB/KBSettingStore";
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";

interface KBConfigurationState {
  knowledge_bases: IKnowledgeBase[];
  page: number;
  itemsPerPage: number;
  searchTerm: string;

  addDatabase: (db: Omit<IKnowledgeBase, "id" | "create_at" | "update_at" | "enabled" | "configured" | "size" | "documents">) => void;
  removeDatabase: (id: string) => void;
  updateDatabase: (id: string, data: Partial<IKnowledgeBase>) => void;
  toggleDatabaseStatus: (id: string, enabled: boolean) => void;
  setConfigurationStatus: (id: string, configured: boolean) => void;
  reinitializeDatabase: (id: string) => void;
  setPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  knowledge_bases: [],
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
          knowledge_bases: [...state.knowledge_bases, {
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
        knowledge_bases: state.knowledge_bases.filter(db => db.id !== id)
      })),

      updateDatabase: (id, data) => set((state) => ({
        knowledge_bases: state.knowledge_bases.map(db =>
          db.id === id ? { ...db, ...data, update_at: new Date().toISOString() } : db
        )
      })),

      toggleDatabaseStatus: (id, enabled) => set((state) => ({
        knowledge_bases: state.knowledge_bases.map(db =>
          db.id === id ? { ...db, enabled, update_at: new Date().toISOString() } : db
        )
      })),

      setConfigurationStatus: (id, configured) => set((state) => ({
        knowledge_bases: state.knowledge_bases.map(db =>
          db.id === id ? { ...db, configured, update_at: new Date().toISOString() } : db
        )
      })),

      reinitializeDatabase: (id) => set((state) => {
        const isConfigured = Math.random() > 0.2;

        return {
          knowledge_bases: state.knowledge_bases.map(db =>
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

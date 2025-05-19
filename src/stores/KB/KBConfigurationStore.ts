import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { useKBSettingsStore } from "@/stores/KB/KBSettingStore";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { IKnowledgeBase } from "@/../../types/KnowledgeBase/KnowledgeBase";
import { TopicContext } from "@/stores/Topic/TopicStore";

const getContextIdString = (selectedContext: TopicContext | null): string | undefined => {
  if (!selectedContext) return undefined;
  return selectedContext.type === "workspace" && selectedContext.id
    ? `${selectedContext.id}:workspace`
    : selectedContext.id ? `${selectedContext.id}:${selectedContext.type}` // if id is present
      : `${selectedContext.name}:${selectedContext.type}`; // fallback if id is not present (e.g. for predefined contexts)
};

interface KBConfigurationState {
  knowledge_bases: Record<string, IKnowledgeBase[]>;
  page: number;
  itemsPerPage: number;
  searchTerm: string;
  isCreateKBDialogOpen: boolean;

  addDatabase: (db: Omit<IKnowledgeBase, "id" | "create_at" | "update_at" | "enabled" | "configured" | "size" | "documents" | "context_id"> & { context_id?: string }) => void;
  removeDatabase: (id: string) => void;
  updateDatabase: (id: string, data: Partial<IKnowledgeBase>) => void;
  toggleDatabaseStatus: (id: string, enabled: boolean) => void;
  setConfigurationStatus: (id: string, configured: boolean) => void;
  reinitializeDatabase: (id: string) => void;
  setPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  setSearchTerm: (term: string) => void;
  getContextKnowledgeBases: () => IKnowledgeBase[];
  reset: () => void;
  openCreateKBDialog: () => void;
  closeCreateKBDialog: () => void;
}

const DEFAULT_STATE = {
  knowledge_bases: {},
  page: 1,
  itemsPerPage: 4,
  searchTerm: "",
  isCreateKBDialogOpen: false,
};

export const useKBConfigurationStore = create<KBConfigurationState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      addDatabase: (db) => {
        const { queryEngineLLM } = useKBSettingsStore.getState();
        const { selectedContext } = useTopicStore.getState();
        const contextId = getContextIdString(selectedContext);

        if (!db.embedding_engine || db.embedding_engine === "none") {
          console.error("Cannot create KB: A valid embedding engine must be provided.");
          return;
        }
        if (!contextId) {
          console.error("Cannot create KB: contextId is missing from TopicStore.");
          return;
        }

        set((state) => {
          const currentContextKBs = state.knowledge_bases[contextId] || [];
          const newKB: IKnowledgeBase = {
            ...db,
            id: uuidv4(),
            create_at: new Date().toISOString(),
            update_at: new Date().toISOString(),
            enabled: false,
            configured: false,
            workspace_id: contextId
          };
          return {
            knowledge_bases: {
              ...state.knowledge_bases,
              [contextId]: [...currentContextKBs, newKB]
            }
          };
        });
      },

      removeDatabase: (id) => {
        const { selectedContext } = useTopicStore.getState();
        const contextId = getContextIdString(selectedContext);
        if (!contextId) return;

        set((state) => {
          const currentContextKBs = state.knowledge_bases[contextId] || [];
          return {
            knowledge_bases: {
              ...state.knowledge_bases,
              [contextId]: currentContextKBs.filter(db => db.id !== id)
            }
          };
        });
      },

      updateDatabase: (id, data) => {
        const { selectedContext } = useTopicStore.getState();
        const contextId = getContextIdString(selectedContext);
        if (!contextId) return;

        set((state) => {
          const currentContextKBs = state.knowledge_bases[contextId] || [];
          return {
            knowledge_bases: {
              ...state.knowledge_bases,
              [contextId]: currentContextKBs.map(db =>
                db.id === id ? { ...db, ...data, update_at: new Date().toISOString() } : db
              )
            }
          };
        });
      },

      toggleDatabaseStatus: (id, enabled) => {
        const { selectedContext } = useTopicStore.getState();
        const contextId = getContextIdString(selectedContext);
        if (!contextId) return;

        set((state) => {
          const currentContextKBs = state.knowledge_bases[contextId] || [];
          return {
            knowledge_bases: {
              ...state.knowledge_bases,
              [contextId]: currentContextKBs.map(db =>
                db.id === id ? { ...db, enabled, update_at: new Date().toISOString() } : db
              )
            }
          };
        });
      },

      setConfigurationStatus: (id, configured) => {
        const { selectedContext } = useTopicStore.getState();
        const contextId = getContextIdString(selectedContext);
        if (!contextId) return;
        set((state) => {
          const currentContextKBs = state.knowledge_bases[contextId] || [];
          return {
            knowledge_bases: {
              ...state.knowledge_bases,
              [contextId]: currentContextKBs.map(db =>
                db.id === id ? { ...db, configured, update_at: new Date().toISOString() } : db
              )
            }
          };
        });
      },

      reinitializeDatabase: (id) => {
        const { selectedContext } = useTopicStore.getState();
        const contextId = getContextIdString(selectedContext);
        if (!contextId) return;

        set((state) => {
          const isConfigured = Math.random() > 0.2;
          const currentContextKBs = state.knowledge_bases[contextId] || [];
          return {
            knowledge_bases: {
              ...state.knowledge_bases,
              [contextId]: currentContextKBs.map(db =>
                db.id === id ? {
                  ...db,
                  configured: isConfigured,
                  size: isConfigured ? Math.floor(Math.random() * 1000) : undefined,
                  documents: isConfigured ? Math.floor(Math.random() * 100) : undefined,
                  update_at: new Date().toISOString()
                } : db
              )
            }
          };
        });
      },

      setPage: (page) => set({ page }),

      setItemsPerPage: (itemsPerPage) => set({
        itemsPerPage,
        page: 1
      }),

      setSearchTerm: (searchTerm) => set({
        searchTerm,
        page: 1
      }),

      getContextKnowledgeBases: () => {
        const { selectedContext } = useTopicStore.getState();
        const contextId = getContextIdString(selectedContext);
        if (!contextId) return [];
        return get().knowledge_bases[contextId] || [];
      },

      reset: () => set(DEFAULT_STATE),

      openCreateKBDialog: () => set({ isCreateKBDialogOpen: true }),
      closeCreateKBDialog: () => set({ isCreateKBDialogOpen: false }),
    }),
    {
      name: "kb-configuration-storage"
    }
  )
);

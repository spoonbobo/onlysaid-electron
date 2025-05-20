import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IKnowledgeBase, IKnowledgeBaseRegisterArgs, IKBRegisterIPCArgs, IKBGetStatusIPCArgs, IKBSynchronizeIPCArgs, IKBFullUpdateIPCArgs } from '@/../../types/KnowledgeBase/KnowledgeBase';
import { getUserTokenFromStore } from '@/utils/user';

export interface ProcessedKBDocument {
  id: string;
  filePath: string; // Path relative to workspace root
  title: string;
  originalUrl?: string; // Store original URL for reference
}

interface KBState {
  isLoading: boolean;
  error: string | null;
  kbsLastUpdated: number;
  isCreateKBDialogOpen: boolean;
  processedKbDocuments: Record<string, Record<string, ProcessedKBDocument[]>>; // workspaceId -> kbId -> docs[]

  // onlysaid-app
  getKnowledgeBaseById: (workspaceId: string, kbId: string) => Promise<IKnowledgeBase | undefined>;
  createKnowledgeBase: (kbCreationArgs: IKnowledgeBaseRegisterArgs) => Promise<IKnowledgeBase | undefined>;
  updateKnowledgeBase: (workspaceId: string, kbId: string, updates: Partial<Omit<IKnowledgeBase, 'id' | 'workspace_id'>>) => Promise<IKnowledgeBase | undefined>;
  deleteKnowledgeBase: (workspaceId: string, kbId: string) => Promise<boolean>;
  getKnowledgeBaseDetailsList: (workspaceId?: string) => Promise<IKnowledgeBase[] | undefined>;

  // onlysaid-kb
  viewKnowledgeBaseStructure: (workspaceId: string, kbId?: string) => Promise<{
    dataSources: any[];
    folderStructures: Record<string, any>;
    documents: Record<string, any>;
  } | undefined>;

  // New actions
  registerKB: (args: IKBRegisterIPCArgs) => Promise<IKnowledgeBase | undefined>;
  getKBStatus: (args: IKBGetStatusIPCArgs) => Promise<{ kbId: string; status: string; lastChecked: string;[key: string]: any } | undefined>;
  synchronizeKB: (args: IKBSynchronizeIPCArgs) => Promise<{ kbId: string; syncStatus: string; lastSynced: string;[key: string]: any } | undefined>;
  fullUpdateKB: (args: IKBFullUpdateIPCArgs) => Promise<IKnowledgeBase | undefined>;

  openCreateKBDialog: () => void;
  closeCreateKBDialog: () => void;
}

interface CreateKBIPCArgs {
  workspaceId: string;
  kbData: IKnowledgeBaseRegisterArgs;
  token: string;
}

export const useKBStore = create<KBState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      error: null,
      kbsLastUpdated: 0,
      isCreateKBDialogOpen: false,
      processedKbDocuments: {},

      getKnowledgeBaseDetailsList: async (workspaceId?: string) => {
        set({ isLoading: true, error: null });
        if (!workspaceId) {
          const errMsg = "Workspace ID is required to fetch knowledge base list.";
          console.error(errMsg);
          set({ error: errMsg, isLoading: false });
          return undefined;
        }

        const token = getUserTokenFromStore();
        if (!token) {
          const errMsg = "Authentication token is missing. Cannot fetch knowledge base list.";
          console.error(errMsg);
          set({ error: errMsg, isLoading: false });
          return undefined;
        }

        try {
          const ipcArgs = { workspaceId, token };
          const rawResponse = await window.electron.knowledgeBase.list(ipcArgs);
          // console.log("rawResponse for getKnowledgeBaseDetailsList", rawResponse);
          const kbs: IKnowledgeBase[] = Array.isArray(rawResponse) ? rawResponse : [];
          set({ isLoading: false });
          return kbs;
        } catch (err: any) {
          console.error("Error getting knowledge base list in store:", err);
          set({ error: err.message || 'Failed to get knowledge base list', isLoading: false });
          return undefined;
        }
      },

      getKnowledgeBaseById: async (workspaceId: string, kbId: string) => {
        console.log("getKnowledgeBaseById", workspaceId, kbId);
        set({ isLoading: true, error: null });

        const token = getUserTokenFromStore();
        if (!token) {
          const errMsg = "Authentication token is missing. Cannot fetch knowledge base.";
          console.error(errMsg);
          set({ error: errMsg, isLoading: false });
          return undefined;
        }

        try {
          const ipcArgs = {
            workspaceId,
            kbId,
            token
          };

          const kb: IKnowledgeBase = await window.electron.knowledgeBase.get(ipcArgs);

          set({ isLoading: false });

          return kb;
        } catch (err: any) {
          console.error(`Error fetching knowledge base ${kbId}:`, err);
          set({ error: err.message || `Failed to fetch knowledge base ${kbId}`, isLoading: false });
          return undefined;
        }
      },

      createKnowledgeBase: async (kbCreationArgs: IKnowledgeBaseRegisterArgs): Promise<IKnowledgeBase | undefined> => {
        set({ isLoading: true, error: null });
        const { workspace_id } = kbCreationArgs;

        if (!workspace_id) {
          const errMsg = "Workspace ID is missing in knowledge base creation arguments.";
          console.error(errMsg);
          set({ error: errMsg, isLoading: false });
          return undefined;
        }

        const token = getUserTokenFromStore();

        if (!token) {
          const errMsg = "Authentication token is missing. Cannot create knowledge base.";
          console.error(errMsg);
          set({ error: errMsg, isLoading: false });
          return undefined;
        }

        const ipcArgs: CreateKBIPCArgs = {
          workspaceId: workspace_id,
          kbData: kbCreationArgs,
          token: token,
        };

        try {
          const newKb: IKnowledgeBase = await window.electron.knowledgeBase.create(ipcArgs);

          set({ isLoading: false, kbsLastUpdated: Date.now() });
          return newKb;
        } catch (err: any) {
          console.error("Error creating knowledge base via IPC:", err);
          const errorMessage = err.message || 'Failed to create knowledge base';
          set({ error: errorMessage, isLoading: false });
          return undefined;
        }
      },

      updateKnowledgeBase: async (workspaceId: string, kbId: string, updates: Partial<Omit<IKnowledgeBase, 'id' | 'workspace_id'>>) => {
        set({ isLoading: true, error: null });

        const token = getUserTokenFromStore();
        if (!token) {
          const errMsg = "Authentication token is missing. Cannot update knowledge base.";
          console.error(errMsg);
          set({ error: errMsg, isLoading: false });
          return undefined;
        }

        try {
          const ipcArgs = {
            workspaceId,
            kbId,
            kbUpdateData: updates,
            token
          };
          const updatedKb: IKnowledgeBase = await window.electron.knowledgeBase.update(ipcArgs);
          set({ isLoading: false, kbsLastUpdated: Date.now() });
          return updatedKb;

        } catch (err: any) {
          console.error(`Error updating knowledge base ${kbId}:`, err);
          set({ error: err.message || 'Failed to update knowledge base', isLoading: false });
          return undefined;
        }
      },

      deleteKnowledgeBase: async (workspaceId: string, kbId: string) => {
        set({ isLoading: true, error: null });

        const token = getUserTokenFromStore();
        if (!token) {
          const errMsg = "Authentication token is missing. Cannot delete knowledge base.";
          console.error(errMsg);
          set({ error: errMsg, isLoading: false });
          return false;
        }

        try {
          const ipcArgs = { workspaceId, kbId, token };
          const result: { success: boolean } = await window.electron.knowledgeBase.delete(ipcArgs);
          if (result.success) {
            set(state => {
              const newProcessedDocs = { ...state.processedKbDocuments };
              if (newProcessedDocs[workspaceId]) {
                delete newProcessedDocs[workspaceId][kbId]; // Remove the specific KB's documents
                if (Object.keys(newProcessedDocs[workspaceId]).length === 0) {
                  delete newProcessedDocs[workspaceId]; // Remove workspace entry if no KBs left
                }
              }
              return {
                isLoading: false,
                kbsLastUpdated: Date.now(),
                processedKbDocuments: newProcessedDocs,
              };
            });
          } else {
            set({ isLoading: false });
          }
          return result.success;
        } catch (err: any) {
          console.error(`Error deleting knowledge base ${kbId}:`, err);
          set({ error: err.message || 'Failed to delete knowledge base', isLoading: false });
          return false;
        }
      },

      viewKnowledgeBaseStructure: async (workspaceId: string, kbId?: string) => {
        set({ isLoading: true, error: null });

        if (!workspaceId) {
          const errMsg = "Workspace ID is required to view knowledge base structure.";
          console.error(errMsg);
          set({ error: errMsg, isLoading: false });
          return undefined;
        }

        try {
          const ipcArgs = { workspaceId, kbId };
          const response = await window.electron.knowledgeBase.view(ipcArgs);

          if (response && response.documents) {
            set(state => {
              const updatedWorkspaceKbs = { ...(state.processedKbDocuments[workspaceId] || {}) };

              for (const [docKbId, docsArray] of Object.entries(response.documents)) {
                if (Array.isArray(docsArray)) {
                  updatedWorkspaceKbs[docKbId] = docsArray.map((doc: any) => {
                    const urlParts = doc.url?.match(/^file:\/\/\/storage\/[^/]+\/(.+)$/);
                    const filePath = urlParts && urlParts[1] ? urlParts[1] : '';
                    return {
                      id: doc.id,
                      filePath: filePath,
                      title: doc.title,
                      originalUrl: doc.url,
                    };
                  }).filter((doc: ProcessedKBDocument) => !!doc.filePath);
                }
              }
              // If we viewed a specific KB, only that KB's doc list is in response.documents.
              // If we viewed all KBs for a workspace (kbId was undefined),
              // we should ensure KBs not present in response.documents are removed from processedKbDocuments[workspaceId].
              if (!kbId) { // Viewing all KBs for the workspace
                Object.keys(updatedWorkspaceKbs).forEach(existingKbId => {
                  if (!response.documents[existingKbId]) {
                    delete updatedWorkspaceKbs[existingKbId];
                  }
                });
              }

              return {
                isLoading: false,
                processedKbDocuments: {
                  ...state.processedKbDocuments,
                  [workspaceId]: updatedWorkspaceKbs,
                }
              };
            });
          } else {
            // If no documents are returned, and we requested a specific KB, clear its entries.
            // If we requested all KBs for a workspace and no documents are returned, clear all for that workspace.
            if (kbId) {
              set(state => {
                const newProcessedDocs = { ...state.processedKbDocuments };
                if (newProcessedDocs[workspaceId]) {
                  delete newProcessedDocs[workspaceId][kbId];
                  if (Object.keys(newProcessedDocs[workspaceId]).length === 0) {
                    delete newProcessedDocs[workspaceId];
                  }
                }
                return { isLoading: false, processedKbDocuments: newProcessedDocs };
              });
            } else if (workspaceId && !kbId) { // all KBs for workspace
              set(state => {
                const newProcessedDocs = { ...state.processedKbDocuments };
                delete newProcessedDocs[workspaceId];
                return { isLoading: false, processedKbDocuments: newProcessedDocs };
              });
            } else {
              set({ isLoading: false });
            }
          }
          return response;
        } catch (err: any) {
          console.error("Error viewing knowledge base structure:", err);
          set({ error: err.message || 'Failed to view knowledge base structure', isLoading: false });
          return undefined;
        }
      },

      openCreateKBDialog: () => set({ isCreateKBDialogOpen: true }),
      closeCreateKBDialog: () => set({ isCreateKBDialogOpen: false }),

      registerKB: async (args: IKBRegisterIPCArgs) => {
        try {
          set({ isLoading: true, error: null });
          const result = await window.electron.knowledgeBase.registerKB(args);
          set({ isLoading: false });
          return result;
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          return undefined;
        }
      },

      getKBStatus: async (args: IKBGetStatusIPCArgs) => {
        try {
          set({ isLoading: true, error: null });
          const result = await window.electron.knowledgeBase.getKBStatus(args);
          set({ isLoading: false });
          return result;
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          return undefined;
        }
      },

      synchronizeKB: async (args: IKBSynchronizeIPCArgs) => {
        try {
          set({ isLoading: true, error: null });
          const result = await window.electron.knowledgeBase.synchronizeKB(args);
          set({ isLoading: false });
          return result;
        } catch (err: any) {
          set({ isLoading: false, error: err.message });
          return undefined;
        }
      },

      fullUpdateKB: async (args: IKBFullUpdateIPCArgs) => {
        set({ isLoading: true, error: null });
        // Token is expected to be part of args.token directly by the IPC handler definition
        if (!args.token) {
          const errMsg = "Authentication token is missing in arguments. Cannot perform full update on knowledge base.";
          console.error(errMsg);
          set({ error: errMsg, isLoading: false });
          return undefined;
        }

        try {
          const updatedKb: IKnowledgeBase | undefined = await window.electron.knowledgeBase.fullUpdateKB(args);
          set({ isLoading: false, kbsLastUpdated: Date.now() });
          return updatedKb;
        } catch (err: any) {
          console.error(`Error performing full update on knowledge base ${args.kbId}:`, err);
          set({ error: err.message || 'Failed to perform full update on knowledge base', isLoading: false });
          return undefined;
        }
      },
    }),
    {
      name: 'kb-store-persistence',
      partialize: (state) => ({
        processedKbDocuments: state.processedKbDocuments,
      }),
    }
  )
);
import { create } from 'zustand';
import { IKnowledgeBase, IKnowledgeBaseRegisterArgs } from '@/../../types/KnowledgeBase/KnowledgeBase';
import { getUserTokenFromStore } from '@/utils/user';
// TODO: Verify and adjust the import for your authentication store
// For example: import { useAuthStore } from '@/stores/AuthStore';

// Helper to extract workspaceId from context_id (e.g., "some-uuid:workspace" -> "some-uuid")
const getWorkspaceIdFromContext = (contextId: string | undefined): string | undefined => {
  return contextId?.split(':')[0];
};

interface KBState {
  // knowledgeBases: IKnowledgeBase[]; // Removed
  isLoading: boolean;
  error: string | null;
  getKnowledgeBaseById: (workspaceId: string, kbId: string) => Promise<IKnowledgeBase | undefined>;
  createKnowledgeBase: (kbCreationArgs: IKnowledgeBaseRegisterArgs) => Promise<IKnowledgeBase | undefined>;
  updateKnowledgeBase: (workspaceId: string, kbId: string, updates: Partial<Omit<IKnowledgeBase, 'id' | 'workspace_id'>>) => Promise<IKnowledgeBase | undefined>;
  deleteKnowledgeBase: (workspaceId: string, kbId: string) => Promise<boolean>;

  getKnowledgeBaseDetailsList: (workspaceId?: string) => Promise<IKnowledgeBase[] | undefined>;

}

// This interface should match the structure expected by your 'kb:create' IPC handler (IKBCreateArgs)
interface CreateKBIPCArgs {
  workspaceId: string;
  kbData: IKnowledgeBaseRegisterArgs; // This should be the full registration arguments
  token: string;
}

export const useKBStore = create<KBState>((set, get) => ({
  // knowledgeBases: [], // Removed
  isLoading: false,
  error: null,

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
      console.log("rawResponse for getKnowledgeBaseDetailsList", rawResponse);
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

    // If not found locally, fetch from server
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

      // Update local store with the fetched KB - REMOVED
      // set(state => ({
      //   knowledgeBases: [...state.knowledgeBases.filter(k => k.id !== kbId), kb],
      //   isLoading: false
      // }));
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

      // set(state => ({ // REMOVED
      //   knowledgeBases: [...state.knowledgeBases, newKb], // REMOVED
      //   isLoading: false, // REMOVED
      // })); // REMOVED
      set({ isLoading: false });
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

    // const existingKb = get().knowledgeBases.find(kb => kb.id === kbId); // REMOVED
    // if (!existingKb) { // REMOVED
    //   const errMsg = `Knowledge base with ID ${kbId} not found for update.`; // REMOVED
    //   set({ error: errMsg, isLoading: false }); // REMOVED
    //   return undefined; // REMOVED
    // } // REMOVED
    // const workspaceIdFromContext = getWorkspaceIdFromContext(existingKb.workspace_id); // REMOVED
    // if (!workspaceIdFromContext) { // This check might be redundant if workspaceId is passed directly
    //   const errMsg = `Workspace ID could not be derived from context_id for updating KB ${kbId}.`; // REMOVED
    //   console.error(errMsg); // REMOVED
    //   set({ error: errMsg, isLoading: false }); // REMOVED
    //   return undefined; // REMOVED
    // } // REMOVED

    const token = getUserTokenFromStore();
    if (!token) {
      const errMsg = "Authentication token is missing. Cannot update knowledge base.";
      console.error(errMsg);
      set({ error: errMsg, isLoading: false });
      return undefined;
    }

    try {
      // console.log(`[STORE DUMMY] Would call window.electron.knowledgeBase.update(${workspaceId}, ${kbId}, ...) with updates:`, updates);
      // await new Promise(resolve => setTimeout(resolve, 100));
      // let updatedKbInStore: IKnowledgeBase | undefined = undefined;
      // set(state => { // REMOVED
      //   const kbs = state.knowledgeBases.map(kb => { // REMOVED
      //     if (kb.id === kbId) { // REMOVED
      //       updatedKbInStore = { ...kb, ...updates }; // REMOVED
      //       return updatedKbInStore; // REMOVED
      //     } // REMOVED
      //     return kb; // REMOVED
      //   }); // REMOVED
      //   return { knowledgeBases: kbs, isLoading: false }; // REMOVED
      // }); // REMOVED
      // return updatedKbInStore; // REMOVED

      const ipcArgs = {
        workspaceId,
        kbId,
        kbUpdateData: updates,
        token
      };
      const updatedKb: IKnowledgeBase = await window.electron.knowledgeBase.update(ipcArgs);
      set({ isLoading: false });
      return updatedKb;

    } catch (err: any) {
      console.error(`Error updating knowledge base ${kbId}:`, err);
      set({ error: err.message || 'Failed to update knowledge base', isLoading: false });
      return undefined;
    }
  },

  deleteKnowledgeBase: async (workspaceId: string, kbId: string) => {
    set({ isLoading: true, error: null });
    // const existingKb = get().knowledgeBases.find(kb => kb.id === kbId); // REMOVED
    // if (!existingKb) { // REMOVED
    //   const errMsg = `Knowledge base with ID ${kbId} not found for deletion.`; // REMOVED
    //   set({ error: errMsg, isLoading: false }); // REMOVED
    //   return false; // REMOVED
    // } // REMOVED
    // const workspaceIdFromContext = getWorkspaceIdFromContext(existingKb.workspace_id); // REMOVED
    // if (!workspaceIdFromContext) { // This check might be redundant if workspaceId is passed directly
    //   const errMsg = `Workspace ID could not be derived from context_id for deleting KB ${kbId}.`; // REMOVED
    //   console.error(errMsg); // REMOVED
    //   set({ error: errMsg, isLoading: false }); // REMOVED
    //   return false; // REMOVED
    // } // REMOVED

    const token = getUserTokenFromStore();
    if (!token) {
      const errMsg = "Authentication token is missing. Cannot delete knowledge base.";
      console.error(errMsg);
      set({ error: errMsg, isLoading: false });
      return false;
    }

    try {
      // console.log(`[STORE DUMMY] Would call window.electron.knowledgeBase.delete(${workspaceId}, ${kbId})`); // REMOVED
      // await new Promise(resolve => setTimeout(resolve, 100)); // REMOVED
      // set(state => ({ // REMOVED
      //   knowledgeBases: state.knowledgeBases.filter(kb => kb.id !== kbId), // REMOVED
      //   isLoading: false, // REMOVED
      // })); // REMOVED
      // return true; // REMOVED

      const ipcArgs = {
        workspaceId,
        kbId,
        token
      };
      // Assuming the IPC delete handler returns something like { success: true } or throws an error
      // The actual handler returns { success: true, id: kbId, message: ... }
      const result: { success: boolean } = await window.electron.knowledgeBase.delete(ipcArgs);
      set({ isLoading: false });
      return result.success;

    } catch (err: any) {
      console.error(`Error deleting knowledge base ${kbId}:`, err);
      set({ error: err.message || 'Failed to delete knowledge base', isLoading: false });
      return false;
    }
  },
}));

// Example usage (for testing in console or another component):
// const { queryKnowledgeBase, queryResults, isLoading, error } = useKBStore.getState();
// queryKnowledgeBase("What is AI?", "some-kb-id").then(() => {
//   if (!isLoading && !error) {
//     console.log("Query Results:", queryResults);
//   } else if (error) {
//     console.error("Query Error:", error);
//   }
// });
//
// const { getKnowledgeBases, knowledgeBases } = useKBStore.getState();
// getKnowledgeBases().then(() => {
//  console.log(knowledgeBases)
// })

import { create } from 'zustand';
import { IKnowledgeBase, IKnowledgeBaseRegisterArgs } from '@/../../types/KnowledgeBase/KnowledgeBase';
import { getUserTokenFromStore } from '@/utils/user';


interface KBState {
  isLoading: boolean;
  error: string | null;
  kbsLastUpdated: number;
  getKnowledgeBaseById: (workspaceId: string, kbId: string) => Promise<IKnowledgeBase | undefined>;
  createKnowledgeBase: (kbCreationArgs: IKnowledgeBaseRegisterArgs) => Promise<IKnowledgeBase | undefined>;
  updateKnowledgeBase: (workspaceId: string, kbId: string, updates: Partial<Omit<IKnowledgeBase, 'id' | 'workspace_id'>>) => Promise<IKnowledgeBase | undefined>;
  deleteKnowledgeBase: (workspaceId: string, kbId: string) => Promise<boolean>;
  getKnowledgeBaseDetailsList: (workspaceId?: string) => Promise<IKnowledgeBase[] | undefined>;
  viewKnowledgeBaseStructure: (workspaceId: string) => Promise<{
    dataSources: any[];
    folderStructures: Record<string, any>;
    documents: Record<string, any>;
  } | undefined>;
}

interface CreateKBIPCArgs {
  workspaceId: string;
  kbData: IKnowledgeBaseRegisterArgs;
  token: string;
}

export const useKBStore = create<KBState>((set, get) => ({
  isLoading: false,
  error: null,
  kbsLastUpdated: 0,

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
      const ipcArgs = {
        workspaceId,
        kbId,
        token
      };
      const result: { success: boolean } = await window.electron.knowledgeBase.delete(ipcArgs);
      if (result.success) {
        set({ isLoading: false, kbsLastUpdated: Date.now() });
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

  viewKnowledgeBaseStructure: async (workspaceId: string) => {
    set({ isLoading: true, error: null });

    if (!workspaceId) {
      const errMsg = "Workspace ID is required to view knowledge base structure.";
      console.error(errMsg);
      set({ error: errMsg, isLoading: false });
      return undefined;
    }

    try {
      const ipcArgs = { workspaceId };
      const response = await window.electron.knowledgeBase.view(ipcArgs);
      set({ isLoading: false });
      return response;
    } catch (err: any) {
      console.error("Error viewing knowledge base structure:", err);
      set({ error: err.message || 'Failed to view knowledge base structure', isLoading: false });
      return undefined;
    }
  },
}));
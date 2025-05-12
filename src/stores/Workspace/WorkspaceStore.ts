import { create } from "zustand";
import { v4 as uuidv4 } from 'uuid';
import * as R from 'ramda';
import { getUserFromStore, getUserTokenFromStore } from "@/utils/user";
import { IWorkspace, IWorkspaceUser, IWorkspaceWithRole } from "@/../../types/Workspace/Workspace";
import { toast } from "@/utils/toast";

interface WorkspaceCreateData extends Partial<IWorkspace> {
  name: string;
  image: string;
  invite_code: string;
  settings: Record<string, any>;
  users?: string[];
}

interface WorkspaceState {
  workspaces: IWorkspace[];
  isLoading: boolean;
  error: string | null;
  workspaceUsers: IWorkspaceUser[];

  createWorkspace: (data: WorkspaceCreateData) => Promise<IWorkspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  exitWorkspace: (workspaceId: string) => Promise<void>;
  getWorkspaceById: (workspaceId: string) => IWorkspace | undefined;
  getWorkspace: (userId: string) => Promise<void>;
  joinWorkspaceByInviteCode: (inviteCode: string) => Promise<IWorkspace>;

  addUserToWorkspace: (workspaceId: string, userId: string, role: string) => Promise<void>;
  removeUserFromWorkspace: (workspaceId: string, userId: string) => Promise<void>;
  getUsersByWorkspace: (workspaceId: string, role?: string) => Promise<IWorkspaceUser[]>;

  onWorkspaceCreated?: (workspace: IWorkspace) => void;
  setWorkspaceCreatedCallback: (callback: ((workspace: IWorkspace) => void) | undefined) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  workspaces: [],
  isLoading: false,
  error: null,
  workspaceUsers: [],

  createWorkspace: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newWorkspace: IWorkspace = {
        id: uuidv4(),
        name: data.name || 'New Workspace',
        image: data.image || '/workspace-icon.png',
        invite_code: data.invite_code || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: data.settings || {},
      };

      const response = await window.electron.workspace.create({
        token: getUserTokenFromStore(),
        request: newWorkspace
      });

      let createdWorkspace: IWorkspace;
      if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        createdWorkspace = response.data.data[0];
      } else if (response.data) {
        createdWorkspace = response.data;
      } else {
        createdWorkspace = newWorkspace;
      }

      const currentUser = getUserFromStore();
      if (currentUser?.id) {
        const newWorkspaceId = createdWorkspace.id || newWorkspace.id;
        await window.electron.workspace.add_users({
          token: getUserTokenFromStore(),
          workspaceId: newWorkspaceId,
          request: [{
            user_id: currentUser.id,
            role: 'super_admin'
          }]
        });
      }

      set(state => ({
        workspaces: [...state.workspaces, createdWorkspace],
        isLoading: false
      }));

      get().onWorkspaceCreated?.(createdWorkspace);

      return createdWorkspace;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error creating workspace:", error);
      throw error;
    }
  },

  deleteWorkspace: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      set(state => ({
        workspaces: state.workspaces.filter(workspace => workspace.id !== workspaceId),
        isLoading: false
      }));

      toast.success("Workspace deleted successfully");
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message || "Failed to delete workspace");
      console.error("Error deleting workspace:", error);
      throw error;
    }
  },

  getWorkspace: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.get({
        token: getUserTokenFromStore(),
        userId: userId,
      });
      console.log('response', response);

      if (response.data?.data && Array.isArray(response.data.data)) {
        const ws: IWorkspaceWithRole[] = response.data.data;

        set({
          workspaces: ws,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching workspaces:", error);
    }
  },

  exitWorkspace: async (workspaceId) => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = getUserFromStore();
      const userId = currentUser?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const existingWorkspace = get().workspaces.find(w => w.id === workspaceId);

      if (!existingWorkspace) {
        throw new Error("Workspace not found");
      }

      await get().removeUserFromWorkspace(workspaceId, userId);

      set(state => ({
        workspaces: state.workspaces.filter(w => w.id !== workspaceId),
        isLoading: false
      }));

      toast.success(`Exited workspace: ${existingWorkspace.name}`);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error exiting workspace:", error);
      throw error;
    }
  },

  getWorkspaceById: (workspaceId) => {
    return get().workspaces.find(workspace => workspace.id === workspaceId);
  },

  addUserToWorkspace: async (workspaceId, userId, role) => {
    set({ isLoading: true, error: null });
    try {
      // Implementation remains the same
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error adding user to workspace:", error);
      throw error;
    }
  },

  removeUserFromWorkspace: async (workspaceId, userId) => {
    set({ isLoading: true, error: null });
    try {
      await window.electron.workspace.remove_user({
        token: getUserTokenFromStore(),
        workspaceId,
        userId
      });

      set(state => ({
        workspaceUsers: state.workspaceUsers.filter(user => user.workspace_id !== workspaceId || user.user_id !== userId),
        isLoading: false
      }));

      toast.success("User removed from workspace");
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message || "Failed to remove user from workspace");
      console.error("Error removing user from workspace:", error);
      throw error;
    }
  },

  getUsersByWorkspace: async (workspaceId: string, role?: string) => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await window.electron.workspace.get_users({
        token: getUserTokenFromStore(),
        workspaceId,
      });

      if (error) {
        set({ error, isLoading: false });
        return [];
      }

      set({ workspaceUsers: data.data, isLoading: false });

      if (role) {
        return get().workspaceUsers.filter(user => user.role === role);
      }

      return get().workspaceUsers;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return [];
    }
  },

  joinWorkspaceByInviteCode: async (inviteCode) => {
    set({ isLoading: true, error: null });
    try {
      if (!inviteCode || inviteCode.length !== 6) {
        throw new Error("Invalid invite code. Code must be 6 characters.");
      }

      const currentUser = getUserFromStore();
      if (!currentUser?.id) {
        throw new Error("User not authenticated");
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const dummyWorkspace: IWorkspace = {
        id: uuidv4(),
        name: `Workspace ${inviteCode}`,
        image: '/workspace-icon.png',
        invite_code: inviteCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {},
      };

      const workspaceUser: IWorkspaceUser = {
        workspace_id: dummyWorkspace.id,
        user_id: currentUser.id,
        role: 'member',
        created_at: new Date().toISOString()
      };

      set(state => ({
        workspaces: [...state.workspaces, dummyWorkspace],
        workspaceUsers: [...state.workspaceUsers, workspaceUser],
        isLoading: false
      }));

      toast.success(`Joined workspace: ${dummyWorkspace.name}`);
      return dummyWorkspace;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message || "Failed to join workspace");
      console.error("Error joining workspace:", error);
      throw error;
    }
  },

  setWorkspaceCreatedCallback: (callback) => {
    set({ onWorkspaceCreated: callback });
  },
}));
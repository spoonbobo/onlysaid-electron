import { create } from "zustand";
import { v4 as uuidv4 } from 'uuid';
import * as R from 'ramda';
import { getUserFromStore, getUserTokenFromStore } from "@/utils/user";
import { IWorkspace, IWorkspaceUser, IWorkspaceWithRole } from "@/../../types/Workspace/Workspace";
import { toast } from "@/utils/toast";
import { useToastStore } from "../Notification/ToastStore";
import { useKBStore } from "@/stores/KB/KBStore";
import { useFileExplorerStore } from "@/stores/File/FileExplorerStore";

interface WorkspaceCreateData extends Partial<IWorkspace> {
  name: string;
  image: string;
  imageFile?: File | null;
  invite_code: string;
  settings: Record<string, any>;
  users?: string[];
}

type WORKSPACE_ROLE = 'super_admin' | 'admin' | 'member';

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

  addUserToWorkspace: (workspaceId: string, userId: string | undefined, role: string, email?: string) => Promise<void>;
  removeUserFromWorkspace: (workspaceId: string, userId: string) => Promise<void>;
  getUsersByWorkspace: (workspaceId: string, role?: string) => Promise<IWorkspaceUser[]>;

  onWorkspaceCreated?: (workspace: IWorkspace) => void;
  setWorkspaceCreatedCallback: (callback: ((workspace: IWorkspace) => void) | undefined) => void;

  getUserInWorkspace: (workspaceId: string, userId: string) => Promise<IWorkspaceUser | null>;
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
        image: '/workspace-icon.png',
        invite_code: data.invite_code || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: data.settings || {},
      };

      const response = await window.electron.workspace.create({
        token: getUserTokenFromStore() || '',
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

      if (data.imageFile) {
        try {
          const workspaceId = createdWorkspace.id;
          const extension = data.imageFile.name.split('.').pop() || 'png';
          const filename = `logo-${uuidv4().slice(0, 8)}.${extension}`;
          const targetPath = `/storage/${workspaceId}/${filename}`;

          const reader = new FileReader();
          const fileDataPromise = new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(data.imageFile as File);
          });
          const fileData = await fileDataPromise;

          createdWorkspace.image = targetPath;

          await window.electron.workspace.update({
            token: getUserTokenFromStore() || '',
            workspaceId,
            request: { image: targetPath }
          });

          const toastId = useToastStore.getState().addToast(
            "Uploading workspace logo...",
            "info",
            30000
          );

          const { operationId } = await window.electron.fileSystem.uploadFile({
            workspaceId,
            fileData,
            fileName: filename,
            token: getUserTokenFromStore() || '',
            metadata: { type: 'workspace-logo', path: targetPath }
          });

          window.electron.fileSystem.onProgress((data) => {
            if (data.operationId === operationId) {
              useToastStore.getState().updateToastProgress(toastId, data.progress);
              if (data.progress === 100) {
                toast.success("Workspace logo uploaded successfully");
              }
            }
          });
        } catch (uploadError) {
          console.error("Error uploading workspace image:", uploadError);
          toast.error("Failed to upload workspace image, using default");
          createdWorkspace.image = '/workspace-icon.png';
        }
      }

      const currentUser = getUserFromStore();
      if (currentUser?.id) {
        const newWorkspaceId = createdWorkspace.id || newWorkspace.id;
        await window.electron.workspace.add_users({
          token: getUserTokenFromStore() || '',
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

      useKBStore.getState().clearProcessedDocumentsForWorkspace(workspaceId);
      useFileExplorerStore.getState().removeRemoteRootFolderByWorkspaceId(workspaceId);

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
        token: getUserTokenFromStore() || '',
        userId: userId,
      });

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

      useKBStore.getState().clearProcessedDocumentsForWorkspace(workspaceId);
      useFileExplorerStore.getState().removeRemoteRootFolderByWorkspaceId(workspaceId);

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

  addUserToWorkspace: async (workspaceId, userId, role, email?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.add_users({
        token: getUserTokenFromStore() || '',
        workspaceId,
        request: [{
          user_id: userId,
          role: role as WORKSPACE_ROLE,
          email: email
        }]
      });

      if (response.error) {
        throw new Error(response.error);
      }

      await get().getUsersByWorkspace(workspaceId);

      set({ isLoading: false });
      toast.success("User added to workspace successfully");

      return response.data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message || "Failed to add user to workspace");
      console.error("Error adding user to workspace:", error);
    }
  },

  removeUserFromWorkspace: async (workspaceId, userId) => {
    set({ isLoading: true, error: null });
    try {
      await window.electron.workspace.remove_user({
        token: getUserTokenFromStore() || '',
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
        token: getUserTokenFromStore() || '',
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
        image: '/dummy.png',
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

  getUserInWorkspace: async (workspaceId: string, userId: string) => {
    try {
      const workspaceUsers = await get().getUsersByWorkspace(workspaceId);
      const userInWorkspace = workspaceUsers.find(user => user.user_id === userId);

      return userInWorkspace || null;
    } catch (error) {
      console.error("Error getting user in workspace:", error);
      return null;
    }
  },
}));
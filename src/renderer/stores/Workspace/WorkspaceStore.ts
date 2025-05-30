import { create } from "zustand";
import { v4 as uuidv4 } from 'uuid';
import * as R from 'ramda';
import { getUserFromStore, getUserTokenFromStore } from "@/utils/user";
import { IWorkspace, IWorkspaceUser, IWorkspaceWithRole, IWorkspaceInvitation, IWorkspaceJoin } from "@/../../types/Workspace/Workspace";
import { toast } from "@/utils/toast";
import { useToastStore } from "../Notification/ToastStore";
import { useKBStore } from "@/renderer/stores/KB/KBStore";
import { useFileExplorerStore } from "@/renderer/stores/File/FileExplorerStore";

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
  pendingInvitations: IWorkspaceInvitation[];

  createWorkspace: (data: WorkspaceCreateData) => Promise<IWorkspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  exitWorkspace: (workspaceId: string) => Promise<void>;
  getWorkspaceById: (workspaceId: string) => IWorkspace | undefined;
  fetchWorkspaceById: (workspaceId: string) => Promise<IWorkspace | null>;
  getWorkspace: (userId: string) => Promise<void>;
  joinWorkspaceByInviteCode: (inviteCode: string) => Promise<IWorkspace>;

  addUserToWorkspace: (workspaceId: string, userId: string | undefined, role: string, email?: string) => Promise<void>;
  removeUserFromWorkspace: (workspaceId: string, userId: string) => Promise<void>;
  getUsersByWorkspace: (workspaceId: string, role?: string) => Promise<IWorkspaceUser[]>;

  sendInvitation: (workspaceId: string, email: string) => Promise<any>;
  getInvitations: (workspaceId: string, status?: string) => Promise<IWorkspaceInvitation[]>;
  updateInvitation: (workspaceId: string, invitationId: string, status: 'accepted' | 'declined') => Promise<any>;
  cancelInvitation: (workspaceId: string, invitationId: string) => Promise<any>;
  fetchPendingInvitations: (workspaceId: string) => Promise<void>;

  getJoinRequests: (workspaceId: string) => Promise<IWorkspaceJoin[]>;
  approveJoinRequest: (workspaceId: string, userId: string) => Promise<any>;
  rejectJoinRequest: (workspaceId: string, userId: string) => Promise<any>;

  onWorkspaceCreated?: (workspace: IWorkspace) => void;
  setWorkspaceCreatedCallback: (callback: ((workspace: IWorkspace) => void) | undefined) => void;

  getUserInWorkspace: (workspaceId: string, userId: string) => Promise<IWorkspaceUser | null>;

  updateUserRole: (workspaceId: string, userId: string, role: string) => Promise<void>;

  getUserInvitations: (status?: string) => Promise<IWorkspaceInvitation[]>;
  getUserJoinRequests: (status?: string) => Promise<IWorkspaceJoin[]>;
}

// Helper function for permission checking
async function checkManagementPermission(workspaceId: string, get: () => WorkspaceState, set: (partial: Partial<WorkspaceState>) => void): Promise<boolean> {
  const currentUser = getUserFromStore();
  if (!currentUser || !currentUser.id) {
    toast.error("User not authenticated.");
    set({ isLoading: false });
    return false;
  }
  // Ensure isLoading is true while fetching user role if not already
  const currentlyLoading = get().isLoading;
  if (!currentlyLoading) set({ isLoading: true });

  const actorInWorkspace = await get().getUserInWorkspace(workspaceId, currentUser.id);

  if (!currentlyLoading) set({ isLoading: false }); // Reset isLoading if we set it

  if (!actorInWorkspace || (actorInWorkspace.role !== 'admin' && actorInWorkspace.role !== 'super_admin')) {
    toast.error("You do not have permission for this action.");
    return false;
  }
  return true;
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  workspaces: [],
  isLoading: false,
  error: null,
  workspaceUsers: [],
  pendingInvitations: [],

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

      // Try to remove user from workspace on server
      try {
        await get().removeUserFromWorkspace(workspaceId, userId);
      } catch (serverError: any) {
        // If workspace doesn't exist on server, log the error but continue with local cleanup
        if (serverError.message?.includes("not found") ||
          serverError.message?.includes("404") ||
          serverError.message?.includes("Workspace not found")) {
          console.warn(`Workspace ${workspaceId} not found on server, proceeding with local cleanup:`, serverError);
          toast.info(`Workspace no longer exists on server, removing from local state`);
        } else {
          // Re-throw other errors (permissions, network issues, etc.)
          throw serverError;
        }
      }

      // Always perform local cleanup regardless of server response
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

  fetchWorkspaceById: async (workspaceId: string) => {
    const existingWorkspace = get().getWorkspaceById(workspaceId);
    if (existingWorkspace) {
      return existingWorkspace;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.get_by_id({
        token: getUserTokenFromStore() || '',
        workspaceId
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const fetchedWorkspace = response.data as IWorkspace | undefined;

      if (fetchedWorkspace) {
        set(state => ({
          workspaces: R.uniqBy(R.prop('id'), [...state.workspaces, fetchedWorkspace]),
          isLoading: false
        }));
        return fetchedWorkspace;
      } else {
        console.warn(`Workspace ${workspaceId} not found or response structure issue after fetch.`);
        throw new Error("Workspace not found or unexpected response structure.");
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error(`Error fetching workspace by ID (${workspaceId}) via store:`, error);
      return null;
    }
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

      // Use invite code as workspaceId parameter to trigger invite code lookup
      const response = await window.electron.workspace.join_request({
        token: getUserTokenFromStore() || '',
        workspaceId: inviteCode, // This will be treated as invite code by the API
        invite_code: inviteCode
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const joinData = response.data?.data;
      const workspace = joinData?.workspace;

      if (!workspace) {
        throw new Error("Failed to retrieve workspace information");
      }

      // All joins require approval, even with valid invite code
      toast.info(`Join request sent for workspace: ${workspace.name}. Waiting for admin approval.`);
      set({ isLoading: false });

      // Return workspace info but don't add to local store yet
      return {
        id: workspace.id,
        name: workspace.name,
        image: workspace.image || '/workspace-icon.png',
        invite_code: inviteCode,
        created_at: workspace.created_at || new Date().toISOString(),
        updated_at: workspace.updated_at || new Date().toISOString(),
        settings: workspace.settings || {},
      } as IWorkspace;

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

  getJoinRequests: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.get_join_requests({
        token: getUserTokenFromStore() || '',
        workspaceId
      });

      if (response.error) {
        throw new Error(response.error);
      }

      set({ isLoading: false });
      return response.data?.data || [];
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching join requests:", error);
      throw error;
    }
  },

  approveJoinRequest: async (workspaceId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const hasPermission = await checkManagementPermission(workspaceId, get, set);
      if (!hasPermission) {
        // isLoading is already handled by checkManagementPermission or initial set
        // set({ isLoading: false }); // ensure isLoading is false if permission denied early
        throw new Error("Permission denied to approve join request.");
      }

      const response = await window.electron.workspace.update_join_request({
        token: getUserTokenFromStore() || '',
        workspaceId,
        user_id: userId,
        status: 'active'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      set({ isLoading: false });
      toast.success("Join request approved");

      // Refresh workspace users
      await get().getUsersByWorkspace(workspaceId);
      // The component (WorkspaceMembersMenu) will trigger a refresh of join requests via refreshTrigger

      return response.data?.data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      // Avoid double toasting if checkManagementPermission already toasted
      if (error.message !== "Permission denied to approve join request." && error.message !== "User not authenticated.") {
        toast.error(error.message || "Failed to approve join request");
      }
      console.error("Error approving join request:", error);
      throw error;
    }
  },

  rejectJoinRequest: async (workspaceId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const hasPermission = await checkManagementPermission(workspaceId, get, set);
      if (!hasPermission) {
        // set({ isLoading: false }); // ensure isLoading is false
        throw new Error("Permission denied to reject join request.");
      }

      const response = await window.electron.workspace.update_join_request({
        token: getUserTokenFromStore() || '',
        workspaceId,
        user_id: userId,
        status: 'left' // Assuming 'left' or similar status for rejection based on prior code
      });

      if (response.error) {
        throw new Error(response.error);
      }

      set({ isLoading: false });
      toast.success("Join request rejected");
      // Component will trigger refresh of join requests

      return response.data?.data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      if (error.message !== "Permission denied to reject join request." && error.message !== "User not authenticated.") {
        toast.error(error.message || "Failed to reject join request");
      }
      console.error("Error rejecting join request:", error);
      throw error;
    }
  },

  sendInvitation: async (workspaceId: string, email: string) => {
    try {
      const response = await window.electron.workspace.send_invitation({
        token: getUserTokenFromStore() || '',
        workspaceId,
        invitee_email: email
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success(`Invitation sent to ${email}`);
      await get().fetchPendingInvitations(workspaceId);
      return response.data?.data;
    } catch (error: any) {
      set({ error: error.message });
      toast.error(error.message || "Failed to send invitation");
      console.error("Error sending invitation:", error);
      throw error;
    }
  },

  getInvitations: async (workspaceId: string, status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.get_invitations({
        token: getUserTokenFromStore() || '',
        workspaceId,
        status
      });

      if (response.error) {
        throw new Error(response.error);
      }

      set({ isLoading: false });
      return response.data?.data || [];
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching invitations:", error);
      throw error;
    }
  },

  updateInvitation: async (workspaceId: string, invitationId: string, status: 'accepted' | 'declined') => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.update_invitation({
        token: getUserTokenFromStore() || '',
        workspaceId,
        invitation_id: invitationId,
        status
      });

      if (response.error) {
        throw new Error(response.error);
      }

      set({ isLoading: false });
      toast.success(`Invitation ${status}`);

      if (status === 'accepted') {
        await get().getUsersByWorkspace(workspaceId);
      }

      return response.data?.data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message || `Failed to ${status} invitation`);
      console.error("Error updating invitation:", error);
      throw error;
    }
  },

  cancelInvitation: async (workspaceId: string, invitationId: string) => {
    try {
      const response = await window.electron.workspace.cancel_invitation({
        token: getUserTokenFromStore() || '',
        workspaceId,
        invitationId
      });

      if (response.error) {
        throw new Error(response.error);
      }

      toast.success("Invitation cancelled");
      await get().fetchPendingInvitations(workspaceId);
      // Clear error state on success
      set({ error: null });
      return response.data?.data;
    } catch (error: any) {
      set({ error: error.message });
      toast.error(error.message || "Failed to cancel invitation");
      console.error("Error cancelling invitation:", error);
      throw error;
    }
  },

  updateUserRole: async (workspaceId: string, userId: string, role: string) => {
    set({ isLoading: true, error: null });
    let operationCompletedSuccessfully = false;
    try {
      await get().removeUserFromWorkspace(workspaceId, userId);
      if (!get().isLoading) { // Ensure store is still marked as loading for the addUser part
        set({ isLoading: true });
      }
      await get().addUserToWorkspace(workspaceId, userId, role);
      operationCompletedSuccessfully = true;
      toast.success("User role updated successfully");
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      toast.error(error.message || "Failed to update user role");
      console.error("Error updating user role:", error);
      throw error;
    } finally {
      // If all operations succeeded, addUserToWorkspace (which calls getUsersByWorkspace)
      // should have set isLoading to false.
      // If an error occurred, the catch block sets isLoading to false.
      // This is a final check in case the sequence was interrupted weirdly or
      // if addUserToWorkspace logic changes and doesn't guarantee isLoading is false.
      if (operationCompletedSuccessfully && get().isLoading) {
        set({ isLoading: false });
      }
    }
  },

  fetchPendingInvitations: async (workspaceId: string) => {
    try {
      const response = await window.electron.workspace.get_invitations({
        token: getUserTokenFromStore() || '',
        workspaceId,
        status: 'pending'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Clear error state on success
      set({ pendingInvitations: response.data?.data || [], error: null });
    } catch (error: any) {
      set({ error: error.message, pendingInvitations: [] });
      console.error("Error fetching pending invitations:", error);
    }
  },

  getUserInvitations: async (status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.get_user_invitations({
        token: getUserTokenFromStore() || '',
        status
      });

      if (response.error) {
        throw new Error(response.error);
      }

      set({ isLoading: false });
      return response.data?.data || [];
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching user invitations:", error);
      throw error;
    }
  },

  getUserJoinRequests: async (status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.get_user_join_requests({
        token: getUserTokenFromStore() || '',
        status
      });

      if (response.error) {
        throw new Error(response.error);
      }

      set({ isLoading: false });
      return response.data?.data || [];
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching user join requests:", error);
      throw error;
    }
  },
}));

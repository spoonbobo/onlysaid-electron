import { ipcMain } from 'electron';
import onlysaidServiceInstance from './service';
import {
  IWorkspace,
  ICreateWorkspaceArgs,
  IGetWorkspaceArgs,
  IUpdateWorkspaceArgs,
  IRemoveUserFromWorkspaceArgs,
  IAddUsersToWorkspaceArgs,
  IWorkspaceUser,
  IGetUsersFromWorkspaceArgs,
  ISendInvitationArgs,
  IGetInvitationsArgs,
  IUpdateInvitationArgs,
  ICancelInvitationArgs,
  IJoinWorkspaceArgs,
  IGetJoinRequestsArgs,
  IUpdateJoinRequestArgs,
  ILeaveWorkspaceArgs,
  IWorkspaceInvitation,
  IWorkspaceJoin,
  IWorkspaceSettings,
  IGetWorkspaceSettingsArgs,
  ICreateWorkspaceSettingsArgs,
  IUpdateWorkspaceSettingsArgs,
  IDeleteWorkspaceSettingsArgs,
  IUpdateUserRoleArgs,
  IGetUserInvitationsArgs
} from '@/../../types/Workspace/Workspace';

interface IGetPoliciesArgs {
  token: string;
  workspaceId: string;
  resource_type?: string;
  action?: string;
}

interface IGetUserPoliciesArgs {
  token: string;
  workspaceId: string;
  userId: string;
}

interface IGrantUserPolicyArgs {
  token: string;
  workspaceId: string;
  userId: string;
  policy_id: string;
}

interface IRevokeUserPolicyArgs {
  token: string;
  workspaceId: string;
  userId: string;
  policy_id: string;
}

interface IGetUserJoinRequestsArgs {
  token: string;
  status?: string;
}

export const setupWorkspaceHandlers = () => {
  ipcMain.handle('workspace:create', async (event, args: ICreateWorkspaceArgs) => {
    try {
      const response = await onlysaidServiceInstance.post<IWorkspace>(
        '/workspace',
        args.request,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (create_workspace):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:get', async (event, args: IGetWorkspaceArgs) => {
    try {
      const response = await onlysaidServiceInstance.get<IWorkspace[]>(
        `/workspace?userId=${args.userId}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );

      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_workspaces):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:update', async (event, args: IUpdateWorkspaceArgs) => {
    try {
      const { workspaceId, request, token } = args;
      if (!workspaceId) {
        throw new Error("workspaceId is required for update operation.");
      }

      const response = await onlysaidServiceInstance.put<IWorkspace>(
        `/workspace/${workspaceId}`,
        request,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return { data: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Unknown error during workspace update";
      console.error('Error in main process API call (update_workspace):', errorMessage, error.response?.data);
      return {
        error: errorMessage,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:delete', async (event, args: { token: string; workspaceId: string }) => {
    try {
      const { workspaceId, token } = args;
      if (!workspaceId) {
        throw new Error("workspaceId is required for delete operation.");
      }
      const response = await onlysaidServiceInstance.delete<null>(
        `/workspace/${workspaceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Unknown error during workspace delete";
      console.error('Error in main process API call (delete_workspace):', errorMessage, error.response?.data);
      return {
        error: errorMessage,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:add_users', async (event, args: IAddUsersToWorkspaceArgs) => {
    try {
      const response = await onlysaidServiceInstance.post<IWorkspace>(
        `/workspace/${args.workspaceId}/users`,
        args.request,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (add_user_to_workspace):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:remove_user', async (event, args: IRemoveUserFromWorkspaceArgs) => {
    try {
      const response = await onlysaidServiceInstance.delete<null>(
        `/workspace/${args.workspaceId}/users?userId=${args.userId}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (remove_user_from_workspace):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:get_users', async (event, args: IGetUsersFromWorkspaceArgs) => {
    try {
      const response = await onlysaidServiceInstance.get<IWorkspaceUser[]>(
        `/workspace/${args.workspaceId}/users`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_users_from_workspace):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:send_invitation', async (event, args: ISendInvitationArgs) => {
    try {
      console.log('Sending invitation to:', args.invitee_email);
      const response = await onlysaidServiceInstance.post<IWorkspaceInvitation>(
        `/workspace/${args.workspaceId}/invitations`,
        { invitee_email: args.invitee_email },
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      console.log('Invitation sent:', response.data);
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (send_invitation):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:get_invitations', async (event, args: IGetInvitationsArgs) => {
    try {
      const params = args.status ? `?status=${args.status}` : '';
      const response = await onlysaidServiceInstance.get<IWorkspaceInvitation[]>(
        `/workspace/${args.workspaceId}/invitations${params}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_invitations):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:update_invitation', async (event, args: IUpdateInvitationArgs) => {
    try {
      const response = await onlysaidServiceInstance.put<IWorkspaceInvitation>(
        `/workspace/${args.workspaceId}/invitations`,
        { invitation_id: args.invitation_id, status: args.status },
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (update_invitation):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:cancel_invitation', async (event, args: ICancelInvitationArgs) => {
    try {
      const response = await onlysaidServiceInstance.delete<IWorkspaceInvitation>(
        `/workspace/${args.workspaceId}/invitations?invitationId=${args.invitationId}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (cancel_invitation):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:join_request', async (event, args: IJoinWorkspaceArgs) => {
    try {
      const response = await onlysaidServiceInstance.post<IWorkspaceJoin>(
        `/workspace/${args.workspaceId}/join`,
        { invite_code: args.invite_code },
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (join_request):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:get_join_requests', async (event, args: IGetJoinRequestsArgs) => {
    try {
      const response = await onlysaidServiceInstance.get<IWorkspaceJoin[]>(
        `/workspace/${args.workspaceId}/join`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_join_requests):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:update_join_request', async (event, args: IUpdateJoinRequestArgs) => {
    try {
      const response = await onlysaidServiceInstance.put<IWorkspaceJoin>(
        `/workspace/${args.workspaceId}/join`,
        { user_id: args.user_id, status: args.status },
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (update_join_request):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:leave', async (event, args: ILeaveWorkspaceArgs) => {
    try {
      const response = await onlysaidServiceInstance.delete<null>(
        `/workspace/${args.workspaceId}/join`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (leave_workspace):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:get_by_id', async (event, args: { token: string; workspaceId: string }) => {
    try {
      const response = await onlysaidServiceInstance.get<{ message: string, data: IWorkspace }>(
        `/workspace/${args.workspaceId}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      if (response.data && response.data.data) {
        return { data: response.data.data };
      } else {
        console.error('Unexpected response structure from backend for workspace:get_by_id:', response.data);
        return { error: 'Unexpected response structure from backend', status: 500 };
      }
    } catch (error: any) {
      console.error(`Error in main process API call (workspace:get_by_id) for ${args.workspaceId}:`, error.response?.data || error.message);
      return {
        error: error.response?.data?.message || error.message || "Unknown error fetching workspace by ID",
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:update_user_role', async (event, args: IUpdateUserRoleArgs) => {
    try {
      const response = await onlysaidServiceInstance.put<IWorkspaceUser>(
        `/workspace/${args.workspaceId}/users/${args.userId}/roles`,
        { role_id: args.role_id },
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      if (response.data && (response.data as any).data) {
        return { data: (response.data as any).data };
      }
      return { data: response.data };
    } catch (error: any) {
      console.error(`Error in main process API call (workspace:update_user_role) for user ${args.userId} in workspace ${args.workspaceId}:`, error.response?.data || error.message);
      return {
        error: error.response?.data?.message || error.message || "Unknown error updating user role",
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:get_user_invitations', async (event, args: IGetUserInvitationsArgs) => {
    try {
      const params = args.status ? `?status=${args.status}` : '';
      const response = await onlysaidServiceInstance.get<IWorkspaceInvitation[]>(
        `/user/invitations${params}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_user_invitations):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:get_user_join_requests', async (event, args: IGetUserJoinRequestsArgs) => {
    try {
      const params = args.status ? `?status=${args.status}` : '';
      const response = await onlysaidServiceInstance.get<IWorkspaceJoin[]>(
        `/user/join${params}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_user_join_requests):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:get_settings', async (event, args: IGetWorkspaceSettingsArgs) => {
    try {
      const response = await onlysaidServiceInstance.get(
        `/workspace/${args.workspaceId}/settings`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_workspace_settings):', error.message);
      return {
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:create_settings', async (event, args: ICreateWorkspaceSettingsArgs) => {
    try {
      const response = await onlysaidServiceInstance.post(
        `/workspace/${args.workspaceId}/settings`,
        args.request,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (create_workspace_settings):', error.message);
      return {
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:update_settings', async (event, args: IUpdateWorkspaceSettingsArgs) => {
    try {
      const response = await onlysaidServiceInstance.put(
        `/workspace/${args.workspaceId}/settings`,
        args.request,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (update_workspace_settings):', error.message);
      return {
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:delete_settings', async (event, args: IDeleteWorkspaceSettingsArgs) => {
    try {
      const response = await onlysaidServiceInstance.delete(
        `/workspace/${args.workspaceId}/settings`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (delete_workspace_settings):', error.message);
      return {
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  });

  // Policy management handlers
  ipcMain.handle('workspace:get_policies', async (event, args: IGetPoliciesArgs) => {
    try {
      let url = `/workspace/${args.workspaceId}/policies`;
      const params = new URLSearchParams();
      
      if (args.resource_type) params.append('resource_type', args.resource_type);
      if (args.action) params.append('action', args.action);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await onlysaidServiceInstance.get(url, {
        headers: {
          Authorization: `Bearer ${args.token}`
        }
      });
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_policies):', error.message);
      return {
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:get_user_policies', async (event, args: IGetUserPoliciesArgs) => {
    try {
      const response = await onlysaidServiceInstance.get(
        `/workspace/${args.workspaceId}/users/${args.userId}/permissions`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_user_policies):', error.message);
      return {
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:grant_user_policy', async (event, args: IGrantUserPolicyArgs) => {
    try {
      const response = await onlysaidServiceInstance.post(
        `/workspace/${args.workspaceId}/users/${args.userId}/policies`,
        { policy_id: args.policy_id },
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (grant_user_policy):', error.message);
      return {
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('workspace:revoke_user_policy', async (event, args: IRevokeUserPolicyArgs) => {
    try {
      const response = await onlysaidServiceInstance.delete(
        `/workspace/${args.workspaceId}/users/${args.userId}/policies?policy_id=${args.policy_id}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (revoke_user_policy):', error.message);
      return {
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      };
    }
  });
};

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
  IGetUsersFromWorkspaceArgs
} from '@/../../types/Workspace/Workspace';

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
};

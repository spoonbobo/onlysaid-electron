import onlysaidServiceInstance from "./service";
import { ipcMain } from "electron";
import { IUser } from "@/../../types/User/User";
import { IUserGet } from "@/../../types/User/User";
import { IUserSearch } from "@/../../types/User/User";
import { IUserSearchResponse } from "@/../../types/User/User";
import {
  ILogUsageArgs,
  IGetUsageLogsArgs,
  IGetUsageAnalyticsArgs,
  IGetPlanArgs,
  ICreatePlanArgs,
  IUpdatePlanArgs,
  IUsageLogsResponse,
  IUsageAnalyticsResponse,
  IUserPlanResponse
} from "@/../../types/Usage/Usage";

export const setupUserHandlers = () => {
  ipcMain.handle('user:auth', async (event, args) => {
    try {
      const user = await onlysaidServiceInstance.get<IUser>(
        '/user/auth',
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: user.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_user):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('user:get', async (event, arg: IUserGet) => {
    try {
      const user = await onlysaidServiceInstance.post<IUser>(
        '/user',
        arg.args,
        {
          headers: {
            Authorization: `Bearer ${arg.token}`
          }
        }
      );
      return { data: user.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_user):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('user:update', async (event, args) => {
    try {
      const user = await onlysaidServiceInstance.put<IUser>(
        '/user',
        args.user,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: user.data };
    } catch (error: any) {
      console.error('Error in main process API call (update_user):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('user:search', async (event, arg: IUserSearch) => {
    try {
      const response = await onlysaidServiceInstance.get<IUserSearchResponse>(
        `/user/search?email=${encodeURIComponent(arg.email)}&limit=${arg.limit || 10}`,
        {
          headers: {
            Authorization: `Bearer ${arg.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (search_users):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  // Usage handlers
  ipcMain.handle('user:usage:log', async (event, args: ILogUsageArgs) => {
    try {
      const response = await onlysaidServiceInstance.post<IUsageLogsResponse>(
        '/user/usage/log',
        args.data,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (log_usage):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('user:usage:get-logs', async (event, args: IGetUsageLogsArgs) => {
    try {
      const params = new URLSearchParams();
      if (args.limit) params.append('limit', args.limit.toString());
      if (args.offset) params.append('offset', args.offset.toString());

      const response = await onlysaidServiceInstance.get<IUsageLogsResponse>(
        `/user/usage/log?${params}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_usage_logs):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('user:usage:get-analytics', async (event, args: IGetUsageAnalyticsArgs) => {
    try {
      const params = new URLSearchParams();
      if (args.days) params.append('days', args.days.toString());

      const response = await onlysaidServiceInstance.get<IUsageAnalyticsResponse>(
        `/user/usage?${params}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_usage_analytics):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('user:plan:get', async (event, args: IGetPlanArgs) => {
    try {
      const response = await onlysaidServiceInstance.get<IUserPlanResponse>(
        '/user/usage/plan',
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_user_plan):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('user:plan:create', async (event, args: ICreatePlanArgs) => {
    try {
      const response = await onlysaidServiceInstance.post<IUserPlanResponse>(
        '/user/usage/plan',
        args.data,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (create_user_plan):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('user:plan:update', async (event, args: IUpdatePlanArgs) => {
    try {
      const response = await onlysaidServiceInstance.put<IUserPlanResponse>(
        '/user/usage/plan',
        args.data,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (update_user_plan):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });
};

export default setupUserHandlers;

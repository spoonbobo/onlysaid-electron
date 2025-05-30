import onlysaidServiceInstance from "./service";
import { ipcMain } from "electron";
import { IUser } from "@/../../types/User/User";
import { IUserGet } from "@/../../types/User/User";
import { IUserSearch } from "@/../../types/User/User";
import { IUserSearchResponse } from "@/../../types/User/User";

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
};

export default setupUserHandlers;

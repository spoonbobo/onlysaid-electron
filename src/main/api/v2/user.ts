import onlysaidServiceInstance from "./service";
import { ipcMain } from "electron";
import { IUser } from "@/models/User/UserInfo";

export const setupUserHandlers = () => {
  ipcMain.handle('user:get', async (event, args) => {
    try {
      const user = await onlysaidServiceInstance.get<IUser>(
        '/user',
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
};

export default setupUserHandlers;

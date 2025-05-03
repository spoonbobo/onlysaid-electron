import { ipcMain } from 'electron';
import onlysaidServiceInstance from '../service';

export const setupChatroomHandlers = () => {
  ipcMain.handle('chatroom:get', async (event, args) => {
    try {
      const { roomIds, token } = args;

      const response = await onlysaidServiceInstance.get<any>(
        '/chatroom?userId=1'
      );

      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (get_rooms):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

};

import { ipcMain } from 'electron';
import onlysaidServiceInstance from '../service';
import { IChatRoom } from '@/models/Chat/Chatroom';
import { CreateChatroomArgs } from '@/models/Chat/Chatroom';

export const setupChatroomHandlers = () => {
  ipcMain.handle('chatroom:create', async (event, args: CreateChatroomArgs) => {
    try {
      console.log("args", args);
      const response = await onlysaidServiceInstance.post<IChatRoom>(
        '/chatroom',
        args,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (create_room):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('chatroom:get', async (event, args) => {
    try {
      const response = await onlysaidServiceInstance.get<IChatRoom[]>(
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

  ipcMain.handle('chatroom:update', async (event, args) => {
    try {
      const response = await onlysaidServiceInstance.put<IChatRoom>(`/chatroom/${args.id}`, args);
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (update_room):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('chatroom:delete', async (event, args) => {
    try {
      const response = await onlysaidServiceInstance.delete<null>(`/chatroom/${args.id}`);
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (delete_room):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });
};

import { ipcMain } from 'electron';
import onlysaidServiceInstance from './service';
import { IChatRoom, ICreateChatArgs, IGetChatArgs } from '@/models/Chat/Chatroom';

export const setupChatroomHandlers = () => {
  ipcMain.handle('chat:create', async (event, args: ICreateChatArgs) => {
    try {
      const response = await onlysaidServiceInstance.post<IChatRoom>(
        '/chat',
        args.request,
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

  ipcMain.handle('chat:get', async (event, args: IGetChatArgs) => {
    try {
      const response = await onlysaidServiceInstance.get<IChatRoom[]>(
        `/chat?userId=${args.userId}&type=${args.type}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
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

  ipcMain.handle('chat:update', async (event, args) => {
    try {
      const response = await onlysaidServiceInstance.put<IChatRoom>(`/chat/${args.id}`, args);
      return { data: response.data };
    } catch (error: any) {
      console.error('Error in main process API call (update_room):', error.message);
      return {
        error: error.message,
        status: error.response?.status
      };
    }
  });

  ipcMain.handle('chat:delete', async (event, args) => {
    try {
      const response = await onlysaidServiceInstance.delete<null>(
        `/chat?id=${args.id}`,
        {
          headers: {
            Authorization: `Bearer ${args.token}`
          }
        }
      );
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

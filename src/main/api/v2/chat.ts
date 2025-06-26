import { ipcMain } from 'electron';
import onlysaidServiceInstance from './service';
import { IChatRoom, ICreateChatArgs, IGetChatArgs, IUpdateChatArgs } from '@/../../types/Chat/Chatroom';

// Add new interface for member args
interface IChatMemberArgs {
    token: string;
    chatId: string;
    user_id?: string;
    role?: string;
}

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
                `/chat?userId=${args.userId}&type=${args.type}&workspaceId=${args.workspaceId}`,
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

    ipcMain.handle('chat:update', async (event, args: IUpdateChatArgs) => {
        try {
            const response = await onlysaidServiceInstance.put<IChatRoom>(
                `/chat`,
                args.request,
                {
                    headers: {
                        Authorization: `Bearer ${args.token}`
                    }
                }
            );

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

    // Chat Members Management Handlers
    ipcMain.handle('chat:get-members', async (event, args: IChatMemberArgs) => {
        try {
            const response = await onlysaidServiceInstance.get(
                `/v2/chat/${args.chatId}/members`,
                {
                    headers: {
                        Authorization: `Bearer ${args.token}`
                    }
                }
            );
            return { data: response.data.data };
        } catch (error: any) {
            console.error('Error in main process API call (chat:get-members):', error.message);
            return {
                error: error.message,
                status: error.response?.status
            };
        }
    });

    ipcMain.handle('chat:add-member', async (event, args: IChatMemberArgs) => {
        try {
            const response = await onlysaidServiceInstance.post(
                `/v2/chat/${args.chatId}/members`,
                { user_id: args.user_id, role: args.role || 'member' },
                {
                    headers: {
                        Authorization: `Bearer ${args.token}`
                    }
                }
            );
            return { data: response.data.data };
        } catch (error: any) {
            console.error('Error in main process API call (chat:add-member):', error.message);
            return {
                error: error.message,
                status: error.response?.status
            };
        }
    });

    ipcMain.handle('chat:update-member-role', async (event, args: IChatMemberArgs) => {
        try {
            const response = await onlysaidServiceInstance.put(
                `/v2/chat/${args.chatId}/members`,
                { user_id: args.user_id, role: args.role },
                {
                    headers: {
                        Authorization: `Bearer ${args.token}`
                    }
                }
            );
            return { data: response.data.data };
        } catch (error: any) {
            console.error('Error in main process API call (chat:update-member-role):', error.message);
            return {
                error: error.message,
                status: error.response?.status
            };
        }
    });

    ipcMain.handle('chat:remove-member', async (event, args: IChatMemberArgs) => {
        try {
            const response = await onlysaidServiceInstance.delete(
                `/v2/chat/${args.chatId}/members?user_id=${args.user_id}`,
                {
                    headers: {
                        Authorization: `Bearer ${args.token}`
                    }
                }
            );
            return { data: response.data.data };
        } catch (error: any) {
            console.error('Error in main process API call (chat:remove-member):', error.message);
            return {
                error: error.message,
                status: error.response?.status
            };
        }
    });
};

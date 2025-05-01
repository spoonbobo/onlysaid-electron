import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { IChatMessage } from '../../models/Chat/Message';

interface ChatState {
    messages: Record<string, IChatMessage[]>; // roomId -> messages
    currentRoomId: string | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setCurrentRoom: (roomId: string) => void;
    sendMessage: (content: string, trustMode: boolean) => Promise<void>;
    fetchMessages: (roomId: string) => Promise<void>;
    clearMessages: (roomId?: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: {},
    currentRoomId: null,
    isLoading: false,
    error: null,

    setCurrentRoom: (roomId) => {
        set({ currentRoomId: roomId });
        // Optionally fetch messages for this room if not already loaded
        if (roomId && !get().messages[roomId]) {
            get().fetchMessages(roomId);
        }
    },

    sendMessage: async (content, trustMode) => {
        console.log('sendMessage', content, trustMode);
        // const { currentRoomId } = get();

        // if (!currentRoomId || !content.trim()) {
        //     set({ error: 'Cannot send message: No room selected or empty message' });
        //     return;
        // }

        // set({ isLoading: true, error: null });

        // try {
        //     // Call the Rust command using invoke
        //     await invoke('insert_message', {
        //         content,
        //         trustMode,
        //         roomId: currentRoomId,
        //     });

        //     // Optimistically update the UI with the new message
        //     const newMessage: Message = {
        //         id: Date.now().toString(), // Temporary ID until we get the real one
        //         content,
        //         timestamp: Date.now(),
        //         trustMode,
        //     };

        //     set((state) => ({
        //         messages: {
        //             ...state.messages,
        //             [currentRoomId]: [
        //                 ...(state.messages[currentRoomId] || []),
        //                 newMessage
        //             ]
        //         },
        //         isLoading: false,
        //     }));

        // } catch (error) {
        //     console.error('Failed to send message:', error);
        //     set({
        //         error: `Failed to send message: ${error instanceof Error ? error.message : String(error)}`,
        //         isLoading: false
        //     });
        // }
    },

    fetchMessages: async (roomId) => {
        if (!roomId) return;

        set({ isLoading: true, error: null });

        try {
            // Call the Rust command to fetch messages
            const messages = await invoke<IChatMessage[]>('get_messages', {
                roomId,
            });

            set((state) => ({
                messages: {
                    ...state.messages,
                    [roomId]: messages
                },
                isLoading: false,
            }));

        } catch (error) {
            console.error('Failed to fetch messages:', error);
            set({
                error: `Failed to fetch messages: ${error instanceof Error ? error.message : String(error)}`,
                isLoading: false
            });
        }
    },

    clearMessages: (roomId) => {
        if (roomId) {
            // Clear messages for a specific room
            set((state) => {
                const newMessages = { ...state.messages };
                delete newMessages[roomId];
                return { messages: newMessages };
            });
        } else {
            // Clear all messages
            set({ messages: {} });
        }
    },
}));

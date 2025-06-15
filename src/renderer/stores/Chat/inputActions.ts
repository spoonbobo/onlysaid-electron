import { ChatState } from './types';

export const createInputActions = (set: any, get: () => ChatState) => ({
  setInput: (chatId: string, input: string, contextId = '') => {
    set((state: ChatState) => ({
      inputByContextChat: {
        ...state.inputByContextChat,
        [`${contextId}:${chatId}`]: input
      }
    }));
  },

  getInput: (chatId: string, contextId = '') => {
    return get().inputByContextChat[`${contextId}:${chatId}`] || '';
  },
}); 
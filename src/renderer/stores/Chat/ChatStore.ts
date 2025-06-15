import { persist, createJSONStorage } from "zustand/middleware";
import { create } from "zustand";
import { getUserTokenFromStore, getUserFromStore } from "@/utils/user";
import { getCurrentWorkspace } from "@/utils/workspace";
import { v4 as uuidv4 } from 'uuid';
import * as R from 'ramda';
import { validate } from 'uuid';
import { IChatMessage, IReaction } from "@/../../types/Chat/Message";
import { IChatRoom, IUpdateChatArgs } from "@/../../types/Chat/Chatroom";
import { IUser } from "@/../../types/User/User";
import { useSocketStore } from "../Socket/SocketStore";
import { useLLMStore } from '@/renderer/stores/LLM/LLMStore';
import { IChatMessageToolCall } from '@/../../types/Chat/Message';
import { DBTABLES } from '@/../../constants/db';
import { IFile } from "@/../../types/File/File";
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { ChatState, MESSAGE_FETCH_LIMIT } from './types';
import { createChatActions } from './chatActions';
import { createMessageActions } from './messageActions';
import { createInputActions } from './inputActions';

// Add user cache at the top level
const userCache = new Map<string, IUser>();
const userCacheTimestamps = new Map<string, number>();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get users with caching
const getUsersWithCache = async (userIds: string[]): Promise<Record<string, IUser>> => {
  const now = Date.now();
  const validUUIDs = userIds.filter(id => validate(id));
  const uncachedUserIds: string[] = [];
  const result: Record<string, IUser> = {};

  // Check cache first
  for (const userId of validUUIDs) {
    const cachedUser = userCache.get(userId);
    const cacheTime = userCacheTimestamps.get(userId);

    if (cachedUser && cacheTime && (now - cacheTime) < USER_CACHE_TTL) {
      result[userId] = cachedUser;
    } else {
      uncachedUserIds.push(userId);
    }
  }

  // Fetch uncached users
  if (uncachedUserIds.length > 0) {
    try {
      const userInfos = await window.electron.user.get({
        token: getUserTokenFromStore(),
        args: {
          ids: uncachedUserIds
        }
      });

      if (userInfos?.data?.data) {
        const fetchedUsers = userInfos.data.data as IUser[];

        // Update cache and result
        for (const user of fetchedUsers) {
          if (user.id) {
            userCache.set(user.id, user);
            userCacheTimestamps.set(user.id, now);
            result[user.id] = user;
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user information:", error);
    }
  }

  return result;
};

const NewChat = (userId: string, type: string, workspaceId?: string) => {
  return {
    name: `New Chat`,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    unread: 0,
    workspace_id: workspaceId,
    type: type,
    user_id: userId,
  }
}

const messagesByIdCache = new Map<string, Map<string, IChatMessage>>();

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeChatByContext: {},
      messages: {},
      messageOffsets: {},
      chats: [],
      inputByContextChat: {},
      isLoading: false,
      error: null,
      isTyping: false,
      chatOverlayMinimized: false,

      // Combine all actions
      ...createChatActions(set, get),
      ...createMessageActions(set, get),
      ...createInputActions(set, get),
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const limitedMessages: Record<string, any[]> = {};
        Object.entries(state.messages).forEach(([chatId, messages]) => {
          limitedMessages[chatId] = messages.slice(-MESSAGE_FETCH_LIMIT);
        });

        return {
          activeChatByContext: state.activeChatByContext,
          messages: limitedMessages,
          messageOffsets: state.messageOffsets,
          chats: state.chats,
          inputByContextChat: state.inputByContextChat,
        };
      },
    }
  )
);

// Re-export types and constants for convenience
export type { ChatState } from './types';
export { MESSAGE_FETCH_LIMIT } from './types';

import { validate } from 'uuid';
import { IUser } from "@/../../types/User/User";
import { IChatMessage } from "@/../../types/Chat/Message";
import { getUserTokenFromStore } from "@/utils/user";

// Add user cache at the top level
const userCache = new Map<string, IUser>();
const userCacheTimestamps = new Map<string, number>();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get users with caching
export const getUsersWithCache = async (userIds: string[]): Promise<Record<string, IUser>> => {
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

export const NewChat = (userId: string, type: string, workspaceId?: string) => {
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

export const messagesByIdCache = new Map<string, Map<string, IChatMessage>>(); 
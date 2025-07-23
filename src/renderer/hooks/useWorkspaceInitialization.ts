import { useEffect } from 'react';
import { useWorkspaceStore } from '@/renderer/stores/Workspace/WorkspaceStore';
import { useUserStore } from '@/renderer/stores/User/UserStore';

/**
 * Centralized workspace initialization hook
 * Prevents multiple components from triggering workspace fetches simultaneously
 */
export const useWorkspaceInitialization = () => {
  const { initializeWorkspaces, isInitialized, lastFetchedUserId } = useWorkspaceStore();
  const user = useUserStore(state => state.user);

  useEffect(() => {
    if (user?.id) {
      // Only initialize if not already initialized for this user
      if (!isInitialized || lastFetchedUserId !== user.id) {
        console.log(`🚀 Initializing workspaces for user: ${user.username}`);
        initializeWorkspaces(user.id);
      }
    }
  }, [user?.id, initializeWorkspaces, isInitialized, lastFetchedUserId]);

  return {
    isInitialized,
    user
  };
}; 
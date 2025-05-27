import { useUserTokenStore } from "@/renderer/stores/User/UserToken";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";

export const getUserTokenFromStore = () => {
  return useUserTokenStore.getState().getToken();
};

export const getUserFromStore = () => {
  return useUserStore.getState().user;
};

export const getCurrentUserRoleInWorkspace = async (workspaceId?: string) => {
  const currentUser = getUserFromStore();
  if (!currentUser?.id) {
    return null;
  }

  let targetWorkspaceId = workspaceId;

  if (!targetWorkspaceId) {
    const selectedContext = useTopicStore.getState().selectedContext;
    targetWorkspaceId = selectedContext?.id;
  }

  if (!targetWorkspaceId) {
    return null;
  }

  const { getUserInWorkspace } = useWorkspaceStore.getState();
  const userInWorkspace = await getUserInWorkspace(targetWorkspaceId, currentUser.id);

  return userInWorkspace?.role || null;
};

import { useUserTokenStore } from "@/stores/User/UserToken";
import { useUserStore } from "@/stores/User/UserStore";
import { useWorkspaceStore } from "@/stores/Workspace/WorkspaceStore";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useAgentStore } from "@/stores/Agent/AgentStore";


export const getUserTokenFromStore = () => {
  return useUserTokenStore.getState().getToken();
};

export const getUserFromStore = () => {
  return useUserStore.getState().user;
};

export const getAgentFromStore = () => {
  return useAgentStore.getState().agent;
};

export const getCurrentWorkspace = () => {
  const workspaceId = useTopicStore.getState().selectedContext?.id;
  if (!workspaceId) {
    return null;
  }
  return useWorkspaceStore.getState().getWorkspaceById(workspaceId);
};

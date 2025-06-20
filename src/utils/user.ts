import { useUserTokenStore } from "@/renderer/stores/User/UserToken";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { IUser } from "@/../../types/User/User";

export const getUserTokenFromStore = () => {
  return useUserTokenStore.getState().getToken();
};

// Helper function to create guest user data
const createGuestUserData = (): IUser => ({
  id: "guest-user",
  username: "Guest",
  email: "guest@local",
  avatar: null,
  settings: {
    general: {
      theme: "system",
      language: "en"
    }
  },
  level: 1,
  xp: 0,
  is_human: true,
  agent_id: null,
});

export const getUserFromStore = () => {
  const user = useUserStore.getState().user;
  
  // Return guest user if no user is logged in
  if (!user) {
    return createGuestUserData();
  }
  
  return user;
};

export const getAgentFromStore = () => {
  const agent = useAgentStore.getState().agent;
  
  // If no agent exists, try to create guest agent
  if (!agent) {
    const { createGuestAgent } = useAgentStore.getState();
    createGuestAgent();
    return useAgentStore.getState().agent;
  }
  
  return agent;
};

export const getCurrentUserRoleInWorkspace = async (workspaceId?: string) => {
  const currentUser = getUserFromStore();
  if (!currentUser?.id || currentUser.id === "guest-user") {
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

// Helper function to check if current user is guest
export const isGuestUser = () => {
  const user = useUserStore.getState().user;
  return !user || user.id === "guest-user";
};

// Helper function to check if current agent is guest
export const isGuestAgent = () => {
  const agent = useAgentStore.getState().agent;
  return !agent || agent.id === "guest-agent";
};

// Helper function to get the actual user (null if guest)
export const getRealUserFromStore = () => {
  return useUserStore.getState().user;
};

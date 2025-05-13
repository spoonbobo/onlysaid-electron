import { useUserTokenStore } from "@/stores/User/UserToken";
import { useUserStore } from "@/stores/User/UserStore";
import { useWorkspaceStore } from "@/stores/Workspace/WorkspaceStore";

export const getUserTokenFromStore = () => {
  return useUserTokenStore.getState().getToken();
};

export const getUserFromStore = () => {
  return useUserStore.getState().user;
};

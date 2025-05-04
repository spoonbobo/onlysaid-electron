import { useUserTokenStore } from "@/stores/User/UserToken";

export const getUserTokenFromStore = () => {
  return useUserTokenStore.getState().getToken();
};

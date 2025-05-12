import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "@/../../types/User/User";
import { useUserTokenStore } from "./UserToken";
import { toast } from "@/utils/toast";

const calculateExperienceForLevel = (level: number): number => {
  return 50 * level;
};

interface UserStore {
  user: IUser | null;
  isLoading: boolean;
  error: string | null;
  timeoutId: NodeJS.Timeout | null;
  setUser: (user: IUser | null) => void;
  signIn: () => void;
  logout: () => void;
  handleAuthentication: (input: { response?: any; token?: string; cookieName?: string | null }, intl?: any) => Promise<void>;
  clearAuthTimeout: () => void;
  gainExperience: (amount: number) => Promise<void>;
  levelUp: (addedXP: number) => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      timeoutId: null,

      setUser: (user) => set({ user }),

      signIn: () => {
        const { setToken, setSignInError, setSigningIn } = useUserTokenStore.getState();

        set({ isLoading: true, error: null });
        setSignInError(null);
        setSigningIn(true);

        // @ts-ignore
        window.electron.ipcRenderer.sendMessage('auth:sign-in');

        const timeoutId = setTimeout(() => {
          set({ isLoading: false });
          setSigningIn(false);
          const errorMsg = 'Authentication timed out. Please try again.';
          set({ error: errorMsg });
          setSignInError(errorMsg);
        }, 60000);

        set({ timeoutId });
      },

      handleAuthentication: async (input: { response?: any; token?: string; cookieName?: string | null }, intl?: any) => {
        const { setToken, setSignInError, setSigningIn } = useUserTokenStore.getState();
        const { timeoutId } = get();

        console.log('[UserStore] Handling authentication...', input);
        set({ isLoading: true, error: null });

        if (timeoutId) {
          clearTimeout(timeoutId);
          set({ timeoutId: null });
        }

        setSigningIn(false);

        try {
          if (input.token) {
            const effectiveCookieName = input.cookieName || 'next-auth.session-token';
            console.log(`[UserStore] Setting token with cookieName: ${effectiveCookieName}`);

            await setToken(input.token, effectiveCookieName);

            // @ts-ignore
            await window.electron.session.setCookie({
              url: 'http://onlysaid-dev.com',
              name: effectiveCookieName,
              value: input.token,
              httpOnly: true,
              secure: true,
            });

            console.log('[UserStore] Cookie set, fetching user data...');
            // @ts-ignore
            const userDataResponse = await window.electron.user.auth({
              token: input.token,
            });

            if (userDataResponse?.data?.data) {
              const userPayload = userDataResponse.data.data;
              set({ user: userPayload, error: null, isLoading: false });
              setSignInError(null);

              const userName = userPayload.name || userPayload.username || 'User';
              const successMsg = intl ? intl.formatMessage({ id: 'toast.welcome' }, { name: userName }) : `Welcome, ${userName}!`;
              toast.success(successMsg);
              console.log('[UserStore] Authentication successful for:', userName);
              return;
            }

            throw new Error('Invalid user data received');
          }

          else if (input.response) {
            const response = input.response;

            if (response.success) {
              if (response.token && response.cookieName) {
                await setToken(response.token, response.cookieName);
              }

              if (response.userData) {
                // @ts-ignore
                const userData = await window.electron.user.auth({
                  token: response.token,
                });

                if (userData) {
                  set({ user: userData.data.data, error: null, isLoading: false });
                  setSignInError(null);

                  if (intl) {
                    toast.success(intl.formatMessage(
                      { id: 'toast.welcome' },
                      { name: userData.name }
                    ));
                  }
                  return;
                }

                throw new Error('Could not create user from provided data');
              }

              throw new Error('No user data received from authentication');
            }

            throw new Error(response.error || 'Authentication failed');
          }

          throw new Error('Invalid authentication parameters');
        } catch (error: any) {
          console.error('[UserStore] Authentication error:', error);
          const errorMsg = `Authentication failed: ${error.message || 'Please try again.'}`;
          set({ error: errorMsg, isLoading: false });
          setSignInError(errorMsg);
          setSigningIn(false);
          toast.error(errorMsg);
        }
      },

      logout: () => {
        const { clearToken } = useUserTokenStore.getState();
        set({ user: null });
        clearToken();
      },

      clearAuthTimeout: () => {
        const { timeoutId } = get();
        if (timeoutId) {
          clearTimeout(timeoutId);
          set({ timeoutId: null });
        }
      },

      gainExperience: async (amount: number) => {
        const currentUser = get().user;
        if (!currentUser) {
          console.warn("[UserStore] gainExperience called without a user. Skipping.");
          return;
        }

        const currentXP = currentUser.xp ?? 0;
        const currentLevel = currentUser.level ?? 0;

        let newExperience = currentXP + amount;
        let newLevel = currentLevel;
        let experienceToReachNext = calculateExperienceForLevel(newLevel === 0 ? 1 : newLevel);
        let leveledUp = false;

        while (newExperience >= experienceToReachNext && experienceToReachNext > 0) {
          newExperience -= experienceToReachNext;
          newLevel++;
          experienceToReachNext = calculateExperienceForLevel(newLevel);
          toast.success(`Level up! You are now level ${newLevel}!`);
          leveledUp = true;
        }

        if (newExperience === currentXP && newLevel === currentLevel && !leveledUp) {
          return;
        }

        const updatedUserObject: IUser = {
          ...currentUser,
          level: newLevel,
          xp: newExperience,
        };

        set({ user: updatedUserObject });

        try {
          const { token } = useUserTokenStore.getState();
          console.log('[UserStore] Token:', token);
          if (!token) {
            throw new Error("User token not found for backend update.");
          }
          console.log('[UserStore] Updating user on backend...', updatedUserObject);

          const response = await window.electron.user.update({
            user: updatedUserObject,
            token,
          });

          console.log('[UserStore] Response:', response);

          if (response.error) {
            throw new Error(response.error);
          }

          if (response.data?.data) {
            set({ user: response.data.data, error: null });
          } else {
            console.warn('[UserStore] Backend did not return updated user data as expected after gainExperience.');
          }

        } catch (error: any) {
          console.error('[UserStore] Failed to update user on backend after gainExperience:', error);
          toast.error(`Failed to save experience: ${error.message}`);
        }
      },

      levelUp: async (addedXP: number) => {
        const currentUser = get().user;
        if (!currentUser) {
          console.warn("[UserStore] levelUp called without a user. Skipping.");
          return;
        }
        const currentLevel = currentUser.level ?? 0;
        const newLevel = currentLevel + 1;

        const updatedUserObject: IUser = {
          ...currentUser,
          level: newLevel,
          xp: addedXP,
        };

        set({ user: updatedUserObject });
        toast.success(`Level up! You are now level ${newLevel}!`);

        try {
          const { token } = useUserTokenStore.getState();
          if (!token) {
            throw new Error("User token not found for backend update.");
          }
          // @ts-ignore
          const response = await window.electron.user.update({
            user: updatedUserObject,
            token,
          });

          if (response.error) {
            throw new Error(response.error);
          }

          if (response.data?.data) {
            set({ user: response.data.data, error: null });
          } else {
            console.warn('[UserStore] Backend did not return updated user data as expected after levelUp.');
          }

        } catch (error: any) {
          console.error('[UserStore] Failed to update user on backend after levelUp:', error);
          toast.error(`Failed to save level up: ${error.message}`);
        }
      }
    }),
    {
      name: "user-storage",
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

export const setupDeeplinkAuthListener = (intl?: any) => {
  // @ts-ignore
  if (window.electron && window.electron.ipcRenderer) {
    const channel = 'deeplink:receive-auth-token';
    const handler = (event: any, data: any) => {
      console.log(`[UserStore] IPC event "${channel}" received with data:`, data);
      if (data && data.token) {
        useUserStore.getState().handleAuthentication({ token: data.token, cookieName: data.cookieName }, intl);
      } else {
        console.warn(`[UserStore] IPC event "${channel}" received without token or data:`, data);
      }
    };

    console.log(`[UserStore] Setting up IPC listener for "${channel}"`);
    // @ts-ignore
    const removeListener = window.electron.ipcRenderer.on(channel, handler);

    return () => {
      console.log(`[UserStore] Cleaning up IPC listener for "${channel}"`);
      if (removeListener && typeof removeListener === 'function') {
        removeListener();
      }
    };
  } else {
    console.warn('[UserStore] Electron IPC renderer not available. Deeplink listener not set up.');
    return () => { };
  }
};
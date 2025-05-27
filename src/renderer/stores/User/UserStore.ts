import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "@/../../types/User/User";
import { useUserTokenStore } from "./UserToken";
import { useAgentStore } from "../Agent/AgentStore";
import { useSocketStore } from "../Socket/SocketStore";
import { toast } from "@/utils/toast";

interface UserStore {
  user: IUser | null;
  isLoading: boolean;
  error: string | null;
  timeoutId: NodeJS.Timeout | null;
  setUser: (user: IUser | null) => void;
  updateUser: (user: IUser) => void;
  signIn: () => void;
  logout: () => void;
  handleAuthentication: (input: { response?: any; token?: string; cookieName?: string | null }, intl?: any) => Promise<void>;
  clearAuthTimeout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      timeoutId: null,

      setUser: (user) => set({ user: user ? { ...user } : null }),

      signIn: () => {
        const { setSignInError, setSigningIn } = useUserTokenStore.getState();

        const existingTimeoutId = get().timeoutId;
        if (existingTimeoutId) {
          clearTimeout(existingTimeoutId);
        }

        set({ isLoading: true, error: null });
        setSignInError(null);
        setSigningIn(true);

        // @ts-ignore
        window.electron.ipcRenderer.sendMessage('auth:sign-in');

        const newTimeoutHandle = setTimeout(() => {
          if (get().timeoutId !== newTimeoutHandle) {
            return;
          }

          const errorMsg = 'Authentication timed out. Please try again.';
          set({ error: errorMsg, timeoutId: null });

          setSigningIn(false);
          setSignInError(errorMsg);
        }, 60000);

        set({ timeoutId: newTimeoutHandle });
      },

      handleAuthentication: async (input: { response?: any; token?: string; cookieName?: string | null }, intl?: any) => {
        const { setToken, setSignInError, setSigningIn, token: userToken } = useUserTokenStore.getState();
        const currentTimeoutInState = get().timeoutId;

        console.log('[UserStore] Handling authentication...', input);

        if (currentTimeoutInState) {
          clearTimeout(currentTimeoutInState);
          set({ timeoutId: null });
        }

        set({ isLoading: true, error: null });
        setSigningIn(false);

        try {
          let currentActiveToken = input.token || (input.response?.token) || userToken;

          if (!currentActiveToken && input.token) {
            currentActiveToken = input.token;
          }

          if (input.token) {
            const effectiveCookieName = input.cookieName || 'next-auth.session-token';
            console.log(`[UserStore] Setting token with cookieName: ${effectiveCookieName}`);
            currentActiveToken = input.token;
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
            const userPayload = await fetchUserData(currentActiveToken);
            console.log('[UserStore] User payload:', userPayload);

            if (userPayload) {
              set({ user: { ...userPayload }, error: null, isLoading: false });
              setSignInError(null);
              const { fetchAgent, clearAgent } = useAgentStore.getState();
              if (userPayload.agent_id && currentActiveToken) {
                await fetchAgent(userPayload.agent_id, currentActiveToken);
                console.log('[UserStore] Attempted to fetch agent for ID:', userPayload.agent_id);
              } else {
                clearAgent();
                console.warn('[UserStore] agent_id not found in userPayload or token missing. Agent not fetched.');
              }

              const userName = userPayload.username || 'User';
              const successMsg = intl ? intl.formatMessage({ id: 'toast.welcome' }, { name: userName }) : `Welcome, ${userName}!`;
              toast.success(successMsg);
              console.log('[UserStore] Authentication successful for:', userName);
              return;
            }

            const errorMsg = 'Invalid user data received';
            console.error('[UserStore] ' + errorMsg);
            toast.error(errorMsg);
            set({ error: errorMsg, isLoading: false });
            setSignInError(errorMsg);
            useAgentStore.getState().clearAgent();
            return;
          }

          else if (input.response) {
            const response = input.response;

            if (response.success) {
              if (response.token && response.cookieName) {
                currentActiveToken = response.token;
                await setToken(response.token, response.cookieName);
              }

              if (response.userData) {
                const userData = await fetchUserData(currentActiveToken);

                if (userData) {
                  const userPayload: IUser = userData;
                  set({ user: { ...userPayload }, error: null, isLoading: false });
                  setSignInError(null);
                  const { fetchAgent, clearAgent } = useAgentStore.getState();
                  if (userPayload.agent_id && currentActiveToken) {
                    await fetchAgent(userPayload.agent_id, currentActiveToken);
                    console.log('[UserStore] Attempted to fetch agent for ID (response path):', userPayload.agent_id);
                  } else {
                    clearAgent();
                    console.warn('[UserStore] agent_id not found or token missing (response path). Agent not fetched.');
                  }

                  const userName = userPayload.username || 'User';
                  if (intl) {
                    toast.success(intl.formatMessage(
                      { id: 'toast.welcome' },
                      { name: userName }
                    ));
                  }
                  console.log('[UserStore] Authentication successful for (response path):', userName);
                  return;
                }

                const errorMsg = 'Could not process user data from provided data (response path)';
                console.error('[UserStore] ' + errorMsg);
                toast.error(errorMsg);
                set({ error: errorMsg, isLoading: false });
                setSignInError(errorMsg);
                useAgentStore.getState().clearAgent();
                return;
              }

              const errorMsg = 'No user data received from authentication (response path)';
              console.error('[UserStore] ' + errorMsg);
              toast.error(errorMsg);
              set({ error: errorMsg, isLoading: false });
              setSignInError(errorMsg);
              useAgentStore.getState().clearAgent();
              return;
            }

            const errorMsg = response.error || 'Authentication failed (response path)';
            console.error('[UserStore] ' + errorMsg);
            toast.error(errorMsg);
            set({ error: errorMsg, isLoading: false });
            setSignInError(errorMsg);
            useAgentStore.getState().clearAgent();
            return;
          }

          const errorMsgInvalidParams = 'Invalid authentication parameters';
          console.error('[UserStore] ' + errorMsgInvalidParams);
          toast.error(errorMsgInvalidParams);
          set({ error: errorMsgInvalidParams, isLoading: false });
          setSignInError(errorMsgInvalidParams);
          useAgentStore.getState().clearAgent();
          return;

        } catch (error: any) {
          console.error('[UserStore] Authentication error:', error);
          const errorMsg = `Authentication failed: ${error.message || 'Please try again.'}`;
          set({ error: errorMsg, isLoading: false });
          setSignInError(errorMsg);
          toast.error(errorMsg);
          useAgentStore.getState().clearAgent();
        }
      },

      logout: () => {
        const { clearToken } = useUserTokenStore.getState();
        const { clearAgent } = useAgentStore.getState();
        const { close } = useSocketStore.getState();

        set({ user: null });
        clearToken();
        clearAgent();
        close();
      },

      clearAuthTimeout: () => {
        const { timeoutId } = get();
        if (timeoutId) {
          clearTimeout(timeoutId);
          set({ timeoutId: null });
        }
      },

      updateUser: (user: IUser) => {
        set({ user: { ...user } });
      },
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

const fetchUserData = async (token: string, retries = 3, delay = 1000) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const userDataResponse = await window.electron.user.auth({ token });
      if (userDataResponse?.data?.data) return userDataResponse.data.data;

      if (attempt < retries - 1) await new Promise(r => setTimeout(r, delay));
    } catch (error) {
      console.error(`[UserStore] Auth attempt ${attempt + 1} failed:`, error);
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, delay));
    }
  }
  return null;
}
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "@/../../types/User/User";
import { IUserDevice } from "@/../../types/User/UserDevice";
import { useUserTokenStore } from "./UserToken";
import { useAgentStore } from "../Agent/AgentStore";
import { useSocketStore } from "../Socket/SocketStore";
import { toast } from "@/utils/toast";

interface UserStore {
  user: IUser | null;
  devices: IUserDevice[];
  isLoading: boolean;
  isDevicesLoading: boolean;
  error: string | null;
  devicesError: string | null;
  timeoutId: NodeJS.Timeout | null;
  hasUpdatedLastSeenOnStartup: boolean;
  setUser: (user: IUser | null) => void;
  updateUser: (user: IUser) => void;
  signIn: () => void;
  cancelSignIn: () => void;
  logout: () => void;
  handleAuthentication: (input: { response?: any; token?: string; cookieName?: string | null }, intl?: any) => Promise<void>;
  clearAuthTimeout: () => void;
  
  // Device management actions
  fetchDevices: () => Promise<void>;
  registerDevice: (deviceId: string, deviceName?: string) => Promise<void>;
  updateDevice: (deviceId: string, deviceName?: string) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  updateDeviceLastSeen: (deviceId: string) => Promise<void>;
  clearDevices: () => void;
  updateDeviceLastSeenOnStartup: (deviceId: string) => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      devices: [],
      isLoading: false,
      isDevicesLoading: false,
      error: null,
      devicesError: null,
      timeoutId: null,
      hasUpdatedLastSeenOnStartup: false,

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
          set({ error: errorMsg, timeoutId: null, isLoading: false });
          setSigningIn(false);
          setSignInError(errorMsg);
        }, 60000);

        set({ timeoutId: newTimeoutHandle });
      },

      cancelSignIn: () => {
        const { setSignInError, setSigningIn } = useUserTokenStore.getState();
        const { timeoutId } = get();

        console.log('[UserStore] Cancelling sign-in...');

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        set({
          isLoading: false,
          error: null,
          timeoutId: null
        });
        setSigningIn(false);
        setSignInError(null);

        try {
          // @ts-ignore
          window.electron.ipcRenderer.sendMessage('auth:cancel');
        } catch (error) {
          console.warn('[UserStore] Could not notify main process of auth cancellation:', error);
        }
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

        set({ 
          user: null,
          devices: [],
          devicesError: null,
          hasUpdatedLastSeenOnStartup: false
        });
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

      // Device management actions
      fetchDevices: async () => {
        const { token } = useUserTokenStore.getState();
        if (!token) {
          set({ devicesError: 'No authentication token available' });
          return;
        }

        set({ isDevicesLoading: true, devicesError: null });

        try {
          const response = await window.electron.user.listDevices({ token });
          
          if (response.error) {
            throw new Error(response.error);
          }

          set({ 
            devices: response.data?.data || [],
            isDevicesLoading: false,
            devicesError: null
          });
        } catch (error: any) {
          console.error('[UserStore] Error fetching devices:', error);
          const errorMsg = error.message || 'Failed to fetch devices';
          set({ 
            devicesError: errorMsg,
            isDevicesLoading: false
          });
          toast.error(errorMsg);
        }
      },

      registerDevice: async (deviceId: string, deviceName?: string) => {
        const { token } = useUserTokenStore.getState();
        if (!token) {
          toast.error('No authentication token available');
          return;
        }

        try {
          const response = await window.electron.user.registerDevice({
            token,
            data: { device_id: deviceId, device_name: deviceName }
          });

          if (response.error) {
            throw new Error(response.error);
          }

          // Refresh devices list
          await get().fetchDevices();
          
          const successMsg = `Device "${deviceName || deviceId}" registered successfully`;
          toast.success(successMsg);
        } catch (error: any) {
          console.error('[UserStore] Error registering device:', error);
          const errorMsg = error.message || 'Failed to register device';
          toast.error(errorMsg);
        }
      },

      updateDevice: async (deviceId: string, deviceName?: string) => {
        const { token } = useUserTokenStore.getState();
        if (!token) {
          toast.error('No authentication token available');
          return;
        }

        try {
          const response = await window.electron.user.updateDevice({
            token,
            data: { device_id: deviceId, device_name: deviceName }
          });

          if (response.error) {
            throw new Error(response.error);
          }

          // Update local state
          set(state => ({
            devices: state.devices.map(device => 
              device.device_id === deviceId 
                ? { ...device, device_name: deviceName || device.device_name, last_seen: new Date().toISOString() }
                : device
            )
          }));

          const successMsg = `Device updated successfully`;
          toast.success(successMsg);
        } catch (error: any) {
          console.error('[UserStore] Error updating device:', error);
          const errorMsg = error.message || 'Failed to update device';
          toast.error(errorMsg);
        }
      },

      removeDevice: async (deviceId: string) => {
        const { token } = useUserTokenStore.getState();
        if (!token) {
          toast.error('No authentication token available');
          return;
        }

        try {
          const response = await window.electron.user.removeDevice({
            token,
            device_id: deviceId
          });

          if (response.error) {
            throw new Error(response.error);
          }

          // Remove from local state
          set(state => ({
            devices: state.devices.filter(device => device.device_id !== deviceId)
          }));

          toast.success('Device removed successfully');
        } catch (error: any) {
          console.error('[UserStore] Error removing device:', error);
          const errorMsg = error.message || 'Failed to remove device';
          toast.error(errorMsg);
        }
      },

      updateDeviceLastSeen: async (deviceId: string) => {
        const { token } = useUserTokenStore.getState();
        if (!token) return;

        try {
          await window.electron.user.updateDevice({
            token,
            data: { 
              device_id: deviceId,
              last_seen: new Date().toISOString()
            }
          });

          // Update local state silently (no toast for this)
          set(state => ({
            devices: state.devices.map(device => 
              device.device_id === deviceId 
                ? { ...device, last_seen: new Date().toISOString() }
                : device
            )
          }));
        } catch (error: any) {
          console.error('[UserStore] Error updating device last seen:', error);
          // Don't show toast for this background operation
        }
      },

      clearDevices: () => {
        set({ 
          devices: [],
          devicesError: null,
          isDevicesLoading: false
        });
      },

      updateDeviceLastSeenOnStartup: async (deviceId: string) => {
        const { token } = useUserTokenStore.getState();
        if (!token || get().hasUpdatedLastSeenOnStartup) return;

        try {
          await window.electron.user.updateDevice({
            token,
            data: { 
              device_id: deviceId,
              last_seen: new Date().toISOString()
            }
          });

          // Update local state silently (no toast for this)
          set(state => ({
            devices: state.devices.map(device => 
              device.device_id === deviceId 
                ? { ...device, last_seen: new Date().toISOString() }
                : device
            ),
            hasUpdatedLastSeenOnStartup: true
          }));
          
          console.log('[UserStore] Updated last seen for current device on startup');
        } catch (error: any) {
          console.error('[UserStore] Error updating device last seen on startup:', error);
        }
      },
    }),
    {
      name: "user-storage",
      partialize: (state) => ({
        user: state.user,
        devices: state.devices,
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
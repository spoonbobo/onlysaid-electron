import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "@/../../types/User/User";
import { IUserDevice } from "@/../../types/User/UserDevice";
import { useUserTokenStore } from "./UserToken";
import { useAgentStore } from "../Agent/AgentStore";
import { useSocketStore } from "../Socket/SocketStore";
import { useCryptoStore } from "../Crypto/CryptoStore";
import { toast } from "@/utils/toast";
import { useTopicStore } from "../Topic/TopicStore";
import { createNotificationsForUnreadMessages } from '@/utils/notifications';

interface UserStore {
  user: IUser | null;
  devices: IUserDevice[];
  isLoading: boolean;
  isDevicesLoading: boolean;
  error: string | null;
  devicesError: string | null;
  timeoutId: NodeJS.Timeout | null;
  hasUpdatedLastSeenOnStartup: boolean;
  showDisclaimer: boolean;
  healthCheckCleanup: (() => void) | null;
  
  setUser: (user: IUser | null) => void;
  updateUser: (user: IUser) => void;
  signIn: () => void;
  cancelSignIn: () => void;
  logout: () => void;
  handleAuthentication: (input: { response?: any; token?: string; cookieName?: string | null }, intl?: any) => Promise<void>;
  clearAuthTimeout: () => void;
  ensureCryptoUnlocked: () => Promise<void>;
  setShowDisclaimer: (show: boolean) => void;
  isFirstLogin: (user: IUser) => boolean;
  
  // Device management actions
  fetchDevices: () => Promise<void>;
  registerDevice: (deviceId: string, deviceName?: string) => Promise<void>;
  updateDevice: (deviceId: string, deviceName?: string) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  updateDeviceLastSeen: (deviceId: string) => Promise<void>;
  clearDevices: () => void;
  updateDeviceLastSeenOnStartup: (deviceId: string) => Promise<void>;
  autoRegisterDeviceOnConnect: () => Promise<void>;
  startHealthCheck: () => void;
  stopHealthCheck: () => void;
  handleHealthCheckFailure: () => void;
  checkHealthStatus: () => Promise<void>;
  testHealthCheck: () => Promise<void>;
  startHealthCheckIfLoggedIn: () => void;
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
      showDisclaimer: false,
      healthCheckCleanup: null,

      setUser: (user) => {
        set({ user: user ? { ...user } : null });
        
        if (!user) {
          // Stop health check when user is null
          get().stopHealthCheck();
          
          const { createGuestAgent } = useAgentStore.getState();
          createGuestAgent();
          console.log('[UserStore] User set to null, stopping health check, initializing guest agent');
        } else {
          // Start health check when user is set
          console.log('[UserStore] User set, will start health check');
          setTimeout(() => {
            get().startHealthCheckIfLoggedIn();
          }, 1000);
        }
      },

      isFirstLogin: (user: IUser) => {
        if (!user.created_at || !user.last_login) {
          return false;
        }
        
        const createdAt = new Date(user.created_at);
        const lastLogin = new Date(user.last_login);
        const diffInMinutes = (lastLogin.getTime() - createdAt.getTime()) / (1000 * 60);
        
        return diffInMinutes < 1;
      },

      setShowDisclaimer: (show: boolean) => {
        set({ showDisclaimer: show });
      },

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
              // Check if this is a first login
              const isFirstLogin = get().isFirstLogin(userPayload);
              
              set({ 
                user: { ...userPayload }, 
                error: null, 
                isLoading: false,
                showDisclaimer: isFirstLogin
              });
              setSignInError(null);
              
              // If first login, show disclaimer and return early
              if (isFirstLogin) {
                console.log('[UserStore] First login detected, showing disclaimer');
                return;
              }
              
              // Continue with normal login flow
              // Fetch agent
              const { fetchAgent, clearAgent } = useAgentStore.getState();
              if (userPayload.agent_id && currentActiveToken) {
                await fetchAgent(userPayload.agent_id, currentActiveToken);
                console.log('[UserStore] Attempted to fetch agent for ID:', userPayload.agent_id);
              } else {
                clearAgent();
                console.warn('[UserStore] agent_id not found in userPayload or token missing. Agent not fetched.');
              }

              // Auto-unlock encryption when user logs in
              console.log('[UserStore] 🔐 Auto-unlocking encryption...');
              const { unlockForUser } = useCryptoStore.getState();
              const cryptoSuccess = await unlockForUser(userPayload.id!, currentActiveToken);
              
              if (cryptoSuccess) {
                console.log('[UserStore] ✅ Encryption unlocked');

                // Add this after the encryption unlock and before navigation
                console.log('[UserStore] 🔔 Creating notifications for unread messages...');
                setTimeout(() => {
                  createNotificationsForUnreadMessages();
                }, 2000); // Delay slightly to ensure database is ready

                // Navigate to home after successful login
                console.log('[UserStore] 🏠 Navigating to home after successful login...');
                const { setSelectedContext } = useTopicStore.getState();
                setSelectedContext({ name: "home", type: "home", section: "homepage" });

                const userName = userPayload.username || 'User';
                const successMsg = intl ? intl.formatMessage({ id: 'toast.welcome' }, { name: userName }) : `Welcome, ${userName}!`;
                // toast.success(successMsg);
                console.log('[UserStore] Authentication successful for:', userName);

                // Start health check after successful login
                setTimeout(() => {
                  console.log('[UserStore] 🔍 Starting health check after successful authentication...');
                  get().startHealthCheckIfLoggedIn();
                }, 2000);

                return;
              } else {
                console.warn('[UserStore] ⚠️ Encryption failed to unlock');
              }

              // Navigate to home after successful login
              console.log('[UserStore] 🏠 Navigating to home after successful login...');
              const { setSelectedContext } = useTopicStore.getState();
              setSelectedContext({ name: "home", type: "home", section: "homepage" });

              const userName = userPayload.username || 'User';
              const successMsg = intl ? intl.formatMessage({ id: 'toast.welcome' }, { name: userName }) : `Welcome, ${userName}!`;
              // toast.success(successMsg);
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

                  // Auto-unlock encryption when user logs in (response path)
                  console.log('[UserStore] 🔐 Auto-unlocking encryption (response path)...');
                  const { unlockForUser } = useCryptoStore.getState();
                  const cryptoSuccess = await unlockForUser(userPayload.id!, currentActiveToken);
                  
                  if (cryptoSuccess) {
                    console.log('[UserStore] ✅ Encryption unlocked (response path)');

                    // Add this after the encryption unlock and before navigation
                    console.log('[UserStore] 🔔 Creating notifications for unread messages (response path)...');
                    setTimeout(() => {
                      createNotificationsForUnreadMessages();
                    }, 2000);

                    // Navigate to home after successful login (response path)
                    console.log('[UserStore] 🏠 Navigating to home after successful login (response path)...');
                    const { setSelectedContext } = useTopicStore.getState();
                    setSelectedContext({ name: "home", type: "home", section: "homepage" });

                    const userName = userPayload.username || 'User';
                    if (intl) {
                      toast.success(intl.formatMessage(
                        { id: 'toast.welcome' },
                        { name: userName }
                      ));
                    }
                    console.log('[UserStore] Authentication successful for (response path):', userName);

                    // Start health check after successful login
                    setTimeout(() => {
                      console.log('[UserStore] 🔍 Starting health check after successful authentication...');
                      get().startHealthCheckIfLoggedIn();
                    }, 2000);

                    return;
                  } else {
                    console.warn('[UserStore] ⚠️ Encryption failed to unlock (response path)');
                  }

                  // Navigate to home after successful login (response path)
                  console.log('[UserStore] 🏠 Navigating to home after successful login (response path)...');
                  const { setSelectedContext } = useTopicStore.getState();
                  setSelectedContext({ name: "home", type: "home", section: "homepage" });

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
        const { createGuestAgent } = useAgentStore.getState();
        const { close } = useSocketStore.getState();
        const { lockCrypto } = useCryptoStore.getState();

        // Stop health check first
        get().stopHealthCheck();

        set({ 
          user: null,
          devices: [],
          devicesError: null,
          hasUpdatedLastSeenOnStartup: false,
          healthCheckCleanup: null,
        });
        clearToken();
        createGuestAgent();
        lockCrypto();
        close();
        
        console.log('[UserStore] User logged out, health check stopped, guest agent initialized');
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

        // Only show loading for initial fetch or when no devices exist
        const currentDevices = get().devices;
        const shouldShowLoading = currentDevices.length === 0;
        
        set({ 
          isDevicesLoading: shouldShowLoading, 
          devicesError: null 
        });

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

      autoRegisterDeviceOnConnect: async () => {
        const { user } = get();
        const { token } = useUserTokenStore.getState();
        
        if (!user || !token) return;

        try {
          const [deviceId, deviceInfo] = await Promise.all([
            window.electron.app.getDeviceId(),
            window.electron.app.getDeviceInfo()
          ]);

          // Check if device exists
          const devices = get().devices;
          const deviceExists = devices.some(device => device.device_id === deviceId);

          if (!deviceExists) {
            // Register device
            const deviceName = `${formatPlatform(deviceInfo.platform)} - ${deviceInfo.hostname}`;
            await get().registerDevice(deviceId, deviceName);
          } else {
            // Just update last seen
            await get().updateDeviceLastSeenOnStartup(deviceId);
          }
        } catch (error) {
          console.error('[UserStore] Error auto-registering device:', error);
        }
      },

      clearAuthTimeout: () => {
        const { timeoutId } = get();
        if (timeoutId) {
          clearTimeout(timeoutId);
          set({ timeoutId: null });
        }
      },

      ensureCryptoUnlocked: async () => {
        const { user } = get();
        const { token } = useUserTokenStore.getState();
        const { isUnlocked, unlockForUser } = useCryptoStore.getState();
        
        if (user?.id && token && !isUnlocked) {
          console.log('[UserStore] 🔐 User logged in but crypto locked, auto-unlocking...');
          try {
            const success = await unlockForUser(user.id, token);
            if (success) {
              console.log('[UserStore] ✅ Crypto auto-unlocked for existing user');
            } else {
              console.warn('[UserStore] ⚠️ Failed to auto-unlock crypto for existing user');
            }
          } catch (error) {
            console.error('[UserStore] ❌ Error auto-unlocking crypto for existing user:', error);
          }
        } else if (user?.id && token && isUnlocked) {
          console.log('[UserStore] ✅ Crypto already unlocked for user');
        } else {
          console.log('[UserStore] ⚠️ Cannot unlock crypto:', { hasUser: !!user?.id, hasToken: !!token, isUnlocked });
        }
      },

      startHealthCheck: () => {
        const { user } = get();
        const { token } = useUserTokenStore.getState();
        
        if (!user || !token) {
          console.warn('[UserStore] Cannot start health check - no user or token');
          return;
        }

        console.log('[UserStore] Starting health check for user:', user.username);
        console.log('[UserStore] Token preview:', token.substring(0, 10) + '...');
        
        // Start periodic health check
        window.electron.healthCheck.startPeriodicCheck(token);
        
        // Set up health check failure listener
        const cleanup = window.electron.healthCheck.onHealthCheckFailed(() => {
          console.warn('[UserStore] 🚨 Health check failed event received!');
          get().handleHealthCheckFailure();
        });
        
        set({ healthCheckCleanup: cleanup });
        
        // Check status after starting
        setTimeout(() => {
          get().checkHealthStatus();
        }, 1000);
      },

      stopHealthCheck: () => {
        const { healthCheckCleanup } = get();
        
        console.log('[UserStore] Stopping health check');
        
        // Stop periodic health check
        window.electron.healthCheck.stopPeriodicCheck();
        
        // Clean up listener
        if (healthCheckCleanup) {
          healthCheckCleanup();
          set({ healthCheckCleanup: null });
        }
      },

      handleHealthCheckFailure: () => {
        const { user } = get();
        
        console.log('[UserStore] 🚨 handleHealthCheckFailure called');
        console.log('[UserStore] Current user:', user?.username || 'none');
        
        // Only handle logout if user is actually logged in
        if (!user) {
          console.log('[UserStore] Health check failed but no user logged in, ignoring');
          return;
        }
        
        console.warn('[UserStore] 🚨 Health check failed - user session is invalid');
        
        // Show notification to user
        toast.error('Your session has expired. Please sign in again.');
        
        // Log out the user
        get().logout();
        
        // Navigate to home screen
        const { setSelectedContext } = useTopicStore.getState();
        setSelectedContext({ name: "home", type: "home", section: "homepage" });
      },

      checkHealthStatus: async () => {
        try {
          const status = await window.electron.healthCheck.isRunning();
          console.log('[UserStore] Health check status:', status);
          
          const { user } = get();
          const { token } = useUserTokenStore.getState();
          console.log('[UserStore] Current user:', user?.username || 'none');
          console.log('[UserStore] Has token:', !!token);
        } catch (error) {
          console.error('[UserStore] Error checking health status:', error);
        }
      },

      testHealthCheck: async () => {
        const { user } = get();
        const { token } = useUserTokenStore.getState();
        
        if (!user || !token) {
          console.warn('[UserStore] Cannot test health check - no user or token');
          return;
        }
        
        console.log('[UserStore] Testing health check manually...');
        try {
          const result = await window.electron.healthCheck.checkHealth(token);
          console.log('[UserStore] Manual health check result:', result);
        } catch (error) {
          console.error('[UserStore] Manual health check error:', error);
        }
      },

      startHealthCheckIfLoggedIn: () => {
        const { user } = get();
        const { token } = useUserTokenStore.getState();
        
        if (!user || !token) {
          console.log('[UserStore] No user logged in, skipping health check');
          return;
        }
        
        console.log('[UserStore] User is logged in, starting health check');
        get().startHealthCheck();
      },
    }),
    {
      name: "user-storage",
      partialize: (state) => ({
        user: state.user,
        devices: state.devices,
      }),
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (!error && state?.user) {
            console.log('[UserStore] Rehydrated with user, starting health check');
            setTimeout(() => {
              state.startHealthCheckIfLoggedIn();
            }, 2000); // Give time for token store to rehydrate
          }
        };
      },
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

function formatPlatform(platform: string): string {
  const platformMap: Record<string, string> = {
    'win32': 'Windows',
    'darwin': 'macOS',
    'linux': 'Linux'
  };
  return platformMap[platform] || platform;
}
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GoogleCalendarUser {
  email: string;
  name?: string;
}

interface MicrosoftCalendarUser {
  email: string;
  name?: string;
}

interface N8nUser {
  apiUrl: string;
  apiKey: string;
}

interface MoodleUser {
  fullname: string;
  email: string;
  sitename: string;
}

interface UserTokenStore {
  token: string | null;
  cookieName: string | null;
  isSigningIn: boolean;
  signInError: string | null;

  // Google Calendar state
  googleCalendarToken: string | null;
  googleCalendarConnected: boolean;
  googleCalendarUser: GoogleCalendarUser | null;
  googleCalendarConnecting: boolean;
  googleCalendarError: string | null;

  // Microsoft Calendar state
  microsoftCalendarToken: string | null;
  microsoftCalendarRefreshToken: string | null;
  microsoftCalendarConnected: boolean;
  microsoftCalendarUser: MicrosoftCalendarUser | null;
  microsoftCalendarConnecting: boolean;
  microsoftCalendarError: string | null;

  // N8n state
  n8nApiUrl: string;
  n8nApiKey: string;
  n8nConnected: boolean;
  n8nConnecting: boolean;
  n8nError: string | null;
  n8nVerified: boolean;
  lastN8nHealthCheck: number | null;

  // Add retry tracking for N8n health checks
  n8nHealthCheckFailures: number;
  n8nMaxRetries: number;
  n8nRetryDelay: number;

  // Original methods
  getToken: () => string | null;
  setToken: (token: string | null, cookieName: string | null) => void;
  clearToken: () => void;
  setSigningIn: (isSigningIn: boolean) => void;
  setSignInError: (error: string | null) => void;

  // Google Calendar methods
  connectGoogleCalendar: () => Promise<void>;
  disconnectGoogleCalendar: () => void;
  setGoogleCalendarConnecting: (connecting: boolean) => void;
  setGoogleCalendarError: (error: string | null) => void;
  setGoogleCalendarConnected: (connected: boolean, user: GoogleCalendarUser | null, token: string | null) => void;
  initializeGoogleCalendarListeners: () => () => void;

  // Microsoft Calendar methods
  connectMicrosoftCalendar: () => Promise<void>;
  disconnectMicrosoftCalendar: () => void;
  setMicrosoftCalendarConnecting: (connecting: boolean) => void;
  setMicrosoftCalendarError: (error: string | null) => void;
  setMicrosoftCalendarConnected: (connected: boolean, user: MicrosoftCalendarUser | null, token: string | null, refreshToken?: string | null) => void;
  initializeMicrosoftCalendarListeners: () => () => void;

  // N8n methods
  setN8nApiUrl: (url: string) => void;
  setN8nApiKey: (key: string) => void;
  connectN8n: () => Promise<void>;
  disconnectN8n: () => void;
  setN8nConnecting: (connecting: boolean) => void;
  setN8nError: (error: string | null) => void;
  setN8nConnected: (connected: boolean) => void;
  setN8nVerified: (verified: boolean) => void;
  testN8nConnection: () => Promise<boolean>;
  validateN8nConnection: () => Promise<boolean>;
  initializeN8nListeners: () => () => void;

  // New health check properties
  lastGoogleHealthCheck: number | null;
  lastMicrosoftHealthCheck: number | null;
  healthCheckInterval: number; // 5 minutes default

  // New methods
  validateGoogleToken: () => Promise<boolean>;
  validateMicrosoftToken: () => Promise<boolean>;
  performHealthCheck: () => Promise<void>;
  startPeriodicHealthCheck: () => () => void;
  refreshMicrosoftToken: () => Promise<boolean>;

  // Add these methods to access N8n workflows
  getN8nWorkflows: () => Promise<{ success: boolean; error?: string; workflows?: any[] }>;
  toggleN8nWorkflow: (workflowId: string, active: boolean) => Promise<{ success: boolean; error?: string; workflow?: any }>;

  // Add new method for manual disconnect only
  forceDisconnectN8n: () => void;
}

export const useUserTokenStore = create<UserTokenStore>()(
  persist(
    (set, get) => ({
      token: null,
      cookieName: null,
      isSigningIn: false,
      signInError: null,

      // Google Calendar state
      googleCalendarToken: null,
      googleCalendarConnected: false,
      googleCalendarUser: null,
      googleCalendarConnecting: false,
      googleCalendarError: null,

      // Microsoft Calendar state
      microsoftCalendarToken: null,
      microsoftCalendarRefreshToken: null,
      microsoftCalendarConnected: false,
      microsoftCalendarUser: null,
      microsoftCalendarConnecting: false,
      microsoftCalendarError: null,

      // N8n state
      n8nApiUrl: "",
      n8nApiKey: "",
      n8nConnected: false,
      n8nConnecting: false,
      n8nError: null,
      n8nVerified: false,
      lastN8nHealthCheck: null,
      
      // Add retry tracking
      n8nHealthCheckFailures: 0,
      n8nMaxRetries: 3, // Allow 3 failures before giving up
      n8nRetryDelay: 30000, // 30 seconds between retries

      // New health check state
      lastGoogleHealthCheck: null,
      lastMicrosoftHealthCheck: null,
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes

      // Original methods
      getToken: () => get().token,
      setToken: (token, cookieName) => set({
        token,
        cookieName,
        isSigningIn: false,
        signInError: null
      }),
      clearToken: () => set({
        token: null,
        cookieName: null
      }),
      setSigningIn: (isSigningIn) => set({ isSigningIn }),
      setSignInError: (signInError) => set({
        signInError,
        isSigningIn: false
      }),

      // Google Calendar methods
      connectGoogleCalendar: async () => {
        console.log('[Google Calendar] Starting connection...');
        set({ googleCalendarConnecting: true, googleCalendarError: null });

        try {
          // Check if electron API is available
          if (!(window as any).electron?.googleAuth?.requestCalendar) {
            throw new Error('Google Auth API not available');
          }

          // Request Google Calendar OAuth from main process
          console.log('[Google Calendar] Calling requestCalendar...');
          (window as any).electron.googleAuth.requestCalendar();

          // Set a timeout to prevent infinite loading
          setTimeout(() => {
            const state = get();
            if (state.googleCalendarConnecting) {
              console.warn('[Google Calendar] Connection timeout');
              set({
                googleCalendarConnecting: false,
                googleCalendarError: 'Connection timeout. Please try again.'
              });
            }
          }, 30000); // 30 seconds timeout

        } catch (error) {
          console.error('[Google Calendar] Failed to initiate authentication:', error);
          set({
            googleCalendarError: error instanceof Error ? error.message : 'Failed to start authentication',
            googleCalendarConnecting: false
          });
        }
      },

      disconnectGoogleCalendar: () => {
        console.log('[Google Calendar] Disconnecting...');
        // Notify main process to clear tokens
        (window as any).electron?.googleAuth?.disconnect();

        // Clear local state
        set({
          googleCalendarConnected: false,
          googleCalendarUser: null,
          googleCalendarToken: null,
          googleCalendarError: null
        });
      },

      setGoogleCalendarConnecting: (connecting) => set({ googleCalendarConnecting: connecting }),
      setGoogleCalendarError: (error) => set({ googleCalendarError: error }),
      setGoogleCalendarConnected: (connected, user, token) => set({
        googleCalendarConnected: connected,
        googleCalendarUser: user,
        googleCalendarToken: token
      }),

      initializeGoogleCalendarListeners: () => {
        const handleGoogleAuthResult = (event: any, result: any) => {
          console.log('[Google Calendar] Received result:', result);
          if (result.success) {
            set({
              googleCalendarConnected: true,
              googleCalendarUser: { email: result.userInfo.email, name: result.userInfo.name },
              googleCalendarToken: result.accessToken,
              googleCalendarConnecting: false,
              googleCalendarError: null
            });
          } else {
            console.error('[Google Calendar] Authentication failed:', result.error);
            set({
              googleCalendarError: result.error || 'Authentication failed',
              googleCalendarConnecting: false
            });
          }
        };

        const handleDisconnected = (event: any, result: any) => {
          console.log('[Google Calendar] Disconnected result:', result);
          if (result.success) {
            set({
              googleCalendarConnected: false,
              googleCalendarUser: null,
              googleCalendarToken: null,
              googleCalendarError: null
            });
          }
        };

        // Check if electron API is available
        if (!(window as any).electron?.googleAuth) {
          console.error('[Google Calendar] Electron API not available');
          set({ googleCalendarError: 'Google Auth API not available' });
          return () => { };
        }

        // Listen for auth result from main process
        const cleanupResult = (window as any).electron.googleAuth.onResult(handleGoogleAuthResult);
        const cleanupDisconnected = (window as any).electron.googleAuth.onDisconnected(handleDisconnected);

        // Return cleanup function
        return () => {
          cleanupResult?.();
          cleanupDisconnected?.();
        };
      },

      // Microsoft Calendar methods
      connectMicrosoftCalendar: async () => {
        console.log('[Microsoft Calendar] Starting connection...');
        set({ microsoftCalendarConnecting: true, microsoftCalendarError: null });

        try {
          // Check if electron API is available
          if (!(window as any).electron?.microsoftAuth?.requestCalendar) {
            throw new Error('Microsoft Auth API not available');
          }

          // Request Microsoft Calendar OAuth from main process
          console.log('[Microsoft Calendar] Calling requestCalendar...');
          (window as any).electron.microsoftAuth.requestCalendar();

          // Set a timeout to prevent infinite loading
          setTimeout(() => {
            const state = get();
            if (state.microsoftCalendarConnecting) {
              console.warn('[Microsoft Calendar] Connection timeout');
              set({
                microsoftCalendarConnecting: false,
                microsoftCalendarError: 'Connection timeout. Please try again.'
              });
            }
          }, 30000); // 30 seconds timeout

        } catch (error) {
          console.error('[Microsoft Calendar] Failed to initiate authentication:', error);
          set({
            microsoftCalendarError: error instanceof Error ? error.message : 'Failed to start authentication',
            microsoftCalendarConnecting: false
          });
        }
      },

      disconnectMicrosoftCalendar: () => {
        console.log('[Microsoft Calendar] Disconnecting...');
        // Notify main process to clear tokens
        (window as any).electron?.microsoftAuth?.disconnect();

        // Clear local state
        set({
          microsoftCalendarConnected: false,
          microsoftCalendarUser: null,
          microsoftCalendarToken: null,
          microsoftCalendarRefreshToken: null,
          microsoftCalendarError: null
        });
      },

      setMicrosoftCalendarConnecting: (connecting) => set({ microsoftCalendarConnecting: connecting }),
      setMicrosoftCalendarError: (error) => set({ microsoftCalendarError: error }),
      setMicrosoftCalendarConnected: (connected, user, token, refreshToken) => set({
        microsoftCalendarConnected: connected,
        microsoftCalendarUser: user,
        microsoftCalendarToken: token,
        microsoftCalendarRefreshToken: refreshToken
      }),

      initializeMicrosoftCalendarListeners: () => {
        const handleMicrosoftAuthResult = (event: any, result: any) => {
          console.log('[Microsoft Calendar] Received result:', result);
          console.log('[Microsoft Calendar] Token Types:');
          console.log('- Access Token length:', result.accessToken?.length);
          console.log('- Access Token start:', result.accessToken?.substring(0, 20));
          console.log('- Refresh Token length:', result.refreshToken?.length);
          console.log('- Refresh Token start:', result.refreshToken?.substring(0, 20));
          if (result.success) {
            set({
              microsoftCalendarConnected: true,
              microsoftCalendarUser: {
                email: result.userInfo.mail || result.userInfo.userPrincipalName,
                name: result.userInfo.displayName
              },
              microsoftCalendarToken: result.accessToken,
              microsoftCalendarRefreshToken: result.refreshToken,
              microsoftCalendarConnecting: false,
              microsoftCalendarError: null
            });
          } else {
            console.error('[Microsoft Calendar] Authentication failed:', result.error);
            set({
              microsoftCalendarError: result.error || 'Authentication failed',
              microsoftCalendarConnecting: false
            });
          }
        };

        const handleDisconnected = (event: any, result: any) => {
          console.log('[Microsoft Calendar] Disconnected result:', result);
          if (result.success) {
            set({
              microsoftCalendarConnected: false,
              microsoftCalendarUser: null,
              microsoftCalendarToken: null,
              microsoftCalendarRefreshToken: null,
              microsoftCalendarError: null
            });
          }
        };

        // Check if electron API is available
        if (!(window as any).electron?.microsoftAuth) {
          console.error('[Microsoft Calendar] Electron API not available');
          set({ microsoftCalendarError: 'Microsoft Auth API not available' });
          return () => { };
        }

        // Listen for auth result from main process
        const cleanupResult = (window as any).electron.microsoftAuth.onResult(handleMicrosoftAuthResult);
        const cleanupDisconnected = (window as any).electron.microsoftAuth.onDisconnected(handleDisconnected);

        // Return cleanup function
        return () => {
          cleanupResult?.();
          cleanupDisconnected?.();
        };
      },

      // N8n methods
      setN8nApiUrl: (url) => {
        set({ n8nApiUrl: url, n8nVerified: false });
      },
      setN8nApiKey: (key) => {
        set({ n8nApiKey: key, n8nVerified: false });
      },
      
      setN8nVerified: (verified) => set({ n8nVerified: verified }),

      testN8nConnection: async () => {
        const { n8nApiUrl, n8nApiKey } = get();
        if (!n8nApiUrl || !n8nApiKey) {
          set({ n8nVerified: false });
          return false;
        }

        try {
          // Use Electron's main process to make the API call
          if (!(window as any).electron?.n8nApi?.testConnection) {
            throw new Error('N8n API not available');
          }

          const result = await (window as any).electron.n8nApi.testConnection({
            apiUrl: n8nApiUrl,
            apiKey: n8nApiKey
          });

          if (result.success) {
            set({ n8nVerified: true, n8nError: null });
            return true;
          } else {
            set({ 
              n8nVerified: false,
              n8nError: result.error || 'Connection test failed'
            });
            return false;
          }
        } catch (error) {
          console.error('[N8n] Connection test error:', error);
          set({ 
            n8nVerified: false,
            n8nError: error instanceof Error ? error.message : 'Failed to test N8n connection' 
          });
          return false;
        }
      },
      
      connectN8n: async () => {
        const { n8nApiUrl, n8nApiKey, n8nVerified } = get();
        if (!n8nApiUrl || !n8nApiKey) return;

        // Require verification before connecting
        if (!n8nVerified) {
          set({ n8nError: 'Please verify your connection first.' });
          return;
        }

        console.log('[N8n] Starting connection...');
        set({ n8nConnecting: true, n8nError: null });

        try {
          // Since we already verified, we can connect directly
          set({
            n8nConnected: true,
            n8nConnecting: false,
            n8nError: null,
            lastN8nHealthCheck: Date.now()
          });
        } catch (error) {
          console.error('[N8n] Failed to connect:', error);
          set({
            n8nError: error instanceof Error ? error.message : 'Failed to connect to N8n',
            n8nConnecting: false
          });
        }
      },

      disconnectN8n: () => {
        console.log('[N8n] Disconnecting (preserving credentials)...');
        set({
          n8nConnected: false,
          // Don't clear credentials anymore
          // n8nApiUrl: "",
          // n8nApiKey: "",
          n8nError: null,
          n8nVerified: false,
          lastN8nHealthCheck: null,
          n8nHealthCheckFailures: 0, // Reset failure count
        });
      },

      setN8nConnecting: (connecting) => set({ n8nConnecting: connecting }),
      setN8nError: (error) => set({ n8nError: error }),
      setN8nConnected: (connected) => set({ n8nConnected: connected }),

      validateN8nConnection: async () => {
        const { n8nApiUrl, n8nApiKey, n8nHealthCheckFailures, n8nMaxRetries } = get();
        if (!n8nApiUrl || !n8nApiKey) return false;

        try {
          // Use Electron's main process to make the API call
          if (!(window as any).electron?.n8nApi?.testConnection) {
            console.error('[N8n] N8n API not available');
            // Don't disconnect immediately, just mark as unhealthy
            set({ 
              n8nError: 'N8n API not available',
              n8nHealthCheckFailures: n8nHealthCheckFailures + 1
            });
            
            // Only disconnect after max retries
            if (n8nHealthCheckFailures + 1 >= n8nMaxRetries) {
              console.warn(`[N8n] Max retries (${n8nMaxRetries}) reached, disconnecting`);
              get().disconnectN8n();
            }
            return false;
          }

          const result = await (window as any).electron.n8nApi.testConnection({
            apiUrl: n8nApiUrl,
            apiKey: n8nApiKey
          });

          if (result.success) {
            // Reset failure count on success
            set({ 
              lastN8nHealthCheck: Date.now(),
              n8nHealthCheckFailures: 0,
              n8nError: null
            });
            return true;
          } else {
            console.warn('[N8n] Connection validation failed:', result.error);
            const newFailureCount = n8nHealthCheckFailures + 1;
            
            set({ 
              n8nError: `Health check failed: ${result.error} (${newFailureCount}/${n8nMaxRetries})`,
              n8nHealthCheckFailures: newFailureCount
            });
            
            // Only disconnect after max retries
            if (newFailureCount >= n8nMaxRetries) {
              console.warn(`[N8n] Max retries (${n8nMaxRetries}) reached, disconnecting`);
              get().disconnectN8n();
            }
            return false;
          }
        } catch (error) {
          console.error('[N8n] Connection validation error:', error);
          const newFailureCount = n8nHealthCheckFailures + 1;
          
          set({ 
            n8nError: `Health check error: ${error instanceof Error ? error.message : 'Unknown error'} (${newFailureCount}/${n8nMaxRetries})`,
            n8nHealthCheckFailures: newFailureCount
          });
          
          // Only disconnect after max retries
          if (newFailureCount >= n8nMaxRetries) {
            console.warn(`[N8n] Max retries (${n8nMaxRetries}) reached, disconnecting`);
            get().disconnectN8n();
          }
          return false;
        }
      },

      initializeN8nListeners: () => {
        // N8n doesn't need special electron listeners like OAuth services
        // Return empty cleanup function
        return () => {};
      },

      // New health check methods
      validateGoogleToken: async () => {
        const token = get().googleCalendarToken;
        if (!token) return false;

        try {
          // Simple API call to validate token
          const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });

          const isValid = response.ok;

          if (!isValid) {
            console.warn('[Google Token] Token validation failed, disconnecting');
            get().disconnectGoogleCalendar();
          } else {
            set({ lastGoogleHealthCheck: Date.now() });
          }

          return isValid;
        } catch (error) {
          console.error('[Google Token] Validation error:', error);
          get().disconnectGoogleCalendar();
          return false;
        }
      },

      validateMicrosoftToken: async () => {
        const token = get().microsoftCalendarToken;
        const refreshToken = get().microsoftCalendarRefreshToken;

        if (!token) return false;

        try {
          // Simple API call to validate token
          const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });

          if (response.ok) {
            set({ lastMicrosoftHealthCheck: Date.now() });
            return true;
          }

          // If token is invalid and we have refresh token, try to refresh
          if (response.status === 401 && refreshToken) {
            console.log('[Microsoft Token] Token expired, attempting refresh...');
            const refreshed = await get().refreshMicrosoftToken();
            if (refreshed) {
              set({ lastMicrosoftHealthCheck: Date.now() });
              return true;
            }
          }

          console.warn('[Microsoft Token] Token validation failed, disconnecting');
          get().disconnectMicrosoftCalendar();
          return false;
        } catch (error) {
          console.error('[Microsoft Token] Validation error:', error);

          // Try refresh if we have refresh token
          if (refreshToken) {
            const refreshed = await get().refreshMicrosoftToken();
            if (refreshed) {
              set({ lastMicrosoftHealthCheck: Date.now() });
              return true;
            }
          }

          get().disconnectMicrosoftCalendar();
          return false;
        }
      },

      refreshMicrosoftToken: async () => {
        const refreshToken = get().microsoftCalendarRefreshToken;
        if (!refreshToken) return false;

        try {
          const result = await (window as any).electron?.microsoftAuth?.refreshToken(refreshToken);

          if (result?.success) {
            console.log('[Microsoft Token] Token refreshed successfully');
            set({
              microsoftCalendarToken: result.accessToken,
              microsoftCalendarRefreshToken: result.refreshToken || refreshToken,
            });
            return true;
          } else {
            console.error('[Microsoft Token] Refresh failed:', result?.error);
            return false;
          }
        } catch (error) {
          console.error('[Microsoft Token] Refresh error:', error);
          return false;
        }
      },

      performHealthCheck: async () => {
        const state = get();
        const now = Date.now();

        // Check Google token if connected and not recently checked
        if (state.googleCalendarConnected &&
          (!state.lastGoogleHealthCheck ||
            now - state.lastGoogleHealthCheck > state.healthCheckInterval)) {
          await get().validateGoogleToken();
        }

        // Check Microsoft token if connected and not recently checked
        if (state.microsoftCalendarConnected &&
          (!state.lastMicrosoftHealthCheck ||
            now - state.lastMicrosoftHealthCheck > state.healthCheckInterval)) {
          await get().validateMicrosoftToken();
        }

        // Check N8n connection if connected and not recently checked
        if (state.n8nConnected &&
          (!state.lastN8nHealthCheck ||
            now - state.lastN8nHealthCheck > state.healthCheckInterval)) {
          await get().validateN8nConnection();
        }
      },

      startPeriodicHealthCheck: () => {
        const interval = setInterval(() => {
          get().performHealthCheck();
        }, get().healthCheckInterval);

        // Return cleanup function
        return () => clearInterval(interval);
      },

      // Add these methods to access N8n workflows
      getN8nWorkflows: async () => {
        const { n8nApiUrl, n8nApiKey } = get();
        if (!n8nApiUrl || !n8nApiKey) return { success: false, error: 'Not connected' };
        
        return await (window as any).electron?.n8nApi?.getWorkflows({ apiUrl: n8nApiUrl, apiKey: n8nApiKey });
      },

      toggleN8nWorkflow: async (workflowId: string, active: boolean) => {
        const { n8nApiUrl, n8nApiKey } = get();
        if (!n8nApiUrl || !n8nApiKey) return { success: false, error: 'Not connected' };
        
        return await (window as any).electron?.n8nApi?.toggleWorkflow({ 
          apiUrl: n8nApiUrl, 
          apiKey: n8nApiKey, 
          workflowId, 
          active 
        });
      },

      // New method for complete credential clearing (manual disconnect only)
      forceDisconnectN8n: () => {
        console.log('[N8n] Force disconnecting (clearing all data)...');
        set({
          n8nConnected: false,
          n8nApiUrl: "",
          n8nApiKey: "",
          n8nError: null,
          n8nVerified: false,
          lastN8nHealthCheck: null,
          n8nHealthCheckFailures: 0,
        });
      },
    }),
    {
      name: "user-token-storage",
      partialize: (state) => ({
        ...state,
        lastGoogleHealthCheck: null,
        lastMicrosoftHealthCheck: null,
        lastN8nHealthCheck: null,
        n8nVerified: false,
        n8nHealthCheckFailures: 0,
      }),
    }
  )
);

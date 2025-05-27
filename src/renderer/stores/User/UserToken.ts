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
    }),
    {
      name: "user-token-storage",
    }
  )
);

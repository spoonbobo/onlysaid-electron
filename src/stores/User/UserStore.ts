import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "../../models/User/UserInfo";
import { useUserTokenStore } from "./UserToken";
import { toast } from "@/utils/toast";

interface UserStore {
  user: IUser | null;
  isLoading: boolean;
  error: string | null;
  timeoutId: NodeJS.Timeout | null;
  setUser: (user: IUser | null) => void;
  signIn: () => void;
  logout: () => void;
  handleAuthResponse: (response: any, intl: any) => Promise<void>;
  clearAuthTimeout: () => void;
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

        // Send authentication request to the main process
        window.electron.ipcRenderer.sendMessage('auth:sign-in');

        // Set a timeout to handle cases where no response comes back
        const timeoutId = setTimeout(() => {
          set({ isLoading: false });
          setSigningIn(false);
          const errorMsg = 'Authentication timed out. Please try again.';
          set({ error: errorMsg });
          setSignInError(errorMsg);
        }, 60000); // 1 minute timeout

        set({ timeoutId });
      },

      handleAuthResponse: async (response, intl) => {
        const { setToken, setSignInError, setSigningIn } = useUserTokenStore.getState();
        const { timeoutId } = get();

        setSigningIn(false);

        // Clear timeout if it exists
        if (timeoutId) {
          clearTimeout(timeoutId);
          set({ timeoutId: null });
        }

        if (response.success) {
          try {
            // Store token in UserTokenStore
            if (response.token && response.cookieName) {
              setToken(response.token, response.cookieName);
            }

            // We should have userData directly from the main process now
            if (response.userData) {
              const userData = await window.electron.user.get({
                token: response.token
              });

              if (userData) {
                // Store user data in Zustand store
                set({ user: userData.data.data, error: null, isLoading: false });
                setSignInError(null);

                // Show success toast
                if (intl) {
                  toast.success(intl.formatMessage(
                    { id: 'toast.welcome' },
                    { name: userData.name }
                  ));
                }
              } else {
                const errorMsg = 'Could not create user from provided data';
                set({ error: errorMsg, isLoading: false });
                setSignInError(errorMsg);
                toast.error(errorMsg);
              }
            } else {
              const errorMsg = 'No user data received from authentication';
              set({ error: errorMsg, isLoading: false });
              setSignInError(errorMsg);
              toast.error(errorMsg);
            }
          } catch (error) {
            console.error('Error processing user data:', error);
            const errorMsg = 'Failed to process user data';
            set({ error: errorMsg, isLoading: false });
            setSignInError(errorMsg);
            toast.error(errorMsg);
          }
        } else {
          set({ isLoading: false });
          const errorMsg = response.error || 'Authentication failed';
          set({ error: errorMsg });
          setSignInError(errorMsg);
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
      }
    }),
    {
      name: "user-storage",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
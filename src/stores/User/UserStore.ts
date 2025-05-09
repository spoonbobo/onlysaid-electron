import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "@/types/User/User";
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

            setUser: (user) => set({ user }),

            signIn: () => {
                const { setToken, setSignInError, setSigningIn } = useUserTokenStore.getState();

                set({ isLoading: true, error: null });
                setSignInError(null);
                setSigningIn(true);

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

                // Clear any timeout
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    set({ timeoutId: null });
                }

                setSigningIn(false);

                try {
                    // Case 1: Direct token from deeplink
                    if (input.token) {
                        const effectiveCookieName = input.cookieName || 'next-auth.session-token';
                        console.log(`[UserStore] Setting token with cookieName: ${effectiveCookieName}`);

                        await setToken(input.token, effectiveCookieName);

                        await window.electron.session.setCookie({
                            url: 'http://onlysaid-dev.com',
                            name: effectiveCookieName,
                            value: input.token,
                            httpOnly: true,
                            secure: true,
                            path: '/',
                        });

                        console.log('[UserStore] Cookie set, fetching user data...');
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

                    // Case 2: Response object from standard auth flow
                    else if (input.response) {
                        const response = input.response;

                        if (response.success) {
                            if (response.token && response.cookieName) {
                                await setToken(response.token, response.cookieName);
                            }

                            if (response.userData) {
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
            }
        }),
        {
            name: "user-storage",
            partialize: (state) => ({ user: state.user }),
        }
    )
);

export const setupDeeplinkAuthListener = (intl?: any) => {
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
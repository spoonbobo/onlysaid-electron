import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserTokenStore {
  token: string | null;
  cookieName: string | null;
  isSigningIn: boolean;
  signInError: string | null;
  setToken: (token: string | null, cookieName: string | null) => void;
  clearToken: () => void;
  setSigningIn: (isSigningIn: boolean) => void;
  setSignInError: (error: string | null) => void;
}

export const useUserTokenStore = create<UserTokenStore>()(
  persist(
    (set) => ({
      token: null,
      cookieName: null,
      isSigningIn: false,
      signInError: null,
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
    }),
    {
      name: "user-token-storage",
    }
  )
);

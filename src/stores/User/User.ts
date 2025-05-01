import { create } from "zustand";
import { persist } from "zustand/middleware";
import { IUser } from "../../models/User/UserInfo";

interface UserStore {
  user: IUser | null;
  setUser: (user: IUser | null) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: "user-storage",
    }
  )
);
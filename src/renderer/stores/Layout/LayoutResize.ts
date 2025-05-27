import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LayoutResizeState {
    menuWidth: number;
    setMenuWidth: (width: number) => void;
}

export const useLayoutResize = create<LayoutResizeState>()(
    persist(
        (set) => ({
            menuWidth: 240,
            setMenuWidth: (menuWidth) => set({ menuWidth }),
        }),
        {
            name: "layout-resize", // key in localStorage
        }
    )
);

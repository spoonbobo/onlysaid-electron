import { create } from "zustand";
import { persist } from "zustand/middleware";

// File explorer resize state
interface FileExplorerStore {
  height: number;
  isExpanded: boolean;
  setHeight: (height: number) => void;
  setIsExpanded: (isExpanded: boolean) => void;
}

export const useFileExplorerStore = create<FileExplorerStore>()(
  persist(
    (set) => ({
      height: 200, // Default height
      isExpanded: false,
      setHeight: (height) => set({ height }),
      setIsExpanded: (isExpanded) => set({ isExpanded }),
    }),
    {
      name: "file-explorer-state", // key in localStorage
    }
  )
);

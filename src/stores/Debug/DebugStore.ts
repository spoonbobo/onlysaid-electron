import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface OverlayPosition {
  x: number;
  y: number;
}

export interface OverlaySize {
  width: number;
  height: number;
}

interface DebugStore {
  // Debug Overlay
  debugOverlayMinimized: boolean;
  setDebugOverlayMinimized: (minimized: boolean) => void;

  // DB Overlay
  dbOverlayMinimized: boolean;
  setDbOverlayMinimized: (minimized: boolean) => void;

  // Resource Overlay
  resourceOverlayMinimized: boolean;
  setResourceOverlayMinimized: (minimized: boolean) => void;

  // Common overlays container
  overlaysPosition: OverlayPosition;
  overlaysWidth: number;
  overlaysHeight: number;
  setOverlaysPosition: (position: OverlayPosition) => void;
  setOverlaysWidth: (width: number) => void;
  setOverlaysHeight: (height: number) => void;
  resetOverlays: () => void;
}

export const useDebugStore = create<DebugStore>()(
  persist(
    (set) => ({
      // Debug Overlay
      debugOverlayMinimized: false,
      setDebugOverlayMinimized: (minimized) => set({ debugOverlayMinimized: minimized }),

      // DB Overlay
      dbOverlayMinimized: false,
      setDbOverlayMinimized: (minimized) => set({ dbOverlayMinimized: minimized }),

      // Resource Overlay
      resourceOverlayMinimized: false,
      setResourceOverlayMinimized: (minimized) => set({ resourceOverlayMinimized: minimized }),

      // Common container settings
      overlaysPosition: { x: 20, y: 60 },
      overlaysWidth: 250,
      overlaysHeight: 400,
      setOverlaysPosition: (position) => set({ overlaysPosition: position }),
      setOverlaysWidth: (width) => set({ overlaysWidth: width }),
      setOverlaysHeight: (height) => set({ overlaysHeight: height }),

      resetOverlays: () => set({
        overlaysPosition: { x: 20, y: 60 },
        overlaysWidth: 250,
        overlaysHeight: 400,
        debugOverlayMinimized: false,
        dbOverlayMinimized: false,
        resourceOverlayMinimized: false
      })
    }),
    {
      name: "debug-overlay-storage",
      storage: createJSONStorage(() => localStorage)
    }
  )
);

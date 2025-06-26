import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface MarkingScheme {
  content: string;
  fileName: string;
  fileId: string;
  fileSize?: number;
  kbId?: string;
}

interface MarkingSchemeState {
  markingSchemes: Record<string, MarkingScheme>; // Keyed by assignmentId
  
  // Marking scheme methods
  setMarkingScheme: (assignmentId: string, scheme: MarkingScheme) => void;
  getMarkingScheme: (assignmentId: string) => MarkingScheme | undefined;
  removeMarkingScheme: (assignmentId: string) => void;
  clearAllMarkingSchemes: () => void;
}

export const useMarkingSchemeStore = create<MarkingSchemeState>()(
  persist(
    (set, get) => ({
      markingSchemes: {},
      
      // Marking scheme methods
      setMarkingScheme: (assignmentId, scheme) =>
        set((state) => ({
          markingSchemes: {
            ...state.markingSchemes,
            [assignmentId]: scheme,
          },
        })),
      
      getMarkingScheme: (assignmentId) => {
        return get().markingSchemes[assignmentId];
      },
      
      removeMarkingScheme: (assignmentId) =>
        set((state) => {
          const { [assignmentId]: removed, ...rest } = state.markingSchemes;
          return { markingSchemes: rest };
        }),
      
      clearAllMarkingSchemes: () =>
        set({ markingSchemes: {} }),
    }),
    {
      name: 'onlysaid-marking-scheme-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        markingSchemes: state.markingSchemes,
      }),
    }
  )
);

// Export hooks
export const useMarkingScheme = (assignmentId: string): MarkingScheme | undefined => {
  return useMarkingSchemeStore((state) => state.getMarkingScheme(assignmentId));
};

export const useSetMarkingScheme = () => {
  return useMarkingSchemeStore((state) => state.setMarkingScheme);
};

export const useRemoveMarkingScheme = () => {
  return useMarkingSchemeStore((state) => state.removeMarkingScheme);
};

export const useClearAllMarkingSchemes = () => {
  return useMarkingSchemeStore((state) => state.clearAllMarkingSchemes);
}; 
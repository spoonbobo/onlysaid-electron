import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AssignmentState {
  selectedAssignments: Record<string, string>; // workspaceId -> assignmentId
  
  // Assignment selection methods
  setSelectedAssignment: (workspaceId: string, assignmentId: string) => void;
  getSelectedAssignment: (workspaceId: string) => string;
  clearSelectedAssignment: (workspaceId: string) => void;
}

export const useAssignmentStore = create<AssignmentState>()(
  persist(
    (set, get) => ({
      selectedAssignments: {},
      
      // Assignment selection methods
      setSelectedAssignment: (workspaceId, assignmentId) =>
        set((state) => ({
          selectedAssignments: {
            ...state.selectedAssignments,
            [workspaceId]: assignmentId,
          },
        })),
      
      getSelectedAssignment: (workspaceId) => {
        return get().selectedAssignments[workspaceId] || '';
      },
      
      clearSelectedAssignment: (workspaceId) =>
        set((state) => {
          const { [workspaceId]: removed, ...rest } = state.selectedAssignments;
          return { selectedAssignments: rest };
        }),
    }),
    {
      name: 'onlysaid-assignment-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedAssignments: state.selectedAssignments,
      }),
    }
  )
);

// Export hooks
export const useSelectedAssignment = (workspaceId: string): string => {
  return useAssignmentStore((state) => state.getSelectedAssignment(workspaceId));
};

export const useSetSelectedAssignment = () => {
  return useAssignmentStore((state) => state.setSelectedAssignment);
};

export const useClearSelectedAssignment = () => {
  return useAssignmentStore((state) => state.clearSelectedAssignment);
};

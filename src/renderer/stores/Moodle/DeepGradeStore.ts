import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface MarkingScheme {
  content: string;
  fileName: string;
  fileId: string;
  fileSize?: number;
  kbId?: string;
}

interface DeepGradeState {
  markingSchemes: Record<string, MarkingScheme>; // Keyed by assignmentId
  selectedAssignments: Record<string, string>; // workspaceId -> assignmentId
  setMarkingScheme: (assignmentId: string, scheme: MarkingScheme) => void;
  removeMarkingScheme: (assignmentId: string) => void;
  setSelectedAssignment: (workspaceId: string, assignmentId: string) => void;
  getSelectedAssignment: (workspaceId: string) => string;
  clearSelectedAssignment: (workspaceId: string) => void;
}

export const useDeepGradeStore = create<DeepGradeState>()(
  persist(
    (set, get) => ({
      markingSchemes: {},
      selectedAssignments: {},
      setMarkingScheme: (assignmentId, scheme) =>
        set((state) => ({
          markingSchemes: {
            ...state.markingSchemes,
            [assignmentId]: scheme,
          },
        })),
      removeMarkingScheme: (assignmentId) =>
        set((state) => {
          const { [assignmentId]: removed, ...rest } = state.markingSchemes;
          return { markingSchemes: rest };
        }),
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
      name: 'onlysaid-deep-grade-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);

export const useMarkingScheme = (assignmentId: string): MarkingScheme | undefined => {
  return useDeepGradeStore((state) => state.markingSchemes[assignmentId]);
};

export const useSelectedAssignment = (workspaceId: string): string => {
  return useDeepGradeStore((state) => state.getSelectedAssignment(workspaceId));
};

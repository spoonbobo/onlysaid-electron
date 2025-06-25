import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface MarkingScheme {
  content: string;
  fileName: string;
  fileId: string;
  fileSize?: number;
  kbId?: string;
}

interface GradeSubmission {
  studentId: string;
  assignmentId: string;
  courseId: string;
  grade: number;
  feedback?: string;
  timestamp: string;
  published: boolean;
}

interface AutoGradeState {
  markingSchemes: Record<string, MarkingScheme>; // Keyed by assignmentId
  selectedAssignments: Record<string, string>; // workspaceId -> assignmentId
  autoGradeResults: Record<string, { aiGrade: string; feedback: string; timestamp: string }>; // Keyed by studentId
  gradeSubmissions: Record<string, GradeSubmission>; // Keyed by `${assignmentId}-${studentId}`
  setMarkingScheme: (assignmentId: string, scheme: MarkingScheme) => void;
  removeMarkingScheme: (assignmentId: string) => void;
  setSelectedAssignment: (workspaceId: string, assignmentId: string) => void;
  getSelectedAssignment: (workspaceId: string) => string;
  clearSelectedAssignment: (workspaceId: string) => void;
  executeAutoGrade: (studentData: any, markingScheme: MarkingScheme, assignment: any, workspaceId: string) => Promise<{ aiGrade: string; feedback: string }>;
  setAutoGradeResult: (studentId: string, result: { aiGrade: string; feedback: string }) => void;
  getAutoGradeResult: (studentId: string) => { aiGrade: string; feedback: string; timestamp: string } | undefined;
  clearAutoGradeResult: (studentId: string) => void;
  publishGrade: (submission: Omit<GradeSubmission, 'timestamp' | 'published'>) => Promise<{ success: boolean; error?: string }>;
  publishGradesBatch: (submissions: Array<Omit<GradeSubmission, 'timestamp' | 'published'>>) => Promise<{ success: boolean; results: any; error?: string }>;
  setGradeSubmission: (key: string, submission: GradeSubmission) => void;
  getGradeSubmission: (assignmentId: string, studentId: string) => GradeSubmission | undefined;
  isGradePublished: (assignmentId: string, studentId: string) => boolean;
}

export const useAutoGradeStore = create<AutoGradeState>()(
  persist(
    (set, get) => ({
      markingSchemes: {},
      selectedAssignments: {},
      autoGradeResults: {},
      gradeSubmissions: {},
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
      executeAutoGrade: async (studentData, markingScheme, assignment, workspaceId) => {
        // Log all student entry data
        console.log('=== EXECUTING AUTO GRADE FROM STORE ===');
        console.log('Student Entry Data:', {
          student: studentData.student,
          submission: studentData.submission,
          grade: studentData.grade,
          currentGrade: studentData.currentGrade,
          aiGrade: studentData.aiGrade,
          feedback: studentData.feedback,
          isEditing: studentData.isEditing,
          assignment: assignment,
          markingScheme: markingScheme,
          workspaceId: workspaceId,
          timestamp: new Date().toISOString()
        });
        console.log('=== END AUTO GRADE DATA ===');

        // Simulate auto-grading process with a delay
        return new Promise((resolve) => {
          setTimeout(() => {
            // Generate a dummy AI grade (random between 60-95% of max grade)
            const maxGrade = assignment?.grade || 100;
            const minScore = Math.floor(maxGrade * 0.6);
            const maxScore = Math.floor(maxGrade * 0.95);
            const dummyGrade = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;

            const result = {
              aiGrade: dummyGrade.toString(),
              feedback: `Auto-generated feedback for ${studentData.student.fullname}. This submission demonstrates good understanding of the concepts. Generated at ${new Date().toLocaleString()}.`
            };

            // Store the result
            get().setAutoGradeResult(studentData.student.id, result);

            resolve(result);
          }, 2000); // 2 second delay to simulate processing
        });
      },
      setAutoGradeResult: (studentId, result) =>
        set((state) => ({
          autoGradeResults: {
            ...state.autoGradeResults,
            [studentId]: {
              ...result,
              timestamp: new Date().toISOString()
            },
          },
        })),
      getAutoGradeResult: (studentId) => {
        return get().autoGradeResults[studentId];
      },
      clearAutoGradeResult: (studentId) =>
        set((state) => {
          const { [studentId]: removed, ...rest } = state.autoGradeResults;
          return { autoGradeResults: rest };
        }),
      publishGrade: async (submission) => {
        try {
          // Get workspace settings to determine API configuration
          const moodleConfig = await window.electron.moodleAuth.getPresetUrl();
          if (!moodleConfig.success) {
            throw new Error('Failed to get Moodle configuration');
          }

          // This would need to be passed from the component that has access to workspace settings
          // For now, we'll return a placeholder that the component can override
          return {
            success: false,
            error: 'publishGrade should be called from component with API access'
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Failed to publish grade'
          };
        }
      },
      publishGradesBatch: async (submissions) => {
        try {
          const results = [];
          for (const submission of submissions) {
            const result = await get().publishGrade(submission);
            results.push(result);
          }
          
          const successCount = results.filter(r => r.success).length;
          const success = successCount === submissions.length;
          
          return {
            success,
            results: {
              total: submissions.length,
              successful: successCount,
              failed: submissions.length - successCount,
              details: results
            }
          };
        } catch (error: any) {
          return {
            success: false,
            results: {},
            error: error.message || 'Failed to publish grades batch'
          };
        }
      },
      setGradeSubmission: (key, submission) =>
        set((state) => ({
          gradeSubmissions: {
            ...state.gradeSubmissions,
            [key]: submission,
          },
        })),
      getGradeSubmission: (assignmentId, studentId) => {
        const key = `${assignmentId}-${studentId}`;
        return get().gradeSubmissions[key];
      },
      isGradePublished: (assignmentId, studentId) => {
        const submission = get().getGradeSubmission(assignmentId, studentId);
        return submission?.published || false;
      },
    }),
    {
      name: 'onlysaid-auto-grade-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);

export const useMarkingScheme = (assignmentId: string): MarkingScheme | undefined => {
  return useAutoGradeStore((state) => state.markingSchemes[assignmentId]);
};

export const useSelectedAssignment = (workspaceId: string): string => {
  return useAutoGradeStore((state) => state.getSelectedAssignment(workspaceId));
};

export const useExecuteAutoGrade = () => {
  return useAutoGradeStore((state) => state.executeAutoGrade);
};

export const useAutoGradeResult = (studentId: string) => {
  return useAutoGradeStore((state) => state.getAutoGradeResult(studentId));
};

export const usePublishGrade = () => {
  return useAutoGradeStore((state) => state.publishGrade);
};

export const usePublishGradesBatch = () => {
  return useAutoGradeStore((state) => state.publishGradesBatch);
};

export const useGradeSubmission = (assignmentId: string, studentId: string) => {
  return useAutoGradeStore((state) => state.getGradeSubmission(assignmentId, studentId));
};

export const useIsGradePublished = (assignmentId: string, studentId: string) => {
  return useAutoGradeStore((state) => state.isGradePublished(assignmentId, studentId));
};

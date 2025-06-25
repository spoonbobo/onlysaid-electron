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

// NEW: Hierarchical grade info structure
interface UserGradeInfo {
  aiGrade: string;
  currentGrade: number | null;
  feedback: string;
  timestamp: string;
  published: boolean;
}

// NEW: Hierarchical structure - workspace:course:user:info
interface WorkspaceGradeData {
  [courseId: string]: {
    [userId: string]: UserGradeInfo;
  };
}

interface AutoGradeState {
  markingSchemes: Record<string, MarkingScheme>; // Keyed by assignmentId
  selectedAssignments: Record<string, string>; // workspaceId -> assignmentId
  
  // UPDATED: New hierarchical structure
  workspaceGrades: Record<string, WorkspaceGradeData>; // workspaceId -> courseId -> userId -> info
  
  // Legacy support (keep for backward compatibility)
  autoGradeResults: Record<string, { aiGrade: string; feedback: string; timestamp: string }>; // Keyed by studentId
  gradeSubmissions: Record<string, GradeSubmission>; // Keyed by `${assignmentId}-${studentId}`
  
  // Marking scheme methods
  setMarkingScheme: (assignmentId: string, scheme: MarkingScheme) => void;
  removeMarkingScheme: (assignmentId: string) => void;
  
  // Assignment selection methods
  setSelectedAssignment: (workspaceId: string, assignmentId: string) => void;
  getSelectedAssignment: (workspaceId: string) => string;
  clearSelectedAssignment: (workspaceId: string) => void;
  
  // NEW: Hierarchical grade methods
  setUserGradeInfo: (workspaceId: string, courseId: string, userId: string, info: UserGradeInfo) => void;
  getUserGradeInfo: (workspaceId: string, courseId: string, userId: string) => UserGradeInfo | undefined;
  updateUserCurrentGrade: (workspaceId: string, courseId: string, userId: string, currentGrade: number) => void;
  updateUserPublishedStatus: (workspaceId: string, courseId: string, userId: string, published: boolean) => void;
  clearUserGradeInfo: (workspaceId: string, courseId: string, userId: string) => void;
  clearCourseGrades: (workspaceId: string, courseId: string) => void;
  clearWorkspaceGrades: (workspaceId: string) => void;
  
  // Auto-grade execution
  executeAutoGrade: (studentData: any, markingScheme: MarkingScheme, assignment: any, workspaceId: string, courseId: string) => Promise<{ aiGrade: string; feedback: string }>;
  
  // Legacy methods (keep for backward compatibility)
  setAutoGradeResult: (studentId: string, result: { aiGrade: string; feedback: string }) => void;
  getAutoGradeResult: (studentId: string) => { aiGrade: string; feedback: string; timestamp: string } | undefined;
  clearAutoGradeResult: (studentId: string) => void;
  setGradeSubmission: (key: string, submission: GradeSubmission) => void;
  getGradeSubmission: (assignmentId: string, studentId: string) => GradeSubmission | undefined;
  isGradePublished: (assignmentId: string, studentId: string) => boolean;
  refreshGradeStatus: (assignmentId: string, studentId: string, apiGrade: any, courseId: string) => void;
  
  // UPDATED: Reset grade methods instead of delete
  resetUserGrade: (workspaceId: string, courseId: string, userId: string) => void;
  resetGradeSubmission: (assignmentId: string, studentId: string) => void;
}

export const useAutoGradeStore = create<AutoGradeState>()(
  persist(
    (set, get) => ({
      markingSchemes: {},
      selectedAssignments: {},
      workspaceGrades: {},
      autoGradeResults: {},
      gradeSubmissions: {},
      
      // Marking scheme methods
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
      
      // NEW: Hierarchical grade methods
      setUserGradeInfo: (workspaceId, courseId, userId, info) => {
        console.log('🔄 Setting user grade info:', { workspaceId, courseId, userId, info });
        set((state) => {
          const newState = {
            workspaceGrades: {
              ...state.workspaceGrades,
              [workspaceId]: {
                ...state.workspaceGrades[workspaceId],
                [courseId]: {
                  ...state.workspaceGrades[workspaceId]?.[courseId],
                  [userId]: info,
                },
              },
            },
          };
          console.log('✅ User grade info stored:', newState.workspaceGrades[workspaceId]?.[courseId]?.[userId]);
          return newState;
        });
      },
      
      getUserGradeInfo: (workspaceId, courseId, userId) => {
        const info = get().workspaceGrades[workspaceId]?.[courseId]?.[userId];
        console.log('📖 Getting user grade info:', { workspaceId, courseId, userId, info });
        return info;
      },
      
      updateUserCurrentGrade: (workspaceId, courseId, userId, currentGrade) =>
        set((state) => {
          const existingInfo = state.workspaceGrades[workspaceId]?.[courseId]?.[userId];
          if (existingInfo) {
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: {
                  ...state.workspaceGrades[workspaceId],
                  [courseId]: {
                    ...state.workspaceGrades[workspaceId][courseId],
                    [userId]: {
                      ...existingInfo,
                      currentGrade,
                      timestamp: new Date().toISOString(),
                    },
                  },
                },
              },
            };
          }
          return state;
        }),
      
      updateUserPublishedStatus: (workspaceId, courseId, userId, published) =>
        set((state) => {
          const existingInfo = state.workspaceGrades[workspaceId]?.[courseId]?.[userId];
          if (existingInfo) {
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: {
                  ...state.workspaceGrades[workspaceId],
                  [courseId]: {
                    ...state.workspaceGrades[workspaceId][courseId],
                    [userId]: {
                      ...existingInfo,
                      published,
                      timestamp: new Date().toISOString(),
                    },
                  },
                },
              },
            };
          }
          return state;
        }),
      
      clearUserGradeInfo: (workspaceId, courseId, userId) =>
        set((state) => {
          if (state.workspaceGrades[workspaceId]?.[courseId]?.[userId]) {
            const newCourseGrades = { ...state.workspaceGrades[workspaceId][courseId] };
            delete newCourseGrades[userId];
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: {
                  ...state.workspaceGrades[workspaceId],
                  [courseId]: newCourseGrades,
                },
              },
            };
          }
          return state;
        }),
      
      clearCourseGrades: (workspaceId, courseId) =>
        set((state) => {
          if (state.workspaceGrades[workspaceId]?.[courseId]) {
            const newWorkspaceGrades = { ...state.workspaceGrades[workspaceId] };
            delete newWorkspaceGrades[courseId];
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: newWorkspaceGrades,
              },
            };
          }
          return state;
        }),
      
      clearWorkspaceGrades: (workspaceId) =>
        set((state) => {
          const { [workspaceId]: removed, ...rest } = state.workspaceGrades;
          return { workspaceGrades: rest };
        }),
      
      // UPDATED: Auto-grade execution with hierarchical storage
      executeAutoGrade: async (studentData, markingScheme, assignment, workspaceId, courseId) => {
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
          courseId: courseId,
          timestamp: new Date().toISOString()
        });

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

            console.log('🎯 Auto-grade result generated:', result);

            // FIXED: Store the result in hierarchical structure with explicit logging
            const gradeInfo: UserGradeInfo = {
              aiGrade: result.aiGrade,
              currentGrade: studentData.currentGrade ? parseFloat(studentData.currentGrade) : null,
              feedback: result.feedback,
              timestamp: new Date().toISOString(),
              published: false,
            };

            console.log('💾 Storing grade info:', { workspaceId, courseId, studentId: studentData.student.id, gradeInfo });
            get().setUserGradeInfo(workspaceId, courseId, studentData.student.id, gradeInfo);

            // Also store in legacy format for backward compatibility
            get().setAutoGradeResult(studentData.student.id, result);

            console.log('=== AUTO GRADE EXECUTION COMPLETE ===');
            resolve(result);
          }, 2000); // 2 second delay to simulate processing
        });
      },
      
      // Legacy methods (keep for backward compatibility)
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
      refreshGradeStatus: (assignmentId, studentId, apiGrade, courseId) => {
        const key = `${assignmentId}-${studentId}`;
        if (apiGrade && apiGrade.grade > 0) {
          set((state) => ({
            gradeSubmissions: {
              ...state.gradeSubmissions,
              [key]: {
                studentId,
                assignmentId,
                courseId,
                grade: apiGrade.grade,
                feedback: apiGrade.feedback || '',
                timestamp: new Date(apiGrade.timemodified * 1000).toISOString(),
                published: true
              },
            },
          }));
        }
      },
      
      // UPDATED: Reset grade methods instead of delete
      resetUserGrade: (workspaceId, courseId, userId) =>
        set((state) => {
          if (state.workspaceGrades[workspaceId]?.[courseId]?.[userId]) {
            // Reset to initial state instead of deleting
            const resetInfo: UserGradeInfo = {
              aiGrade: '',
              currentGrade: null,
              feedback: '',
              timestamp: new Date().toISOString(),
              published: false,
            };
            
            return {
              workspaceGrades: {
                ...state.workspaceGrades,
                [workspaceId]: {
                  ...state.workspaceGrades[workspaceId],
                  [courseId]: {
                    ...state.workspaceGrades[workspaceId][courseId],
                    [userId]: resetInfo,
                  },
                },
              },
            };
          }
          return state;
        }),
      
      resetGradeSubmission: (assignmentId, studentId) =>
        set((state) => {
          const key = `${assignmentId}-${studentId}`;
          // Remove the submission entirely instead of resetting to avoid -1 values
          const { [key]: removed, ...rest } = state.gradeSubmissions;
          return {
            gradeSubmissions: rest,
          };
        }),
    }),
    {
      name: 'onlysaid-auto-grade-storage', 
      storage: createJSONStorage(() => localStorage),
      // FIXED: Add partialize to ensure all data is persisted
      partialize: (state) => ({
        markingSchemes: state.markingSchemes,
        selectedAssignments: state.selectedAssignments,
        workspaceGrades: state.workspaceGrades,
        autoGradeResults: state.autoGradeResults,
        gradeSubmissions: state.gradeSubmissions,
      }),
      // FIXED: Add onRehydrateStorage for debugging
      onRehydrateStorage: () => (state) => {
        console.log('🔄 Rehydrating AutoGrade store:', state);
        if (state?.workspaceGrades) {
          console.log('📊 Workspace grades loaded:', Object.keys(state.workspaceGrades).length, 'workspaces');
        }
      },
    }
  )
);

// UPDATED: Export hooks for hierarchical structure
export const useMarkingScheme = (assignmentId: string): MarkingScheme | undefined => {
  return useAutoGradeStore((state) => state.markingSchemes[assignmentId]);
};

export const useSelectedAssignment = (workspaceId: string): string => {
  return useAutoGradeStore((state) => state.getSelectedAssignment(workspaceId));
};

export const useExecuteAutoGrade = () => {
  return useAutoGradeStore((state) => state.executeAutoGrade);
};

// NEW: Hierarchical grade hooks
export const useUserGradeInfo = (workspaceId: string, courseId: string, userId: string): UserGradeInfo | undefined => {
  return useAutoGradeStore((state) => state.getUserGradeInfo(workspaceId, courseId, userId));
};

export const useSetUserGradeInfo = () => {
  return useAutoGradeStore((state) => state.setUserGradeInfo);
};

export const useUpdateUserCurrentGrade = () => {
  return useAutoGradeStore((state) => state.updateUserCurrentGrade);
};

export const useUpdateUserPublishedStatus = () => {
  return useAutoGradeStore((state) => state.updateUserPublishedStatus);
};

// Legacy hooks (keep for backward compatibility)
export const useAutoGradeResult = (studentId: string) => {
  return useAutoGradeStore((state) => state.getAutoGradeResult(studentId));
};

export const useGradeSubmission = (assignmentId: string, studentId: string) => {
  return useAutoGradeStore((state) => state.getGradeSubmission(assignmentId, studentId));
};

export const useIsGradePublished = (assignmentId: string, studentId: string) => {
  return useAutoGradeStore((state) => state.isGradePublished(assignmentId, studentId));
};

export const useRefreshGradeStatus = () => {
  return useAutoGradeStore((state) => state.refreshGradeStatus);
};

// UPDATED: Export hooks for grade reset
export const useResetUserGrade = () => {
  return useAutoGradeStore((state) => state.resetUserGrade);
};

export const useResetGradeSubmission = () => {
  return useAutoGradeStore((state) => state.resetGradeSubmission);
};

// Keep the old exports for backward compatibility but mark as deprecated
/** @deprecated Use useResetUserGrade instead */
export const useDeleteUserGrade = () => {
  return useAutoGradeStore((state) => state.resetUserGrade);
};

/** @deprecated Use useResetGradeSubmission instead */
export const useDeleteGradeSubmission = () => {
  return useAutoGradeStore((state) => state.resetGradeSubmission);
};

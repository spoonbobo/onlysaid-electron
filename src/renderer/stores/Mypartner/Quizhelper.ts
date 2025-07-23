import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useMemo } from "react";

// Types for Quiz Helper state
export interface QuestionFormData {
  questionCount: number;
  questionType: 'multiple_choice' | 'short_answer' | 'true_false' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  selectedKbIds: string[];
}

export interface GeneratedQuestion {
  id: string;
  type: 'multiple_choice' | 'short_answer' | 'true_false';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: string;
  topic?: string;
}

export interface ShortAnswerEvaluation {
  isCorrect: boolean;
  feedback: string;
  score: number;
}

export interface GenerationDetails {
  approach: string;
  style: string;
  focus: string;
  seed: string;
}

export interface QuizSession {
  id: string;
  workspaceId: string;
  questions: GeneratedQuestion[];
  userAnswers: Record<string, any>;
  showAnswers: boolean;
  wrongAnswerExplanations: Record<string, string>;
  shortAnswerEvaluations: Record<string, ShortAnswerEvaluation>;
  generationDetails: GenerationDetails | null;
  generationCount: number;
  createdAt: number;
  lastUpdated: number;
}

interface QuizHelperState {
  // Quiz sessions by workspace
  quizSessions: Record<string, QuizSession>; // workspaceId -> QuizSession
  
  // Current active session
  activeSessionId: string | null;
  
  // Form configurations by workspace
  formConfigurations: Record<string, QuestionFormData>; // workspaceId -> FormData
  
  // Loading states
  isGenerating: boolean;
  isCheckingAnswers: boolean;
  loadingExplanations: Record<string, boolean>;
  evaluatingAnswers: Record<string, boolean>;
  
  // Error states
  error: string | null;
  
  // Available knowledge bases by workspace
  availableKbs: Record<string, any[]>; // workspaceId -> KB[]

  // Actions for session management
  createQuizSession: (workspaceId: string, questions: GeneratedQuestion[], generationDetails: GenerationDetails) => string;
  getQuizSession: (workspaceId: string) => QuizSession | null;
  setActiveSession: (workspaceId: string, sessionId?: string) => void;
  clearQuizSession: (workspaceId: string) => void;
  deleteQuizSession: (workspaceId: string, sessionId: string) => void;
  
  // Actions for questions and answers
  updateUserAnswer: (workspaceId: string, questionId: string, answer: any) => void;
  setShowAnswers: (workspaceId: string, show: boolean) => void;
  addWrongAnswerExplanation: (workspaceId: string, questionId: string, explanation: string) => void;
  addShortAnswerEvaluation: (workspaceId: string, questionId: string, evaluation: ShortAnswerEvaluation) => void;
  
  // Actions for form configuration
  setFormConfiguration: (workspaceId: string, config: QuestionFormData) => void;
  getFormConfiguration: (workspaceId: string) => QuestionFormData;
  updateFormField: (workspaceId: string, field: keyof QuestionFormData, value: any) => void;
  
  // Actions for loading states
  setIsGenerating: (loading: boolean) => void;
  setIsCheckingAnswers: (loading: boolean) => void;
  setLoadingExplanation: (questionId: string, loading: boolean) => void;
  setEvaluatingAnswer: (questionId: string, loading: boolean) => void;
  
  // Actions for knowledge bases
  setAvailableKbs: (workspaceId: string, kbs: any[]) => void;
  getAvailableKbs: (workspaceId: string) => any[];
  
  // Utility actions
  setError: (error: string | null) => void;
  resetLoadingStates: () => void;
  getQuizStats: (workspaceId: string) => { totalQuestions: number; answeredQuestions: number; correctAnswers: number; } | null;
  hasActiveQuiz: (workspaceId: string) => boolean;
  
  // Cleanup actions
  clearExpiredSessions: (maxAgeHours?: number) => void;
  clearAllSessions: () => void;
  exportQuizData: (workspaceId: string) => any;
}

// Default form configuration
const defaultFormConfiguration: QuestionFormData = {
  questionCount: 5,
  questionType: 'multiple_choice',
  difficulty: 'medium',
  selectedKbIds: []
};

export const useQuizHelperStore = create<QuizHelperState>()(
  persist(
    (set, get) => ({
      // Initial state
      quizSessions: {},
      activeSessionId: null,
      formConfigurations: {},
      isGenerating: false,
      isCheckingAnswers: false,
      loadingExplanations: {},
      evaluatingAnswers: {},
      error: null,
      availableKbs: {},

      // Session management
      createQuizSession: (workspaceId: string, questions: GeneratedQuestion[], generationDetails: GenerationDetails) => {
        const sessionId = `quiz_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const newSession: QuizSession = {
          id: sessionId,
          workspaceId,
          questions,
          userAnswers: {},
          showAnswers: false,
          wrongAnswerExplanations: {},
          shortAnswerEvaluations: {},
          generationDetails,
          generationCount: get().quizSessions[workspaceId]?.generationCount + 1 || 1,
          createdAt: Date.now(),
          lastUpdated: Date.now()
        };

        set((state) => ({
          quizSessions: {
            ...state.quizSessions,
            [workspaceId]: newSession
          },
          activeSessionId: sessionId
        }));

        return sessionId;
      },

      getQuizSession: (workspaceId: string) => {
        return get().quizSessions[workspaceId] || null;
      },

      setActiveSession: (workspaceId: string, sessionId?: string) => {
        const session = get().quizSessions[workspaceId];
        if (session && (!sessionId || session.id === sessionId)) {
          set({ activeSessionId: session.id });
        } else {
          set({ activeSessionId: null });
        }
      },

      clearQuizSession: (workspaceId: string) => {
        set((state) => {
          const newSessions = { ...state.quizSessions };
          delete newSessions[workspaceId];
          return {
            quizSessions: newSessions,
            activeSessionId: state.activeSessionId === state.quizSessions[workspaceId]?.id ? null : state.activeSessionId
          };
        });
      },

      deleteQuizSession: (workspaceId: string, sessionId: string) => {
        set((state) => {
          const session = state.quizSessions[workspaceId];
          if (session && session.id === sessionId) {
            const newSessions = { ...state.quizSessions };
            delete newSessions[workspaceId];
            return {
              quizSessions: newSessions,
              activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId
            };
          }
          return state;
        });
      },

      // Answer management
      updateUserAnswer: (workspaceId: string, questionId: string, answer: any) => {
        set((state) => {
          const session = state.quizSessions[workspaceId];
          if (!session) return state;

          return {
            quizSessions: {
              ...state.quizSessions,
              [workspaceId]: {
                ...session,
                userAnswers: {
                  ...session.userAnswers,
                  [questionId]: answer
                },
                lastUpdated: Date.now()
              }
            }
          };
        });
      },

      setShowAnswers: (workspaceId: string, show: boolean) => {
        set((state) => {
          const session = state.quizSessions[workspaceId];
          if (!session) return state;

          return {
            quizSessions: {
              ...state.quizSessions,
              [workspaceId]: {
                ...session,
                showAnswers: show,
                lastUpdated: Date.now()
              }
            }
          };
        });
      },

      addWrongAnswerExplanation: (workspaceId: string, questionId: string, explanation: string) => {
        set((state) => {
          const session = state.quizSessions[workspaceId];
          if (!session) return state;

          return {
            quizSessions: {
              ...state.quizSessions,
              [workspaceId]: {
                ...session,
                wrongAnswerExplanations: {
                  ...session.wrongAnswerExplanations,
                  [questionId]: explanation
                },
                lastUpdated: Date.now()
              }
            }
          };
        });
      },

      addShortAnswerEvaluation: (workspaceId: string, questionId: string, evaluation: ShortAnswerEvaluation) => {
        set((state) => {
          const session = state.quizSessions[workspaceId];
          if (!session) return state;

          return {
            quizSessions: {
              ...state.quizSessions,
              [workspaceId]: {
                ...session,
                shortAnswerEvaluations: {
                  ...session.shortAnswerEvaluations,
                  [questionId]: evaluation
                },
                lastUpdated: Date.now()
              }
            }
          };
        });
      },

      // Form configuration management
      setFormConfiguration: (workspaceId: string, config: QuestionFormData) => {
        set((state) => ({
          formConfigurations: {
            ...state.formConfigurations,
            [workspaceId]: config
          }
        }));
      },

      getFormConfiguration: (workspaceId: string) => {
        return get().formConfigurations[workspaceId] || defaultFormConfiguration;
      },

      updateFormField: (workspaceId: string, field: keyof QuestionFormData, value: any) => {
        set((state) => {
          const currentConfig = state.formConfigurations[workspaceId] || defaultFormConfiguration;
          return {
            formConfigurations: {
              ...state.formConfigurations,
              [workspaceId]: {
                ...currentConfig,
                [field]: value
              }
            }
          };
        });
      },

      // Loading state management
      setIsGenerating: (loading: boolean) => set({ isGenerating: loading }),
      setIsCheckingAnswers: (loading: boolean) => set({ isCheckingAnswers: loading }),
      
      setLoadingExplanation: (questionId: string, loading: boolean) => {
        set((state) => ({
          loadingExplanations: {
            ...state.loadingExplanations,
            [questionId]: loading
          }
        }));
      },

      setEvaluatingAnswer: (questionId: string, loading: boolean) => {
        set((state) => ({
          evaluatingAnswers: {
            ...state.evaluatingAnswers,
            [questionId]: loading
          }
        }));
      },

      // Knowledge base management
      setAvailableKbs: (workspaceId: string, kbs: any[]) => {
        set((state) => ({
          availableKbs: {
            ...state.availableKbs,
            [workspaceId]: kbs
          }
        }));
      },

      getAvailableKbs: (workspaceId: string) => {
        return get().availableKbs[workspaceId] || [];
      },

      // Utility functions
      setError: (error: string | null) => set({ error }),

      resetLoadingStates: () => set({
        isGenerating: false,
        isCheckingAnswers: false,
        loadingExplanations: {},
        evaluatingAnswers: {}
      }),

      getQuizStats: (workspaceId: string) => {
        const session = get().quizSessions[workspaceId];
        if (!session) return null;

        const totalQuestions = session.questions.length;
        const answeredQuestions = Object.keys(session.userAnswers).length;
        
        let correctAnswers = 0;
        session.questions.forEach(question => {
          const userAnswer = session.userAnswers[question.id];
          if (userAnswer !== undefined && userAnswer !== '') {
            if (question.type === 'short_answer') {
              const evaluation = session.shortAnswerEvaluations[question.id];
              if (evaluation?.isCorrect) correctAnswers++;
            } else {
              if (userAnswer === question.correctAnswer) correctAnswers++;
            }
          }
        });

        return { totalQuestions, answeredQuestions, correctAnswers };
      },

      hasActiveQuiz: (workspaceId: string) => {
        const session = get().quizSessions[workspaceId];
        return session && session.questions.length > 0;
      },

      // Cleanup functions
      clearExpiredSessions: (maxAgeHours = 24) => {
        const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
        const now = Date.now();
        
        set((state) => {
          const filteredSessions: Record<string, QuizSession> = {};
          
          Object.entries(state.quizSessions).forEach(([workspaceId, session]) => {
            if (now - session.lastUpdated < maxAge) {
              filteredSessions[workspaceId] = session;
            }
          });

          return { quizSessions: filteredSessions };
        });
      },

      clearAllSessions: () => set({
        quizSessions: {},
        activeSessionId: null
      }),

      exportQuizData: (workspaceId: string) => {
        const session = get().quizSessions[workspaceId];
        const formConfig = get().formConfigurations[workspaceId];
        const stats = get().getQuizStats(workspaceId);
        
        return {
          session,
          formConfiguration: formConfig,
          statistics: stats,
          exportedAt: new Date().toISOString()
        };
      }
    }),
    {
      name: "quiz-helper-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        quizSessions: state.quizSessions,
        formConfigurations: state.formConfigurations,
        availableKbs: state.availableKbs,
        // Don't persist loading states and temporary data
      }),
      // Clean up expired sessions on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.clearExpiredSessions(24); // Clean sessions older than 24 hours
          state.resetLoadingStates(); // Reset any loading states
        }
      }
    }
  )
);

// Hook for getting current workspace quiz session  
export const useCurrentQuizSession = (workspaceId: string) => {
  const store = useQuizHelperStore();
  
  // Get state selectors - these are stable references from Zustand
  const session = store.getQuizSession(workspaceId);
  const hasActiveQuiz = store.hasActiveQuiz(workspaceId);
  const formConfig = store.getFormConfiguration(workspaceId);
  const availableKbs = store.getAvailableKbs(workspaceId);
  const stats = store.getQuizStats(workspaceId);
  
  // Memoize actions to prevent re-creation on every render
  const actions = useMemo(() => ({
    updateAnswer: (questionId: string, answer: any) => store.updateUserAnswer(workspaceId, questionId, answer),
    setShowAnswers: (show: boolean) => store.setShowAnswers(workspaceId, show),
    addExplanation: (questionId: string, explanation: string) => store.addWrongAnswerExplanation(workspaceId, questionId, explanation),
    addEvaluation: (questionId: string, evaluation: ShortAnswerEvaluation) => store.addShortAnswerEvaluation(workspaceId, questionId, evaluation),
    updateFormField: (field: keyof QuestionFormData, value: any) => store.updateFormField(workspaceId, field, value),
    clearSession: () => store.clearQuizSession(workspaceId),
    createSession: (questions: GeneratedQuestion[], details: GenerationDetails) => store.createQuizSession(workspaceId, questions, details),
    setKbs: (kbs: any[]) => store.setAvailableKbs(workspaceId, kbs),
    exportData: () => store.exportQuizData(workspaceId)
  }), [workspaceId, store]);
  
  return {
    session,
    hasActiveQuiz,
    formConfig,
    availableKbs,
    stats,
    ...actions
  };
};

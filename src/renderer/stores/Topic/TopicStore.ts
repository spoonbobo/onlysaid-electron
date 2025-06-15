/*
 Please be careful when changing this file. It is used in many places.
 It impacts user's experience directly.
*/

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useMemo } from 'react';
import { IFile } from '@/../../types/File/File';

// Define and export the key
export const KNOWLEDGE_BASE_SELECTION_KEY = "knowledgeBaseMenu:selectedId";

export interface TopicContext {
  id?: string;
  name: string;
  type:
  "home" |
  "workspace" |
  "settings" |
  "file" |
  "playground" |
  "calendar" |
  "workspace:calendar"
  section?: string;
}

interface StreamState {
  messageId: string | null;
  chatId: string | null;
  streamId: string | null;
  completionTime?: number;
}

// Navigation history interface
interface NavigationHistory {
  contexts: TopicContext[];
  currentIndex: number;
  maxSize: number;
}

interface TopicStore {
  contexts: TopicContext[];
  selectedContext: TopicContext | null;
  lastSections: Record<string, string | undefined>;
  addContext: (context: TopicContext) => void;
  removeContext: (context: TopicContext) => void;
  setSelectedContext: (context: TopicContext) => void;

  // Navigation history
  navigationHistory: NavigationHistory;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  goBack: () => void;
  goForward: () => void;
  addToHistory: (context: TopicContext) => void;

  selectedTopics: Record<string, string>;
  setSelectedTopic: (sectionName: string, topicId: string) => void;
  clearSelectedTopic: (sectionName: string) => void;
  validateSelectedTopics: (existingChatIds: string[]) => void;

  replyingToId: string | null;
  setReplyingTo: (messageId: string | null) => void;

  attachmentsByContext: Record<string, Record<string, any>>;
  attachments: Record<string, any>;
  setAttachment: (type: string, file: File, operationId?: string, uploadedFile?: IFile | null, status?: 'uploading' | 'completed' | 'failed') => void;
  clearAttachments: () => void;
  getContextKey: () => string;

  streamingState: StreamState;
  completedStreams: Record<string, StreamState>;
  setStreamingState: (messageId: string | null, chatId: string | null) => void;
  markStreamAsCompleted: (chatId: string, content: string) => void;
  clearCompletedStream: (chatId: string) => void;

  scrollPositions: Record<string, number>;
  setScrollPosition: (chatId: string, position: number) => void;
  getScrollPosition: (chatId: string) => number;

  selectedCalendarDate: string | null;
  setSelectedCalendarDate: (date: Date | null) => void;

  calendarViewMode: CalendarViewMode;
  setCalendarViewMode: (mode: CalendarViewMode) => void;
}

export type CalendarViewMode = "month" | "week" | "day";

// Helper function to compare contexts
const areContextsEqual = (a: TopicContext, b: TopicContext): boolean => {
  return a.name === b.name && 
         a.type === b.type && 
         a.id === b.id && 
         a.section === b.section;
};

export const useTopicStore = create<TopicStore>()(
  persist(
    (set, get) => ({
      contexts: [
        { name: "home", type: "home" },
        { name: "workspace", type: "workspace" },
        { name: "settings", type: "settings" },
        { name: "file", type: "file" },
        { name: "playground", type: "playground" }
      ],
      selectedContext: { name: "home", type: "home", section: "homepage" },
      lastSections: {},

      // Initialize navigation history
      navigationHistory: {
        contexts: [{ name: "home", type: "home", section: "homepage" }],
        currentIndex: 0,
        maxSize: 10
      },

      addContext: (context) =>
        set((state) => ({
          contexts: [...state.contexts, {
            ...context,
            id: context.id || `${context.name}:${context.type}`
          }]
        })),

      removeContext: (context) =>
        set((state) => ({
          contexts: state.contexts.filter(
            (c) => c.name !== context.name || c.type !== context.type
          ),
          selectedContext:
            state.selectedContext?.name === context.name &&
              state.selectedContext?.type === context.type
              ? (state.contexts.length > 1 ? state.contexts[0] : null)
              : state.selectedContext
        })),

      // Navigation history methods
      canGoBack: () => {
        const state = get();
        return state.navigationHistory.currentIndex > 0;
      },

      canGoForward: () => {
        const state = get();
        return state.navigationHistory.currentIndex < state.navigationHistory.contexts.length - 1;
      },

      goBack: () => {
        const state = get();
        if (state.canGoBack()) {
          const newIndex = state.navigationHistory.currentIndex - 1;
          const contextToNavigateTo = state.navigationHistory.contexts[newIndex];
          
          set((state) => ({
            navigationHistory: {
              ...state.navigationHistory,
              currentIndex: newIndex
            },
            selectedContext: contextToNavigateTo
          }));
        }
      },

      goForward: () => {
        const state = get();
        if (state.canGoForward()) {
          const newIndex = state.navigationHistory.currentIndex + 1;
          const contextToNavigateTo = state.navigationHistory.contexts[newIndex];
          
          set((state) => ({
            navigationHistory: {
              ...state.navigationHistory,
              currentIndex: newIndex
            },
            selectedContext: contextToNavigateTo
          }));
        }
      },

      addToHistory: (context) => {
        set((state) => {
          const currentHistory = state.navigationHistory;
          const lastContext = currentHistory.contexts[currentHistory.currentIndex];
          
          // Don't add if it's the same as the current context
          if (lastContext && areContextsEqual(lastContext, context)) {
            return state;
          }

          // Remove any contexts after current index (when navigating to a new context after going back)
          const newContexts = currentHistory.contexts.slice(0, currentHistory.currentIndex + 1);
          
          // Add the new context
          newContexts.push(context);
          
          // Keep only the last maxSize contexts
          const trimmedContexts = newContexts.slice(-currentHistory.maxSize);
          
          return {
            navigationHistory: {
              ...currentHistory,
              contexts: trimmedContexts,
              currentIndex: trimmedContexts.length - 1
            }
          };
        });
      },

      setSelectedContext: (newContext) =>
        set((state) => {
          let lastSections = { ...state.lastSections };
          if (state.selectedContext?.section && state.selectedContext?.type) {
            lastSections[state.selectedContext.type] = state.selectedContext.section;
          }

          const updatedContext = { ...newContext };

          if (!updatedContext.section && lastSections[updatedContext.type]) {
            updatedContext.section = lastSections[updatedContext.type];
          }

          let updatedSelectedTopics = state.selectedTopics;

          const prevEffectiveWorkspaceId = state.selectedContext?.type === "workspace" ? state.selectedContext.id : null;
          const newEffectiveWorkspaceId = newContext.type === "workspace" ? newContext.id : null;

          if (prevEffectiveWorkspaceId !== newEffectiveWorkspaceId) {
            if (state.selectedTopics[KNOWLEDGE_BASE_SELECTION_KEY]) {
              updatedSelectedTopics = { ...state.selectedTopics };
              delete updatedSelectedTopics[KNOWLEDGE_BASE_SELECTION_KEY];
            }
          }

          const newContextKey = newContext.type === 'workspace' && newContext.id ?
            `workspace:${newContext.id}` :
            newContext.type === 'home' ? 'home' :
              newContext.type === 'settings' ? 'settings' :
                newContext.type === 'file' ? 'file' :
                  newContext.type === 'playground' ? 'playground' :
                    `${newContext.type}:${newContext.name}`;

          const contextAttachments = { ...(state.attachmentsByContext[newContextKey] || {}) };

          // Add to navigation history
          state.addToHistory(updatedContext);

          return {
            selectedContext: updatedContext,
            lastSections,
            selectedTopics: updatedSelectedTopics,
            attachments: contextAttachments
          };
        }),

      selectedTopics: {},

      setSelectedTopic: (sectionName, topicId) =>
        set((state) => ({
          selectedTopics: {
            ...state.selectedTopics,
            [sectionName]: topicId,
          },
        })),

      clearSelectedTopic: (sectionName) =>
        set((state) => {
          const updatedTopics = { ...state.selectedTopics };
          delete updatedTopics[sectionName];
          return { selectedTopics: updatedTopics };
        }),

      validateSelectedTopics: (existingChatIds) =>
        set((state) => {
          const validatedTopics = { ...state.selectedTopics };
          let hasChanges = false;

          Object.entries(validatedTopics).forEach(([section, topicId]) => {
            if (!existingChatIds.includes(topicId)) {
              delete validatedTopics[section];
              hasChanges = true;
            }
          });

          return hasChanges ? { selectedTopics: validatedTopics } : state;
        }),

      replyingToId: null,

      setReplyingTo: (messageId) =>
        set({ replyingToId: messageId }),

      attachmentsByContext: {},
      attachments: {},

      getContextKey: () => {
        const state = get();
        const context = state.selectedContext;
        if (!context) return 'default';

        if (context.type === 'workspace' && context.id) {
          return `workspace:${context.id}`;
        }
        if (context.type === 'home') {
          return 'home';
        }
        if (context.type === 'settings') {
          return 'settings';
        }
        if (context.type === 'file') {
          return 'file';
        }
        if (context.type === 'playground') {
          return 'playground';
        }

        return `${context.type}:${context.name}`;
      },

      setAttachment: (type, file, operationId?, uploadedFile?, status?) =>
        set((state) => {
          const contextKey = state.getContextKey();
          const contextAttachments = { ...(state.attachmentsByContext[contextKey] || {}) };

          contextAttachments[type] = {
            type,
            file,
            operationId,
            uploadedFile: uploadedFile || undefined,
            isUploaded: status === 'completed' && !!uploadedFile,
            isUploading: status === 'uploading' || (!status && !!operationId && !uploadedFile),
            isFailed: status === 'failed',
            fileName: file.name,
            fileSize: file.size,
            showProgress: status === 'uploading' || (!status && !!operationId && !uploadedFile)
          };

          return {
            attachmentsByContext: {
              ...state.attachmentsByContext,
              [contextKey]: contextAttachments
            },
            attachments: contextAttachments
          };
        }),

      clearAttachments: () =>
        set((state) => {
          const contextKey = state.getContextKey();
          const newAttachmentsByContext = { ...state.attachmentsByContext };
          delete newAttachmentsByContext[contextKey];

          return {
            attachmentsByContext: newAttachmentsByContext,
            attachments: {}
          };
        }),

      streamingState: { messageId: null, chatId: null, streamId: null },
      completedStreams: {},

      setStreamingState: (messageId, chatId) =>
        set((state) => {
          if (state.streamingState.messageId && !messageId && state.streamingState.chatId) {
            return {
              streamingState: {
                messageId: null,
                chatId: null,
                streamId: null
              },
              completedStreams: {
                ...state.completedStreams,
                [state.streamingState.chatId]: {
                  ...state.streamingState,
                  completionTime: Date.now()
                }
              }
            };
          }

          return {
            streamingState: {
              messageId,
              chatId,
              streamId: messageId ? `stream-${messageId}` : null
            }
          };
        }),

      markStreamAsCompleted: (chatId, content) =>
        set((state) => {
          if (!chatId) return state;

          if (state.streamingState.chatId === chatId && state.streamingState.messageId) {
            const streamToComplete = { ...state.streamingState };
            const updatedCompletedStreams = { ...state.completedStreams };
            updatedCompletedStreams[chatId] = {
              ...streamToComplete,
              completionTime: Date.now()
            };
            return {
              completedStreams: updatedCompletedStreams
            };
          }
          return state;
        }),

      clearCompletedStream: (chatId) =>
        set((state) => {
          if (!chatId) return state;

          const updatedCompletedStreams = { ...state.completedStreams };
          delete updatedCompletedStreams[chatId];

          return {
            completedStreams: updatedCompletedStreams
          };
        }),

      scrollPositions: {},

      setScrollPosition: (chatId, position) =>
        set((state) => {
          const currentPos = state.scrollPositions[chatId] || 0;
          if (Math.abs(currentPos - position) > 50) {
            return {
              scrollPositions: {
                ...state.scrollPositions,
                [chatId]: position
              }
            };
          }
          return state;
        }),

      getScrollPosition: (chatId) => {
        return get().scrollPositions[chatId] || 0;
      },

      selectedCalendarDate: null,
      setSelectedCalendarDate: (date) => set({ selectedCalendarDate: date ? date.toISOString() : null }),

      calendarViewMode: "month",
      setCalendarViewMode: (mode) => set({ calendarViewMode: mode }),
    }),
    {
      name: "topic-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedContext: state.selectedContext,
        lastSections: state.lastSections,
        selectedTopics: state.selectedTopics,
        contexts: state.contexts,
        scrollPositions: state.scrollPositions,
        navigationHistory: state.navigationHistory,
      }),
      version: 10, // Increment version due to new navigationHistory field
    }
  )
);

export const useCurrentTopicContext = () => useTopicStore();

export const useSelectedCalendarDate = () => {
  const isoDate = useTopicStore((state) => state.selectedCalendarDate);

  return useMemo(() => {
    if (!isoDate) return null;
    try {
      return new Date(isoDate);
    } catch (e) {
      console.error("Error parsing selectedCalendarDate from store:", e);
      return null;
    }
  }, [isoDate]);
};
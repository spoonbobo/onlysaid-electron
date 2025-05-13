/*
 Please be careful when changing this file. It is used in many places.
 It impacts user's experience directly.
*/

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface TopicContext {
  id?: string;
  name: string;
  type:
  "home" |
  "workspace" |
  "settings" |
  "file" |
  "playground" |
  "workspace:calendar"
  section?: string;
}

interface StreamState {
  messageId: string | null;
  chatId: string | null;
  streamId: string | null;
}

interface TopicStore {
  contexts: TopicContext[];
  selectedContext: TopicContext | null;
  lastSections: Record<string, string | undefined>;
  addContext: (context: TopicContext) => void;
  removeContext: (context: TopicContext) => void;
  setSelectedContext: (context: TopicContext) => void;

  selectedTopics: Record<string, string>;
  setSelectedTopic: (sectionName: string, topicId: string) => void;
  clearSelectedTopic: (sectionName: string) => void;
  validateSelectedTopics: (existingChatIds: string[]) => void;

  replyingToId: string | null;
  setReplyingTo: (messageId: string | null) => void;

  attachments: Record<string, any>;
  setAttachment: (type: string, file: any) => void;
  clearAttachments: () => void;

  streamingState: StreamState;
  completedStreams: Record<string, StreamState>;
  setStreamingState: (messageId: string | null, chatId: string | null) => void;
  markStreamAsCompleted: (chatId: string, content: string) => void;
  clearCompletedStream: (chatId: string) => void;

  scrollPositions: Record<string, number>;
  setScrollPosition: (chatId: string, position: number) => void;
  getScrollPosition: (chatId: string) => number;
}

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
      selectedContext: { name: "home", type: "home" },
      lastSections: {},

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

      setSelectedContext: (context) =>
        set((state) => {
          let lastSections = { ...state.lastSections };
          if (state.selectedContext?.section && state.selectedContext?.type) {
            lastSections[state.selectedContext.type] = state.selectedContext.section;
          }

          const updatedContext = { ...context };

          if (!updatedContext.section && lastSections[updatedContext.type]) {
            updatedContext.section = lastSections[updatedContext.type];
          }

          return {
            selectedContext: updatedContext,
            lastSections
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

      attachments: {},

      setAttachment: (type, file) =>
        set((state) => ({
          attachments: {
            ...state.attachments,
            [type]: file,
          },
        })),

      clearAttachments: () =>
        set({ attachments: {} }),

      streamingState: { messageId: null, chatId: null, streamId: null },
      completedStreams: {},

      setStreamingState: (messageId, chatId) =>
        set((state) => {
          // If we're clearing streaming state, keep track of the completed stream
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
                  ...state.streamingState
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

          // If there's a streaming state for this chatId, save it as completed
          if (state.streamingState.chatId === chatId && state.streamingState.messageId) {
            return {
              completedStreams: {
                ...state.completedStreams,
                [chatId]: { ...state.streamingState }
              }
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
          // Only update if necessary (>50px change) to reduce state updates
          const currentPos = state.scrollPositions[chatId] || 0;
          if (Math.abs(currentPos - position) > 50) {
            return {
              scrollPositions: {
                ...state.scrollPositions,
                [chatId]: position
              }
            };
          }
          return state; // Return unchanged state if difference is small
        }),

      getScrollPosition: (chatId) => {
        return get().scrollPositions[chatId] || 0;
      }
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
      }),
      version: 7, // Increment version when changing store structure
    }
  )
);

export const useCurrentTopicContext = () => useTopicStore();
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// Define the Tab/Context type
export interface TopicContext {
  name: string;
  type: "home" | "team" | "settings";
  section?: string;
}

interface TopicStore {
  // Context management
  contexts: TopicContext[];
  selectedContext: TopicContext | null;
  addContext: (context: TopicContext) => void;
  removeContext: (context: TopicContext) => void;
  setSelectedContext: (context: TopicContext) => void;

  // Topic selection (nested approach)
  selectedTopicsByContext: Record<string, Record<string, string>>;
  setSelectedTopic: (sectionName: string, topicId: string) => void;
  clearSelectedTopic: (sectionName: string) => void;
  getCurrentContextTopics: () => Record<string, string>;

  // Group expansion (per context)
  expandedGroupsByContext: Record<string, Record<string, boolean>>;
  setGroupExpanded: (sectionName: string, expanded: boolean) => void;
  getCurrentContextExpandedGroups: () => Record<string, boolean>;
}

export const useTopicStore = create<TopicStore>()(
  persist(
    (set, get) => ({
      // Initialize contexts with default values
      contexts: [
        { name: "home", type: "home" },
        { name: "team", type: "team" },
        { name: "settings", type: "settings" }
      ],
      // Initialize selectedContext with the first context
      selectedContext: { name: "home", type: "home" },

      addContext: (context) =>
        set((state) => ({
          contexts: [...state.contexts, context]
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
        set({ selectedContext: context }),

      // Topic management
      selectedTopicsByContext: {},

      setSelectedTopic: (sectionName, topicId) =>
        set((state) => {
          if (!state.selectedContext) return state;

          const contextKey = `${state.selectedContext.name}:${state.selectedContext.type}`;

          return {
            selectedTopicsByContext: {
              ...state.selectedTopicsByContext,
              [contextKey]: {
                ...(state.selectedTopicsByContext[contextKey] || {}),
                [sectionName]: topicId,
              },
            },
          };
        }),

      clearSelectedTopic: (sectionName) =>
        set((state) => {
          if (!state.selectedContext) return state;

          const contextKey = `${state.selectedContext.name}:${state.selectedContext.type}`;
          const updatedContextTopics = {
            ...state.selectedTopicsByContext[contextKey] || {}
          };
          delete updatedContextTopics[sectionName];

          return {
            selectedTopicsByContext: {
              ...state.selectedTopicsByContext,
              [contextKey]: updatedContextTopics,
            },
          };
        }),

      // Group expansion management
      expandedGroupsByContext: {},

      setGroupExpanded: (sectionName, expanded) =>
        set((state) => {
          const contextKey = `${state.selectedContext?.name}:${state.selectedContext?.type}`;
          return {
            expandedGroupsByContext: {
              ...state.expandedGroupsByContext,
              [contextKey]: {
                ...(state.expandedGroupsByContext[contextKey] || {}),
                [sectionName]: expanded,
              },
            },
          };
        }),

      // Helper functions
      getCurrentContextTopics: () => {
        const { selectedContext, selectedTopicsByContext } = get();
        if (!selectedContext) return {};

        const contextKey = `${selectedContext.name}:${selectedContext.type}`;
        return selectedTopicsByContext[contextKey] || {};
      },

      getCurrentContextExpandedGroups: () => {
        const { selectedContext, expandedGroupsByContext } = get();
        if (!selectedContext) return {};

        const contextKey = `${selectedContext.name}:${selectedContext.type}`;
        return expandedGroupsByContext[contextKey] || {};
      },
    }),
    {
      name: "topic-context-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState,
          selectedContext: persistedState.selectedContext || { name: "home", type: "home" },
        };
      },
    }
  )
);

// Convenience hooks for working with the current context
export const useCurrentTopicContext = () => {
  const {
    selectedContext,
    getCurrentContextTopics,
    getCurrentContextExpandedGroups,
    setSelectedTopic,
    clearSelectedTopic,
    setGroupExpanded,
  } = useTopicStore();

  return {
    selectedContext,
    selectedTopics: getCurrentContextTopics(),
    expandedGroups: getCurrentContextExpandedGroups(),
    setSelectedTopic: (groupName: string, topic: string, section?: string) => {
      if (selectedContext) {
        setSelectedTopic(groupName, topic);
      }
    },
    clearSelectedTopic: (groupName: string) => {
      if (selectedContext) {
        clearSelectedTopic(groupName);
      }
    },
    setGroupExpanded: (groupName: string, expanded: boolean) => {
      if (selectedContext) {
        setGroupExpanded(groupName, expanded);
      }
    }
  };
};

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ITopicSelection } from "../../models/Topic/Topic";

// Define the Tab/Context type
interface TopicContext {
  name: string;
  type: "home" | "team" | "settings";
}

interface TopicStore {
  contexts: TopicContext[];
  selectedContext: TopicContext | null;
  addContext: (context: TopicContext) => void;
  removeContext: (context: TopicContext) => void;
  setSelectedContext: (context: TopicContext) => void;

  // Topic selection per context
  selectedTopicsByContext: Record<string, Record<string, string>>;
  setSelectedTopic: (contextName: string, contextType: string, groupName: string, topic: string) => void;
  clearSelectedTopic: (contextName: string, contextType: string, groupName: string) => void;

  // Group expansion per context
  expandedGroupsByContext: Record<string, Record<string, boolean>>;
  setGroupExpanded: (contextName: string, contextType: string, groupName: string, expanded: boolean) => void;

  // Helper to get current context's selected topics and expanded groups
  getCurrentContextTopics: () => ITopicSelection;
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

      setSelectedTopic: (contextName, contextType, groupName, topic) =>
        set((state) => ({
          selectedTopicsByContext: {
            ...state.selectedTopicsByContext,
            [`${contextName}:${contextType}`]: {
              ...(state.selectedTopicsByContext[`${contextName}:${contextType}`] || {}),
              [groupName]: topic,
            },
          },
        })),

      clearSelectedTopic: (contextName, contextType, groupName) =>
        set((state) => {
          const contextKey = `${contextName}:${contextType}`;
          const updatedContextTopics = { ...state.selectedTopicsByContext[contextKey] || {} };
          delete updatedContextTopics[groupName];

          return {
            selectedTopicsByContext: {
              ...state.selectedTopicsByContext,
              [contextKey]: updatedContextTopics,
            },
          };
        }),

      // Group expansion management
      expandedGroupsByContext: {},

      setGroupExpanded: (contextName, contextType, groupName, expanded) =>
        set((state) => {
          const contextKey = `${contextName}:${contextType}`;
          return {
            expandedGroupsByContext: {
              ...state.expandedGroupsByContext,
              [contextKey]: {
                ...(state.expandedGroupsByContext[contextKey] || {}),
                [groupName]: expanded,
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
    setGroupExpanded
  } = useTopicStore();

  return {
    selectedContext,
    selectedTopics: getCurrentContextTopics(),
    expandedGroups: getCurrentContextExpandedGroups(),
    setSelectedTopic: (groupName: string, topic: string) => {
      if (selectedContext) {
        setSelectedTopic(selectedContext.name, selectedContext.type, groupName, topic);
      }
    },
    clearSelectedTopic: (groupName: string) => {
      if (selectedContext) {
        clearSelectedTopic(selectedContext.name, selectedContext.type, groupName);
      }
    },
    setGroupExpanded: (groupName: string, expanded: boolean) => {
      if (selectedContext) {
        setGroupExpanded(selectedContext.name, selectedContext.type, groupName, expanded);
      }
    }
  };
};
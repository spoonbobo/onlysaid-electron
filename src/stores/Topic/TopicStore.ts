import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { WindowTab } from "./WindowStore";

export interface TopicContext {
  id?: string;
  name: string;
  type: "home" | "team" | "settings";
  section?: string;
  parentId?: string;
}

interface TopicStore {
  contexts: TopicContext[];
  selectedContext: TopicContext | null;
  addContext: (context: TopicContext) => void;
  removeContext: (context: TopicContext) => void;
  setSelectedContext: (context: TopicContext) => void;

  selectedTopicsByContext: Record<string, Record<string, string>>;
  setSelectedTopic: (sectionName: string, topicId: string) => void;
  clearSelectedTopic: (sectionName: string) => void;
  getCurrentContextTopics: () => Record<string, string>;

  expandedGroupsByContext: Record<string, Record<string, boolean>>;
  setGroupExpanded: (sectionName: string, expanded: boolean) => void;
  getCurrentContextExpandedGroups: () => Record<string, boolean>;

  contextParents: Record<string, string>;
  setContextParent: (contextId: string, parentId: string) => void;
  getContextByParent: (parentId: string) => TopicContext | null;

  tabs: WindowTab[];
  activeTabId: string;
  setActiveTab: (tabId: string) => void;

  cleanupDanglingReferences: () => void;

  trustModeByContext: Record<string, boolean>;
  setTrustMode: (trustMode: boolean) => void;
  getTrustMode: () => boolean;
}

export const useTopicStore = create<TopicStore>()(
  persist(
    (set, get) => ({
      contexts: [
        { name: "home", type: "home" },
        { name: "team", type: "team" },
        { name: "settings", type: "settings" }
      ],
      selectedContext: { name: "home", type: "home" },

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
        set({ selectedContext: context }),

      selectedTopicsByContext: {},

      setSelectedTopic: (sectionName, topicId) =>
        set((state) => {
          if (!state.selectedContext) return state;

          const parentId = state.contextParents[`${state.selectedContext.name}:${state.selectedContext.type}`] || '';
          const contextKey = `${parentId}-${state.selectedContext.name}:${state.selectedContext.type}`;

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

      expandedGroupsByContext: {},

      setGroupExpanded: (sectionName, expanded) =>
        set((state) => {
          if (!state.selectedContext) return state;

          const contextKey = `${state.selectedContext.name}:${state.selectedContext.type}`;
          const parentId = state.contextParents[contextKey] || '';

          const tabContextKey = `${parentId}-${contextKey}`;

          return {
            expandedGroupsByContext: {
              ...state.expandedGroupsByContext,
              [tabContextKey]: {
                ...(state.expandedGroupsByContext[tabContextKey] || {}),
                [sectionName]: expanded,
              },
            },
          };
        }),

      getCurrentContextTopics: () => {
        const { selectedContext, selectedTopicsByContext, contextParents } = get();
        if (!selectedContext) return {};

        const parentId = contextParents[`${selectedContext.name}:${selectedContext.type}`] || '';
        const contextKey = `${parentId}-${selectedContext.name}:${selectedContext.type}`;

        return selectedTopicsByContext[contextKey] || {};
      },

      getCurrentContextExpandedGroups: () => {
        const { selectedContext, expandedGroupsByContext, contextParents } = get();
        if (!selectedContext) return {};

        const contextKey = `${selectedContext.name}:${selectedContext.type}`;
        const parentId = contextParents[contextKey] || '';

        const tabContextKey = `${parentId}-${contextKey}`;

        return expandedGroupsByContext[tabContextKey] || {};
      },

      contextParents: {},

      setContextParent: (contextId, parentId) =>
        set((state) => ({
          contextParents: {
            ...state.contextParents,
            [contextId]: parentId
          }
        })),

      getContextByParent: (parentId) => {
        const { contexts, contextParents } = get();
        const contextId = Object.entries(contextParents)
          .find(([ctxId, pId]) => pId === parentId)?.[0];

        if (!contextId) return null;

        return contexts.find(ctx =>
          `${ctx.name}:${ctx.type}` === contextId
        ) || null;
      },

      tabs: [],
      activeTabId: "",
      setActiveTab: (tabId) => {
        set((state) => {
          const targetTab = state.tabs.find(tab => tab.id === tabId);
          if (!targetTab) {
            console.warn("Attempted to activate non-existent tab:", tabId);
            return state;
          }

          const topicStore = useTopicStore.getState();
          topicStore.setSelectedContext(targetTab.context);

          if (window.electron) {
            window.electron.ipcRenderer.sendMessage('window:focus-tab', {
              tabId: tabId
            });
          }

          const newState = {
            tabs: state.tabs.map(tab => ({
              ...tab,
              active: tab.id === tabId
            })),
            activeTabId: tabId
          };
          return newState;
        });
      },

      trustModeByContext: {},

      setTrustMode: (trustMode) =>
        set((state) => {
          if (!state.selectedContext) return state;

          const parentId = state.contextParents[`${state.selectedContext.name}:${state.selectedContext.type}`] || '';
          const contextKey = `${parentId}-${state.selectedContext.name}:${state.selectedContext.type}`;

          return {
            trustModeByContext: {
              ...state.trustModeByContext,
              [contextKey]: trustMode,
            },
          };
        }),

      getTrustMode: () => {
        const { selectedContext, trustModeByContext, contextParents } = get();
        if (!selectedContext) return false;

        const parentId = contextParents[`${selectedContext.name}:${selectedContext.type}`] || '';
        const contextKey = `${parentId}-${selectedContext.name}:${selectedContext.type}`;

        return trustModeByContext[contextKey] || false;
      },

      cleanupDanglingReferences: () => {
        const { useWindowStore } = require("./WindowStore");
        const windowStore = useWindowStore.getState();
        const validTabIds = windowStore.tabs.map((tab: WindowTab) => tab.id);

        set((state) => {
          const newExpandedGroups = { ...state.expandedGroupsByContext };
          Object.keys(newExpandedGroups).forEach(key => {
            const parts = key.split('-');
            const tabId = parts.length > 1 ? parts[0] : '';

            if (tabId && !validTabIds.includes(tabId)) {
              delete newExpandedGroups[key];
            }

            if (key.startsWith('-')) {
              delete newExpandedGroups[key];
            }
          });

          // Clean up trust mode for non-existent tabs
          const newTrustMode = { ...state.trustModeByContext };
          Object.keys(newTrustMode).forEach(key => {
            const parts = key.split('-');
            const tabId = parts.length > 1 ? parts[0] : '';

            if (tabId && !validTabIds.includes(tabId)) {
              delete newTrustMode[key];
            }

            if (key.startsWith('-')) {
              delete newTrustMode[key];
            }
          });

          return {
            expandedGroupsByContext: newExpandedGroups,
            trustModeByContext: newTrustMode
          };
        });
      },
    }),
    {
      name: "topic-context-storage",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState,
          selectedContext: persistedState.selectedContext || { name: "home", type: "home" },
          contextParents: persistedState.contextParents || {},
          trustModeByContext: persistedState.trustModeByContext || {},
        };
      },
    }
  )
);

export const useCurrentTopicContext = () => {
  const {
    selectedContext,
    getCurrentContextTopics,
    getCurrentContextExpandedGroups,
    setSelectedTopic,
    clearSelectedTopic,
    setGroupExpanded,
    contextParents,
    getTrustMode,
    setTrustMode,
  } = useTopicStore();

  return {
    selectedContext,
    parentId: selectedContext ? contextParents[`${selectedContext.name}:${selectedContext.type}`] : null,
    selectedTopics: getCurrentContextTopics(),
    expandedGroups: getCurrentContextExpandedGroups(),
    trustMode: getTrustMode(),
    setTrustMode,
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
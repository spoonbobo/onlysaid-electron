import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { TopicContext } from "./TopicStore";
import { useTopicStore } from "./TopicStore";

export interface WindowTab {
  id: string;
  title: string;
  contextId: string;
  context: TopicContext;
  createdAt: number;
  active: boolean;
}

interface WindowStore {
  tabs: WindowTab[];
  activeTabId: string | null;

  addTab: (context: TopicContext) => WindowTab;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, newTitle: string) => void;
  updateActiveTabContext: (newContext: TopicContext) => void;

  repairStore: () => void;
  resetStore: () => void;
}

const isValidTab = (tab: any): boolean => {
  return (
    tab &&
    typeof tab === 'object' &&
    typeof tab.id === 'string' &&
    typeof tab.title === 'string' &&
    typeof tab.contextId === 'string' &&
    tab.context &&
    typeof tab.context === 'object' &&
    typeof tab.context.name === 'string' &&
    typeof tab.context.type === 'string' &&
    (tab.context.type === 'home' || tab.context.type === 'team' || tab.context.type === 'settings') &&
    typeof tab.createdAt === 'number' &&
    typeof tab.active === 'boolean'
  );
};

const ensureValidContext = (context: any): TopicContext => {
  if (
    context &&
    typeof context === 'object' &&
    typeof context.name === 'string' &&
    typeof context.type === 'string' &&
    (context.type === 'home' || context.type === 'team' || context.type === 'settings')
  ) {
    return context as TopicContext;
  }

  console.warn("Invalid context provided, using default home context", context);
  return { name: "home", type: "home" };
};

export const useWindowStore = create<WindowStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (context) => {
        const validContext = ensureValidContext(context);

        const newTab: WindowTab = {
          id: uuidv4(),
          title: validContext.name,
          contextId: `${validContext.name}:${validContext.type}`,
          context: validContext,
          createdAt: Date.now(),
          active: true,
        };

        const topicStore = useTopicStore.getState();
        topicStore.setContextParent(newTab.contextId, newTab.id);

        set((state) => {
          const newState = {
            tabs: [
              ...state.tabs.map(tab => ({ ...tab, active: false })),
              newTab
            ],
            activeTabId: newTab.id,
          };
          return newState;
        });

        if (window.electron) {
          window.electron.ipcRenderer.sendMessage('window:create-tab', {
            tabId: newTab.id,
            context: newTab.context
          });
        }

        return newTab;
      },

      closeTab: (tabId) => {
        set((state) => {
          const tabIndex = state.tabs.findIndex(tab => tab.id === tabId);
          if (tabIndex === -1) {
            console.warn("Attempted to close non-existent tab:", tabId);
            return state;
          }

          const tabToClose = state.tabs[tabIndex];
          const contextId = `${tabToClose.context.name}:${tabToClose.context.type}`;
          const topicStore = useTopicStore.getState();

          // Create a comprehensive cleanup function
          const cleanupContextData = () => {
            // Clean parent references
            const newContextParents = { ...topicStore.contextParents };
            delete newContextParents[contextId];

            // Clean selected topics - handle both formats of key
            const newSelectedTopics = { ...topicStore.selectedTopicsByContext };
            const tabContextKey = `${tabId}-${contextId}`;
            delete newSelectedTopics[tabContextKey];
            delete newSelectedTopics[contextId]; // Clean legacy format too

            // Clean expanded groups - handle both formats of key
            const newExpandedGroups = { ...topicStore.expandedGroupsByContext };
            delete newExpandedGroups[tabContextKey];
            delete newExpandedGroups[contextId]; // Clean legacy format too

            return { newContextParents, newSelectedTopics, newExpandedGroups };
          };

          // Perform comprehensive cleanup
          const { newContextParents, newSelectedTopics, newExpandedGroups } = cleanupContextData();

          // Update the topic store with cleaned data
          useTopicStore.setState({
            contextParents: newContextParents,
            selectedTopicsByContext: newSelectedTopics,
            expandedGroupsByContext: newExpandedGroups
          });

          // Run additional cleanup to catch any dangling references
          setTimeout(() => {
            useTopicStore.getState().cleanupDanglingReferences();
          }, 0);

          // Tab removal and active tab selection logic
          const newTabs = [...state.tabs];
          newTabs.splice(tabIndex, 1);

          let newActiveTabId = state.activeTabId;
          if (state.activeTabId === tabId && newTabs.length > 0) {
            const newActiveIndex = Math.max(0, tabIndex - 1);
            newTabs[newActiveIndex].active = true;
            newActiveTabId = newTabs[newActiveIndex].id;
          } else if (newTabs.length === 0) {
            newActiveTabId = null;
          }

          // Notify electron
          if (window.electron) {
            window.electron.ipcRenderer.sendMessage('window:close-tab', { tabId });
          }

          // Add this after the TopicStore cleanup
          try {
            // Import dynamically to avoid circular dependencies
            const { useChatStore } = require("@/stores/Chat/chatStore");
            useChatStore.getState().cleanupTabReferences(tabId);
          } catch (error) {
            console.error("Failed to cleanup chat references:", error);
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId
          };
        });
      },

      setActiveTab: (tabId) => {
        set((state) => {
          const targetTab = state.tabs.find(tab => tab.id === tabId);
          if (!targetTab) {
            console.warn("Attempted to activate non-existent tab:", tabId);
            return state;
          }

          const topicStore = useTopicStore.getState();
          topicStore.setSelectedContext(targetTab.context);

          const contextId = `${targetTab.context.name}:${targetTab.context.type}`;
          topicStore.setContextParent(contextId, targetTab.id);

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

      updateActiveTabContext: (newContext) => {
        set((state) => {
          const { activeTabId, tabs } = state;

          if (!activeTabId) {
            console.warn("No active tab to update context for");
            return state;
          }

          const validContext = ensureValidContext(newContext);
          const newContextId = `${validContext.name}:${validContext.type}`;

          const topicStore = useTopicStore.getState();
          topicStore.setContextParent(newContextId, activeTabId);

          const updatedTabs = tabs.map(tab => {
            if (tab.id === activeTabId) {
              return {
                ...tab,
                title: validContext.name,
                contextId: newContextId,
                context: validContext
              };
            }
            return tab;
          });

          return {
            ...state,
            tabs: updatedTabs
          };
        });
      },

      renameTab: (tabId, newTitle) => {
        set((state) => {
          if (!state.tabs.some(tab => tab.id === tabId)) {
            console.warn("Attempted to rename non-existent tab:", tabId);
            return state;
          }

          if (window.electron) {
            window.electron.ipcRenderer.sendMessage('window:rename-tab', {
              tabId: tabId,
              title: newTitle
            });
          }

          const newState = {
            tabs: state.tabs.map(tab =>
              tab.id === tabId ? { ...tab, title: newTitle } : tab
            )
          };
          return newState;
        });
      },

      repairStore: () => {
        set((state) => {
          const validTabs = Array.isArray(state.tabs)
            ? state.tabs.filter(tab => isValidTab(tab))
            : [];

          let newActiveTabId = state.activeTabId;

          if (!newActiveTabId || !validTabs.some(tab => tab.id === newActiveTabId)) {
            if (validTabs.length > 0) {
              newActiveTabId = validTabs[0].id;
              validTabs[0].active = true;
            } else {
              newActiveTabId = null;
            }
          }

          const tabsWithCorrectActiveState = validTabs.map(tab => ({
            ...tab,
            active: tab.id === newActiveTabId,
            context: ensureValidContext(tab.context)
          }));

          return {
            tabs: tabsWithCorrectActiveState,
            activeTabId: newActiveTabId
          };
        });
      },

      resetStore: () => {
        const tabs = get().tabs;
        if (window.electron) {
          tabs.forEach(tab => {
            window.electron.ipcRenderer.sendMessage('window:close-tab', {
              tabId: tab.id
            });
          });
        }

        set({
          tabs: [],
          activeTabId: null
        });

        try {
          localStorage.removeItem("window-tabs-storage");
        } catch (error) {
          console.error("Failed to clear localStorage", error);
        }
      }
    }),
    {
      name: "window-tabs-storage",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state || !Array.isArray(state.tabs)) {
          console.warn("Invalid state after rehydration, will repair.");
          setTimeout(() => {
            useWindowStore.getState().repairStore();
          }, 0);
        } else {
          const invalidTabs = state.tabs.filter(tab => !isValidTab(tab));
          if (invalidTabs.length > 0) {
            console.warn(`Found ${invalidTabs.length} invalid tabs, will repair.`);
            setTimeout(() => {
              useWindowStore.getState().repairStore();
            }, 0);
          }

          const teamTabs = state.tabs.filter(tab => tab.context?.type === 'team');
          if (teamTabs.length > 0) {
            console.log("Found tabs with team context:", teamTabs);
          }
        }
      }
    }
  )
);
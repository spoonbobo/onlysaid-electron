import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { TopicContext } from "./TopicStore";

// Window tab interface
export interface WindowTab {
  id: string;
  title: string;
  contextId: string; // References a context in the TopicStore
  context: TopicContext;
  createdAt: number;
  active: boolean;
}

interface WindowStore {
  // Tabs management
  tabs: WindowTab[];
  activeTabId: string | null;

  // Actions
  addTab: (context: TopicContext) => WindowTab;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, newTitle: string) => void;
  updateActiveTabContext: (newContext: TopicContext) => void;

  // Utility
  repairStore: () => void;
  resetStore: () => void;
}

// Validate a tab to make sure it has all required properties
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

// Ensure we have a valid context or default to home
const ensureValidContext = (context: any): TopicContext => {
  // If context is already valid, use it
  if (
    context &&
    typeof context === 'object' &&
    typeof context.name === 'string' &&
    typeof context.type === 'string' &&
    (context.type === 'home' || context.type === 'team' || context.type === 'settings')
  ) {
    return context as TopicContext;
  }

  // Otherwise return a default home context
  console.warn("Invalid context provided, using default home context", context);
  return { name: "home", type: "home" };
};

// Create the store
export const useWindowStore = create<WindowStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (context) => {

        // Ensure we have a valid context
        const validContext = ensureValidContext(context);

        // Create the new tab with the validated context
        const newTab: WindowTab = {
          id: uuidv4(),
          title: validContext.name,
          contextId: `${validContext.name}:${validContext.type}`,
          context: validContext,
          createdAt: Date.now(),
          active: true,
        };

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

        // Send IPC message to create a new tab window
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

          const newTabs = [...state.tabs];
          newTabs.splice(tabIndex, 1);

          // If we closed the active tab, activate another one
          let newActiveTabId = state.activeTabId;
          if (state.activeTabId === tabId && newTabs.length > 0) {
            // Try to activate the tab to the left, or the first one
            const newActiveIndex = Math.max(0, tabIndex - 1);
            newTabs[newActiveIndex].active = true;
            newActiveTabId = newTabs[newActiveIndex].id;
          } else if (newTabs.length === 0) {
            newActiveTabId = null;
          }

          // Send IPC message to close tab window
          if (window.electron) {
            window.electron.ipcRenderer.sendMessage('window:close-tab', {
              tabId: tabId
            });
          }

          const newState = {
            tabs: newTabs,
            activeTabId: newActiveTabId
          };
          return newState;
        });
      },

      setActiveTab: (tabId) => {
        set((state) => {
          const targetTab = state.tabs.find(tab => tab.id === tabId);
          if (!targetTab) {
            console.warn("Attempted to activate non-existent tab:", tabId);
            return state;
          }


          // Send IPC message to focus tab window
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

      // Updates the context of the active tab when navigation occurs
      updateActiveTabContext: (newContext) => {

        set((state) => {
          const { activeTabId, tabs } = state;

          if (!activeTabId) {
            console.warn("No active tab to update context for");
            return state;
          }

          const validContext = ensureValidContext(newContext);

          const updatedTabs = tabs.map(tab => {
            if (tab.id === activeTabId) {
              return {
                ...tab,
                title: validContext.name, // Update title to match new context
                contextId: `${validContext.name}:${validContext.type}`,
                context: validContext
              };
            }
            return tab;
          });

          const newState = {
            ...state,
            tabs: updatedTabs
          };

          return newState;
        });
      },

      renameTab: (tabId, newTitle) => {
        set((state) => {
          if (!state.tabs.some(tab => tab.id === tabId)) {
            console.warn("Attempted to rename non-existent tab:", tabId);
            return state;
          }

          // Send IPC message to update tab title
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

      // Utility to repair store if it's corrupted
      repairStore: () => {
        set((state) => {
          // Filter out invalid tabs
          const validTabs = Array.isArray(state.tabs)
            ? state.tabs.filter(tab => isValidTab(tab))
            : [];

          // Make sure we have an active tab
          let newActiveTabId = state.activeTabId;

          // If active tab doesn't exist in valid tabs, select the first one
          if (!newActiveTabId || !validTabs.some(tab => tab.id === newActiveTabId)) {
            if (validTabs.length > 0) {
              newActiveTabId = validTabs[0].id;
              validTabs[0].active = true;
            } else {
              newActiveTabId = null;
            }
          }

          // Make sure only one tab is active
          const tabsWithCorrectActiveState = validTabs.map(tab => ({
            ...tab,
            active: tab.id === newActiveTabId,
            // Ensure each tab has a valid context
            context: ensureValidContext(tab.context)
          }));

          return {
            tabs: tabsWithCorrectActiveState,
            activeTabId: newActiveTabId
          };
        });
      },

      // Completely reset the store to its initial state
      resetStore: () => {

        // Clear any IPC-related resources if needed
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

        // Try to also clear localStorage directly if there's a persistent issue
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

        // Check if state is valid
        if (!state || !Array.isArray(state.tabs)) {
          console.warn("Invalid state after rehydration, will repair.");
          setTimeout(() => {
            useWindowStore.getState().repairStore();
          }, 0);
        } else {
          // Check for any invalid tabs
          const invalidTabs = state.tabs.filter(tab => !isValidTab(tab));
          if (invalidTabs.length > 0) {
            console.warn(`Found ${invalidTabs.length} invalid tabs, will repair.`);
            setTimeout(() => {
              useWindowStore.getState().repairStore();
            }, 0);
          }

          // Also check if any tabs have a team context by default
          const teamTabs = state.tabs.filter(tab => tab.context?.type === 'team');
          if (teamTabs.length > 0) {
            console.log("Found tabs with team context:", teamTabs);
          }
        }
      }
    }
  )
);

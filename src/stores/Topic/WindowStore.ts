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
    windowId?: string; // Reference to the parent window
}

export interface WindowInstance {
    id: string;
    title: string;
    tabs: string[]; // Array of tab IDs
    activeTabId: string | null;
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isMinimized?: boolean;
    isMaximized?: boolean;
}

interface WindowStore {
    tabs: WindowTab[];
    activeTabId: string | null;
    windows: WindowInstance[];
    activeWindowId: string | null;

    // Tab operations
    addTab: (context: TopicContext, windowId?: string) => WindowTab;
    closeTab: (tabId: string) => void;
    setActiveTab: (tabId: string) => void;
    renameTab: (tabId: string, newTitle: string) => void;
    updateActiveTabContext: (newContext: TopicContext) => void;

    // Window operations
    createWindow: (initialContext?: TopicContext) => WindowInstance;
    closeWindow: (windowId: string) => void;
    setActiveWindow: (windowId: string) => void;
    detachTab: (tabId: string) => void; // Move tab to new window
    moveTabToWindow: (tabId: string, targetWindowId: string) => void; // Move tab between windows
    updateWindowBounds: (windowId: string, bounds: { x: number; y: number; width: number; height: number }) => void;
    setWindowState: (windowId: string, isMinimized: boolean, isMaximized: boolean) => void;

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
            windows: [],
            activeWindowId: null,

            addTab: (context, windowId) => {
                const validContext = ensureValidContext(context);

                const newTab: WindowTab = {
                    id: uuidv4(),
                    title: validContext.name,
                    contextId: `${validContext.name}:${validContext.type}`,
                    context: validContext,
                    createdAt: Date.now(),
                    active: true,
                    windowId: windowId || (get().activeWindowId || undefined)
                };

                const topicStore = useTopicStore.getState();
                topicStore.setContextParent(newTab.contextId, newTab.id);

                set((state) => {
                    // Add the tab to the store
                    const updatedTabs = [
                        ...state.tabs.map(tab => ({ ...tab, active: false })),
                        newTab
                    ];

                    // Get the target window (create one if needed)
                    let targetWindowId = newTab.windowId;
                    let updatedWindows = [...state.windows];

                    if (!targetWindowId && state.windows.length === 0) {
                        // Create a new window if none exists
                        const newWindowId = uuidv4();
                        targetWindowId = newWindowId;
                        newTab.windowId = newWindowId;

                        // Create the window
                        updatedWindows.push({
                            id: newWindowId,
                            title: "New Window",
                            tabs: [newTab.id],
                            activeTabId: newTab.id,
                            bounds: {
                                x: 100,
                                y: 100,
                                width: 800,
                                height: 600
                            }
                        });

                        // Send IPC message to create a new window
                        if (window.electron) {
                            window.electron.ipcRenderer.sendMessage('window:create-window', {
                                windowId: newWindowId,
                                tabId: newTab.id,
                                bounds: updatedWindows[updatedWindows.length - 1].bounds
                            });
                        }
                    } else if (targetWindowId) {
                        // Add tab to existing window
                        updatedWindows = updatedWindows.map(window => {
                            if (window.id === targetWindowId) {
                                return {
                                    ...window,
                                    tabs: [...window.tabs, newTab.id],
                                    activeTabId: newTab.id
                                };
                            }
                            return window;
                        });
                    } else {
                        // If no target window specified, use active window
                        const activeWindow = state.windows.find(w => w.id === state.activeWindowId);
                        if (activeWindow) {
                            targetWindowId = activeWindow.id;
                            newTab.windowId = activeWindow.id;

                            updatedWindows = updatedWindows.map(window => {
                                if (window.id === targetWindowId) {
                                    return {
                                        ...window,
                                        tabs: [...window.tabs, newTab.id],
                                        activeTabId: newTab.id
                                    };
                                }
                                return window;
                            });
                        }
                    }

                    // Send IPC message to create the tab in the window
                    if (window.electron) {
                        window.electron.ipcRenderer.sendMessage('window:create-tab', {
                            tabId: newTab.id,
                            windowId: targetWindowId,
                            context: newTab.context
                        });
                    }

                    return {
                        tabs: updatedTabs,
                        activeTabId: newTab.id,
                        windows: updatedWindows,
                        activeWindowId: targetWindowId
                    };
                });

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
                    const windowId = tabToClose.windowId;
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

                    // Update windows state
                    let updatedWindows = [...state.windows];
                    let newActiveWindowId = state.activeWindowId;
                    let newActiveTabId = state.activeTabId;

                    if (windowId) {
                        updatedWindows = updatedWindows.map(window => {
                            if (window.id === windowId) {
                                const windowTabs = window.tabs.filter(id => id !== tabId);

                                // If this was the active tab, select a new one
                                let newWindowActiveTabId = window.activeTabId;
                                if (window.activeTabId === tabId && windowTabs.length > 0) {
                                    // Find the index of the closed tab in the window.tabs array
                                    const windowTabIndex = window.tabs.indexOf(tabId);
                                    // Select the previous tab if possible, otherwise the first tab
                                    const newActiveIndex = Math.max(0, windowTabIndex - 1);
                                    newWindowActiveTabId = windowTabs[newActiveIndex];

                                    // Update global active tab if this window is active
                                    if (window.id === state.activeWindowId) {
                                        newActiveTabId = newWindowActiveTabId;
                                    }
                                } else if (windowTabs.length === 0) {
                                    newWindowActiveTabId = null;

                                    // Update global active tab if this window is active
                                    if (window.id === state.activeWindowId) {
                                        newActiveTabId = null;
                                    }
                                }

                                return {
                                    ...window,
                                    tabs: windowTabs,
                                    activeTabId: newWindowActiveTabId
                                };
                            }
                            return window;
                        });

                        // Close the window if it has no tabs left
                        const windowWithNoTabs = updatedWindows.find(
                            window => window.id === windowId && window.tabs.length === 0
                        );

                        if (windowWithNoTabs) {
                            // Remove the window
                            updatedWindows = updatedWindows.filter(window => window.id !== windowId);

                            // Update active window if needed
                            if (state.activeWindowId === windowId && updatedWindows.length > 0) {
                                newActiveWindowId = updatedWindows[0].id;
                                newActiveTabId = updatedWindows[0].activeTabId;
                            } else if (updatedWindows.length === 0) {
                                newActiveWindowId = null;
                                newActiveTabId = null;
                            }

                            // Send IPC message to close the window
                            if (window.electron) {
                                window.electron.ipcRenderer.sendMessage('window:close-window', { windowId });
                            }
                        }
                    }

                    // Notify electron
                    if (window.electron) {
                        window.electron.ipcRenderer.sendMessage('window:close-tab', {
                            tabId,
                            windowId
                        });
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
                        activeTabId: newActiveTabId,
                        windows: updatedWindows,
                        activeWindowId: newActiveWindowId
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

                    // Update window's active tab
                    let updatedWindows = [...state.windows];
                    if (targetTab.windowId) {
                        updatedWindows = updatedWindows.map(window => {
                            if (window.id === targetTab.windowId) {
                                return {
                                    ...window,
                                    activeTabId: tabId
                                };
                            }
                            return window;
                        });
                    }

                    // Send IPC message to focus the tab and its window
                    if (window.electron) {
                        window.electron.ipcRenderer.sendMessage('window:focus-tab', {
                            tabId: tabId,
                            windowId: targetTab.windowId
                        });
                    }

                    return {
                        tabs: state.tabs.map(tab => ({
                            ...tab,
                            active: tab.id === tabId
                        })),
                        activeTabId: tabId,
                        windows: updatedWindows,
                        activeWindowId: targetTab.windowId || state.activeWindowId
                    };
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

            createWindow: (initialContext) => {
                const windowId = uuidv4();
                const newWindow: WindowInstance = {
                    id: windowId,
                    title: initialContext?.name || "New Window",
                    tabs: [],
                    activeTabId: null,
                    bounds: {
                        x: 100,
                        y: 100,
                        width: 800,
                        height: 600
                    },
                    isMinimized: false,
                    isMaximized: false
                };

                // Create a tab if initial context is provided
                let initialTab: WindowTab | null = null;
                if (initialContext) {
                    initialTab = get().addTab(initialContext, windowId);
                }

                set((state) => ({
                    windows: [...state.windows, newWindow],
                    activeWindowId: windowId
                }));

                // Send IPC message to create actual window
                if (window.electron) {
                    window.electron.ipcRenderer.sendMessage('window:create-window', {
                        windowId,
                        bounds: newWindow.bounds,
                        tabId: initialTab?.id
                    });
                }

                return newWindow;
            },

            closeWindow: (windowId) => {
                set((state) => {
                    const windowToClose = state.windows.find(w => w.id === windowId);
                    if (!windowToClose) {
                        console.warn("Attempted to close non-existent window:", windowId);
                        return state;
                    }

                    // Close all tabs in the window
                    const tabsToClose = [...windowToClose.tabs];
                    tabsToClose.forEach(tabId => {
                        get().closeTab(tabId);
                    });

                    // Remove the window from state
                    const newWindows = state.windows.filter(w => w.id !== windowId);

                    // Select a new active window if needed
                    let newActiveWindowId = state.activeWindowId;
                    if (state.activeWindowId === windowId && newWindows.length > 0) {
                        newActiveWindowId = newWindows[0].id;
                    } else if (newWindows.length === 0) {
                        newActiveWindowId = null;
                    }

                    // Send IPC message to close the window
                    if (window.electron) {
                        window.electron.ipcRenderer.sendMessage('window:close-window', { windowId });
                    }

                    return {
                        windows: newWindows,
                        activeWindowId: newActiveWindowId
                    };
                });
            },

            setActiveWindow: (windowId) => {
                set((state) => {
                    const targetWindow = state.windows.find(w => w.id === windowId);
                    if (!targetWindow) {
                        console.warn("Attempted to activate non-existent window:", windowId);
                        return state;
                    }

                    // If the window has an active tab, set it as the global active tab
                    if (targetWindow.activeTabId) {
                        get().setActiveTab(targetWindow.activeTabId);
                    }

                    // Send IPC message to focus the window
                    if (window.electron) {
                        window.electron.ipcRenderer.sendMessage('window:focus-window', { windowId });
                    }

                    return {
                        activeWindowId: windowId
                    };
                });
            },

            detachTab: (tabId) => {
                set((state) => {
                    const tabToDetach = state.tabs.find(tab => tab.id === tabId);
                    if (!tabToDetach) {
                        console.warn("Attempted to detach non-existent tab:", tabId);
                        return state;
                    }

                    // Create a new window for this tab
                    const newWindowId = uuidv4();
                    const newWindow: WindowInstance = {
                        id: newWindowId,
                        title: tabToDetach.title,
                        tabs: [tabId],
                        activeTabId: tabId,
                        bounds: {
                            x: 150,
                            y: 150,
                            width: 800,
                            height: 600
                        }
                    };

                    // Update the tab to reference the new window
                    const updatedTabs = state.tabs.map(tab => {
                        if (tab.id === tabId) {
                            return { ...tab, windowId: newWindowId };
                        }
                        return tab;
                    });

                    // Remove the tab from its original window
                    const updatedWindows = state.windows.map(window => {
                        if (window.tabs.includes(tabId)) {
                            // Remove the tab from this window
                            const newTabs = window.tabs.filter(id => id !== tabId);

                            // Update activeTabId if necessary
                            let newActiveTabId = window.activeTabId;
                            if (window.activeTabId === tabId && newTabs.length > 0) {
                                newActiveTabId = newTabs[0];
                            } else if (newTabs.length === 0) {
                                newActiveTabId = null;
                            }

                            return {
                                ...window,
                                tabs: newTabs,
                                activeTabId: newActiveTabId
                            };
                        }
                        return window;
                    });

                    // Send IPC message to create a new window with this tab
                    if (window.electron) {
                        window.electron.ipcRenderer.sendMessage('window:detach-tab', {
                            tabId,
                            newWindowId,
                            bounds: newWindow.bounds
                        });
                    }

                    return {
                        tabs: updatedTabs,
                        windows: [...updatedWindows, newWindow],
                        activeWindowId: newWindowId,
                        activeTabId: tabId
                    };
                });
            },

            moveTabToWindow: (tabId, targetWindowId) => {
                set((state) => {
                    const tab = state.tabs.find(t => t.id === tabId);
                    const targetWindow = state.windows.find(w => w.id === targetWindowId);

                    if (!tab || !targetWindow) {
                        console.warn("Tab or target window not found:", { tabId, targetWindowId });
                        return state;
                    }

                    // Remove tab from source window
                    const updatedWindows = state.windows.map(window => {
                        if (window.tabs.includes(tabId)) {
                            // Remove tab from this window
                            const newTabs = window.tabs.filter(id => id !== tabId);

                            // Update activeTabId if necessary
                            let newActiveTabId = window.activeTabId;
                            if (window.activeTabId === tabId && newTabs.length > 0) {
                                newActiveTabId = newTabs[0];
                            } else if (newTabs.length === 0) {
                                newActiveTabId = null;
                            }

                            return {
                                ...window,
                                tabs: newTabs,
                                activeTabId: newActiveTabId
                            };
                        }
                        return window;
                    });

                    // Add tab to target window
                    const finalWindows = updatedWindows.map(window => {
                        if (window.id === targetWindowId) {
                            return {
                                ...window,
                                tabs: [...window.tabs, tabId],
                                activeTabId: tabId // Make the moved tab active
                            };
                        }
                        return window;
                    });

                    // Update the tab's windowId
                    const updatedTabs = state.tabs.map(t => {
                        if (t.id === tabId) {
                            return { ...t, windowId: targetWindowId };
                        }
                        return t;
                    });

                    // Send IPC message to move the tab
                    if (window.electron) {
                        window.electron.ipcRenderer.sendMessage('window:move-tab', {
                            tabId,
                            targetWindowId
                        });
                    }

                    return {
                        tabs: updatedTabs,
                        windows: finalWindows,
                        activeWindowId: targetWindowId,
                        activeTabId: tabId
                    };
                });
            },

            updateWindowBounds: (windowId, bounds) => {
                set((state) => {
                    const updatedWindows = state.windows.map(window => {
                        if (window.id === windowId) {
                            return {
                                ...window,
                                bounds
                            };
                        }
                        return window;
                    });

                    return {
                        windows: updatedWindows
                    };
                });
            },

            setWindowState: (windowId, isMinimized, isMaximized) => {
                set((state) => {
                    const updatedWindows = state.windows.map(window => {
                        if (window.id === windowId) {
                            return {
                                ...window,
                                isMinimized,
                                isMaximized
                            };
                        }
                        return window;
                    });

                    return {
                        windows: updatedWindows
                    };
                });
            },

            repairStore: () => {
                set((state) => {
                    const validTabs = Array.isArray(state.tabs)
                        ? state.tabs.filter(tab => isValidTab(tab))
                        : [];

                    // Ensure all tabs have valid window references
                    const validWindows = Array.isArray(state.windows) ? state.windows : [];
                    const windowIds = validWindows.map(w => w.id);

                    // Fix tabs that reference non-existent windows
                    const repairedTabs = validTabs.map(tab => {
                        if (tab.windowId && !windowIds.includes(tab.windowId)) {
                            console.warn(`Tab ${tab.id} references non-existent window ${tab.windowId}, removing reference`);
                            return { ...tab, windowId: undefined };
                        }
                        return tab;
                    });

                    // Fix windows that reference non-existent tabs
                    const tabIds = repairedTabs.map(t => t.id);
                    const repairedWindows = validWindows.map(window => {
                        // Filter out references to non-existent tabs
                        const validWindowTabs = window.tabs.filter(tabId => tabIds.includes(tabId));

                        // Ensure active tab exists
                        let windowActiveTabId = window.activeTabId;
                        if (!windowActiveTabId || !validWindowTabs.includes(windowActiveTabId)) {
                            windowActiveTabId = validWindowTabs.length > 0 ? validWindowTabs[0] : null;
                        }

                        return {
                            ...window,
                            tabs: validWindowTabs,
                            activeTabId: windowActiveTabId
                        };
                    });

                    // Remove empty windows
                    const nonEmptyWindows = repairedWindows.filter(window => window.tabs.length > 0);

                    // Ensure at least one window exists if we have tabs
                    let finalWindows = nonEmptyWindows;
                    if (repairedTabs.length > 0 && nonEmptyWindows.length === 0) {
                        // Create a default window and assign all tabs to it
                        const defaultWindow: WindowInstance = {
                            id: uuidv4(),
                            title: "Main Window",
                            tabs: repairedTabs.map(t => t.id),
                            activeTabId: repairedTabs[0].id,
                            bounds: {
                                x: 100,
                                y: 100,
                                width: 800,
                                height: 600
                            }
                        };
                        finalWindows = [defaultWindow];

                        // Update tabs to reference the new window
                        repairedTabs.forEach(tab => {
                            tab.windowId = defaultWindow.id;
                        });
                    }

                    // Ensure active window exists
                    let newActiveWindowId = state.activeWindowId;
                    if (!newActiveWindowId || !finalWindows.some(w => w.id === newActiveWindowId)) {
                        newActiveWindowId = finalWindows.length > 0 ? finalWindows[0].id : null;
                    }

                    // Ensure active tab exists and belongs to active window
                    let newActiveTabId = state.activeTabId;
                    const activeWindow = finalWindows.find(w => w.id === newActiveWindowId);

                    if (!newActiveTabId || !repairedTabs.some(t => t.id === newActiveTabId) ||
                        (activeWindow && !activeWindow.tabs.includes(newActiveTabId))) {
                        newActiveTabId = activeWindow?.activeTabId || null;
                    }

                    // Update all tabs to have correct active status
                    const tabsWithCorrectActiveState = repairedTabs.map(tab => ({
                        ...tab,
                        active: tab.id === newActiveTabId,
                        context: ensureValidContext(tab.context)
                    }));

                    return {
                        tabs: tabsWithCorrectActiveState,
                        activeTabId: newActiveTabId,
                        windows: finalWindows,
                        activeWindowId: newActiveWindowId
                    };
                });
            },

            resetStore: () => {
                const { tabs, windows } = get();

                // Close all windows via IPC
                if (window.electron) {
                    // Close all windows using their IDs
                    windows.forEach(windowInstance => {
                        window.electron.ipcRenderer.sendMessage('window:close-window', {
                            windowId: windowInstance.id
                        });
                    });

                    // For backward compatibility, also close all tabs
                    tabs.forEach(tab => {
                        window.electron.ipcRenderer.sendMessage('window:close-tab', {
                            tabId: tab.id
                        });
                    });
                }

                set({
                    tabs: [],
                    activeTabId: null,
                    windows: [],
                    activeWindowId: null
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
            version: 2, // Increment version for store schema change
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

                    // For version 2: Migrate from old format to new format with windows
                    if (!state.windows || !Array.isArray(state.windows) || state.windows.length === 0) {
                        console.log("Migrating to multi-window format");
                        setTimeout(() => {
                            const store = useWindowStore.getState();

                            // Create a main window with all existing tabs
                            if (store.tabs.length > 0 && (!store.windows || store.windows.length === 0)) {
                                const mainWindow: WindowInstance = {
                                    id: uuidv4(),
                                    title: "Main Window",
                                    tabs: store.tabs.map(tab => tab.id),
                                    activeTabId: store.activeTabId,
                                    bounds: {
                                        x: 100,
                                        y: 100,
                                        width: 800,
                                        height: 600
                                    }
                                };

                                // Update all tabs to reference this window
                                const updatedTabs = store.tabs.map(tab => ({
                                    ...tab,
                                    windowId: mainWindow.id
                                }));

                                useWindowStore.setState({
                                    tabs: updatedTabs,
                                    windows: [mainWindow],
                                    activeWindowId: mainWindow.id
                                });
                            }
                        }, 0);
                    }
                }
            },
            migrate: (persistedState: any, version) => {
                if (version === 1) {
                    // Add windows field to persisted state to migrate from v1 to v2
                    return {
                        ...persistedState,
                        windows: [],
                        activeWindowId: null
                    };
                }
                return persistedState;
            }
        }
    )
);

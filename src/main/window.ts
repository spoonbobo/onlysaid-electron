import { ipcMain, BrowserWindow, app, screen } from 'electron';
import * as path from 'path';
import * as url from 'url';

// Map to track tab-specific windows
const tabWindows = new Map<string, BrowserWindow>();
// Map to track windows by ID
const windowInstances = new Map<string, BrowserWindow>();

// Window creation function
const createBrowserWindow = (windowId: string, options: any = {}) => {
    // Get display dimensions
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Create the browser window
    const window = new BrowserWindow({
        width: options.width || Math.min(1200, width * 0.8),
        height: options.height || Math.min(800, height * 0.8),
        x: options.x,
        y: options.y,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: options.title || 'OnlySaid',
        show: false, // Don't show until ready-to-show
        backgroundColor: '#121212' // Dark background for better loading experience
    });

    // Load the app
    if (app.isPackaged) {
        window.loadURL(url.format({
            pathname: path.join(__dirname, '../renderer/index.html'),
            protocol: 'file:',
            slashes: true
        }));
    } else {
        // In development
        window.loadURL('http://localhost:3000');
        // window.webContents.openDevTools();
    }

    // Pass initial state to the window
    window.webContents.on('did-finish-load', () => {
        window.webContents.send('window:init', {
            windowId,
            tabId: options.tabId
        });

        // Show window when content is ready
        window.show();
    });

    // Handle window state changes
    window.on('maximize', () => {
        window.webContents.send('window:state-changed', {
            windowId,
            isMaximized: true,
            isMinimized: false
        });
    });

    window.on('unmaximize', () => {
        window.webContents.send('window:state-changed', {
            windowId,
            isMaximized: false,
            isMinimized: false
        });
    });

    window.on('minimize', () => {
        window.webContents.send('window:state-changed', {
            windowId,
            isMaximized: false,
            isMinimized: true
        });
    });

    window.on('restore', () => {
        window.webContents.send('window:state-changed', {
            windowId,
            isMaximized: false,
            isMinimized: false
        });
    });

    // Save window bounds when moved or resized
    window.on('resize', () => {
        const bounds = window.getBounds();
        window.webContents.send('window:bounds-changed', {
            windowId,
            bounds
        });
    });

    window.on('move', () => {
        const bounds = window.getBounds();
        window.webContents.send('window:bounds-changed', {
            windowId,
            bounds
        });
    });

    // Handle window close
    window.on('close', () => {
        // Remove from both maps
        windowInstances.delete(windowId);
        tabWindows.forEach((win, tabId) => {
            if (win === window) {
                tabWindows.delete(tabId);
            }
        });
    });

    return window;
};

// Setup all window related IPC handlers
export function setupWindowHandlers(mainWindow: BrowserWindow) {
    // Store the main window
    if (mainWindow) {
        windowInstances.set('main', mainWindow);
    }

    // Window management IPC handlers
    ipcMain.on('window:create-window', (event, { windowId, bounds, tabId }) => {
        console.log(`Creating new window: ${windowId} for tab: ${tabId}`);

        // Don't create duplicate windows
        if (windowInstances.has(windowId)) {
            console.log(`Window ${windowId} already exists, focusing instead`);
            const existingWindow = windowInstances.get(windowId);
            if (existingWindow && !existingWindow.isDestroyed()) {
                if (existingWindow.isMinimized()) {
                    existingWindow.restore();
                }
                existingWindow.focus();
                return;
            }
        }

        // Create the window
        const newWindow = createBrowserWindow(windowId, {
            ...bounds,
            tabId
        });

        // Store the window
        windowInstances.set(windowId, newWindow);

        // If this window is for a specific tab, associate them
        if (tabId) {
            tabWindows.set(tabId, newWindow);
        }

        // Sync with other windows
        for (const [id, win] of windowInstances.entries()) {
            if (id !== windowId && win && !win.isDestroyed()) {
                win.webContents.send('window:sync-state', {
                    action: 'window-created',
                    windowId,
                    tabId
                });
            }
        }
    });

    ipcMain.on('window:close-window', (event, { windowId }) => {
        console.log(`Closing window: ${windowId}`);

        const windowToClose = windowInstances.get(windowId);
        if (windowToClose && !windowToClose.isDestroyed()) {
            // Close the BrowserWindow
            windowToClose.close();
            windowInstances.delete(windowId);

            // Also remove any tab associations with this window
            for (const [tabId, win] of tabWindows.entries()) {
                if (win === windowToClose) {
                    tabWindows.delete(tabId);
                }
            }
        }

        // Sync with other windows
        for (const [id, win] of windowInstances.entries()) {
            if (win && !win.isDestroyed()) {
                win.webContents.send('window:sync-state', {
                    action: 'window-closed',
                    windowId
                });
            }
        }
    });

    ipcMain.on('window:focus-window', (event, { windowId }) => {
        console.log(`Focusing window: ${windowId}`);

        const windowToFocus = windowInstances.get(windowId);
        if (windowToFocus && !windowToFocus.isDestroyed()) {
            if (windowToFocus.isMinimized()) {
                windowToFocus.restore();
            }
            windowToFocus.focus();
        }

        // Sync with other windows
        for (const [id, win] of windowInstances.entries()) {
            if (win && !win.isDestroyed()) {
                win.webContents.send('window:sync-state', {
                    action: 'window-focused',
                    windowId
                });
            }
        }
    });

    // Tab/Window management IPC handlers
    ipcMain.on('window:create-tab', (event, { tabId, windowId, context }) => {
        console.log(`Creating new tab: ${tabId} in window: ${windowId} with context:`, context);

        // Get the target window
        const targetWindow = windowId ? windowInstances.get(windowId) : null;

        if (targetWindow && !targetWindow.isDestroyed()) {
            // Associate tab with window
            tabWindows.set(tabId, targetWindow);

            // Notify the window about the new tab
            targetWindow.webContents.send('window:tab-created', {
                tabId,
                windowId,
                context
            });
        }

        // Sync tab state across all windows
        for (const win of windowInstances.values()) {
            if (win && !win.isDestroyed()) {
                win.webContents.send('window:sync-state', {
                    action: 'tab-created',
                    tabId,
                    windowId,
                    context
                });
            }
        }
    });

    ipcMain.on('window:close-tab', (event, { tabId, windowId }) => {
        console.log(`Closing tab: ${tabId} in window: ${windowId}`);

        // If we have an actual window/view for this tab, we'd close it here
        const tabWindow = tabWindows.get(tabId);
        if (tabWindow && !tabWindow.isDestroyed()) {
            // Don't close the window here, just remove the association
            tabWindows.delete(tabId);

            // Notify the window about the closed tab
            tabWindow.webContents.send('window:tab-closed', {
                tabId,
                windowId
            });
        }

        // Sync tab state across all windows
        for (const win of windowInstances.values()) {
            if (win && !win.isDestroyed()) {
                win.webContents.send('window:sync-state', {
                    action: 'tab-closed',
                    tabId,
                    windowId
                });
            }
        }
    });

    ipcMain.on('window:focus-tab', (event, { tabId, windowId }) => {
        console.log(`Focusing tab: ${tabId} in window: ${windowId}`);

        // First focus the window if specified
        if (windowId) {
            const window = windowInstances.get(windowId);
            if (window && !window.isDestroyed()) {
                if (window.isMinimized()) {
                    window.restore();
                }
                window.focus();

                // Then focus the tab within that window
                window.webContents.send('window:tab-focused', {
                    tabId,
                    windowId
                });
            }
        } else {
            // If no window specified, try to find the window with this tab
            const tabWindow = tabWindows.get(tabId);
            if (tabWindow && !tabWindow.isDestroyed()) {
                if (tabWindow.isMinimized()) {
                    tabWindow.restore();
                }
                tabWindow.focus();

                // Focus the tab within that window
                tabWindow.webContents.send('window:tab-focused', {
                    tabId
                });
            }
        }

        // Sync tab state across all windows
        for (const win of windowInstances.values()) {
            if (win && !win.isDestroyed()) {
                win.webContents.send('window:sync-state', {
                    action: 'tab-focused',
                    tabId,
                    windowId
                });
            }
        }
    });

    ipcMain.on('window:rename-tab', (event, { tabId, title }) => {
        console.log(`Renaming tab: ${tabId} to: ${title}`);

        // If we have an actual window/view for this tab, we'd update its title here
        const tabWindow = tabWindows.get(tabId);
        if (tabWindow && !tabWindow.isDestroyed()) {
            // Only update window title if this is the active tab
            tabWindow.webContents.send('window:get-active-tab', { tabId }, (response: any) => {
                if (response && response.isActiveTab) {
                    tabWindow.setTitle(title);
                }
            });
        }

        // Sync tab state across all windows
        for (const win of windowInstances.values()) {
            if (win && !win.isDestroyed()) {
                win.webContents.send('window:sync-state', {
                    action: 'tab-renamed',
                    tabId,
                    title
                });
            }
        }
    });

    ipcMain.on('window:detach-tab', (event, { tabId, newWindowId, bounds }) => {
        console.log(`Detaching tab: ${tabId} to new window: ${newWindowId}`);

        // Create a new window for this tab
        const newWindow = createBrowserWindow(newWindowId, {
            ...bounds,
            tabId
        });

        // Store the window
        windowInstances.set(newWindowId, newWindow);
        tabWindows.set(tabId, newWindow);

        // Sync with other windows
        for (const [id, win] of windowInstances.entries()) {
            if (id !== newWindowId && win && !win.isDestroyed()) {
                win.webContents.send('window:sync-state', {
                    action: 'tab-detached',
                    tabId,
                    newWindowId
                });
            }
        }
    });

    ipcMain.on('window:move-tab', (event, { tabId, targetWindowId }) => {
        console.log(`Moving tab: ${tabId} to window: ${targetWindowId}`);

        const targetWindow = windowInstances.get(targetWindowId);
        if (targetWindow && !targetWindow.isDestroyed()) {
            // Update tab association
            tabWindows.set(tabId, targetWindow);

            // Notify the target window about the moved tab
            targetWindow.webContents.send('window:tab-moved', {
                tabId,
                targetWindowId
            });

            // Sync with other windows
            for (const [id, win] of windowInstances.entries()) {
                if (win && !win.isDestroyed()) {
                    win.webContents.send('window:sync-state', {
                        action: 'tab-moved',
                        tabId,
                        targetWindowId
                    });
                }
            }
        }
    });
}

// Export maps for potential external use
export { tabWindows, windowInstances };

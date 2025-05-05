import { ipcMain, BrowserWindow } from 'electron';

// Map to track tab-specific windows
const tabWindows = new Map<string, BrowserWindow>();

// Setup all window related IPC handlers
export function setupWindowHandlers(mainWindow: BrowserWindow) {
  // Tab/Window management IPC handlers
  ipcMain.on('window:create-tab', (event, { tabId, context }) => {
    console.log(`Creating new tab: ${tabId} with context:`, context);
    // In a real implementation, we might create a new BrowserWindow or BrowserView
    // Instead, we're just broadcasting this event to all windows
    if (mainWindow) {
      mainWindow.webContents.send('window:tab-created', { tabId, context });
    }
    // Sync tab state across all windows
    if (mainWindow) {
      mainWindow.webContents.send('window:sync-state', { action: 'tab-created', tabId, context });
    }
  });

  ipcMain.on('window:close-tab', (event, { tabId }) => {
    console.log(`Closing tab: ${tabId}`);
    // If we have an actual window/view for this tab, we'd close it here
    const tabWindow = tabWindows.get(tabId);
    if (tabWindow && !tabWindow.isDestroyed()) {
      tabWindow.close();
      tabWindows.delete(tabId);
    }
    // Sync tab state across all windows
    if (mainWindow) {
      mainWindow.webContents.send('window:sync-state', { action: 'tab-closed', tabId });
    }
  });

  ipcMain.on('window:focus-tab', (event, { tabId }) => {
    console.log(`Focusing tab: ${tabId}`);
    // If we have an actual window/view for this tab, we'd focus it here
    const tabWindow = tabWindows.get(tabId);
    if (tabWindow && !tabWindow.isDestroyed()) {
      if (tabWindow.isMinimized()) {
        tabWindow.restore();
      }
      tabWindow.focus();
    }
    // Sync tab state across all windows
    if (mainWindow) {
      mainWindow.webContents.send('window:sync-state', { action: 'tab-focused', tabId });
    }
  });

  ipcMain.on('window:rename-tab', (event, { tabId, title }) => {
    console.log(`Renaming tab: ${tabId} to: ${title}`);
    // If we have an actual window/view for this tab, we'd update its title here
    const tabWindow = tabWindows.get(tabId);
    if (tabWindow && !tabWindow.isDestroyed()) {
      tabWindow.setTitle(title);
    }
    // Sync tab state across all windows
    if (mainWindow) {
      mainWindow.webContents.send('window:sync-state', { action: 'tab-renamed', tabId, title });
    }
  });
}

// Export map for potential external use
export { tabWindows };

import { ipcMain, BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

export function setupInitializationHandlers(window: BrowserWindow) {
  mainWindow = window;

  // Handle progress updates from renderer
  ipcMain.on('init:progress-update', (event, data) => {
    // Forward progress updates to the renderer (EJS loading screen)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('init:progress-update', data);
    }
  });

  // Handle step completion updates
  ipcMain.on('init:step-complete', (event, data) => {
    // Forward step completion to the renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('init:step-complete', data);
    }
  });

  // Handle initialization complete
  ipcMain.on('init:complete', (event, data) => {
    // Forward completion to the renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('init:complete', data);
    }
  });

  console.log('[Initialization] Progress handlers set up successfully');
} 
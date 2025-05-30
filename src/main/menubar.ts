import { ipcMain, shell, globalShortcut } from 'electron';
import { BrowserWindow } from 'electron';

export function setupMenuBarHandlers(mainWindow: BrowserWindow) {
  // Helper function to execute menu actions
  const executeMenuAction = (action: string) => {
    console.log('Menu action:', action);

    switch (action) {
      case 'file:open':
        // Handle file open - you can implement file dialog here
        console.log('File open requested');
        break;
      case 'file:close':
        mainWindow?.close();
        break;
      case 'edit:undo':
        mainWindow?.webContents.undo();
        break;
      case 'edit:redo':
        mainWindow?.webContents.redo();
        break;
      case 'edit:cut':
        mainWindow?.webContents.cut();
        break;
      case 'edit:copy':
        mainWindow?.webContents.copy();
        break;
      case 'edit:paste':
        mainWindow?.webContents.paste();
        break;
      case 'edit:select-all':
        mainWindow?.webContents.selectAll();
        break;
      case 'view:reload':
        mainWindow?.webContents.reload();
        break;
      case 'view:fullscreen':
        if (mainWindow) {
          mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
        break;
      case 'view:zoom-in':
        if (mainWindow) {
          const currentZoom = mainWindow.webContents.getZoomFactor();
          mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
        }
        break;
      case 'view:zoom-out':
        if (mainWindow) {
          const currentZoom = mainWindow.webContents.getZoomFactor();
          mainWindow.webContents.setZoomFactor(Math.max(0.1, currentZoom - 0.1));
        }
        break;
      case 'view:reset-zoom':
        mainWindow?.webContents.setZoomFactor(1.0);
        break;
      case 'view:toggle-devtools':
        mainWindow?.webContents.toggleDevTools();
        break;
      case 'help:learn-more':
        shell.openExternal('https://onlysaid.com/zh-HK');
        break;
      case 'help:documentation':
        shell.openExternal('https://github.com/electron/electron/tree/main/docs#readme');
        break;
      case 'help:community':
        shell.openExternal('https://www.electronjs.org/community');
        break;
      case 'help:issues':
        shell.openExternal('https://github.com/electron/electron/issues');
        break;
      default:
        console.warn('Unknown menu action:', action);
    }
  };

  // Register local shortcuts (only when app is focused)
  const registerAccelerators = () => {
    try {
      // Remove all globalShortcut.register() calls and use webContents.on('before-input-event') instead
      mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;

        const { control, meta, shift, key } = input;
        const cmdOrCtrl = process.platform === 'darwin' ? meta : control;

        // File shortcuts
        if (cmdOrCtrl && key.toLowerCase() === 'o') {
          event.preventDefault();
          executeMenuAction('file:open');
        } else if (cmdOrCtrl && key.toLowerCase() === 'q') {
          event.preventDefault();
          executeMenuAction('file:close');
        }
        // Edit shortcuts
        else if (cmdOrCtrl && !shift && key.toLowerCase() === 'z') {
          event.preventDefault();
          executeMenuAction('edit:undo');
        } else if (cmdOrCtrl && (key.toLowerCase() === 'y' || (shift && key.toLowerCase() === 'z'))) {
          event.preventDefault();
          executeMenuAction('edit:redo');
        } else if (cmdOrCtrl && key.toLowerCase() === 'x') {
          event.preventDefault();
          executeMenuAction('edit:cut');
        } else if (cmdOrCtrl && key.toLowerCase() === 'c') {
          event.preventDefault();
          executeMenuAction('edit:copy');
        } else if (cmdOrCtrl && key.toLowerCase() === 'v') {
          event.preventDefault();
          executeMenuAction('edit:paste');
        } else if (cmdOrCtrl && key.toLowerCase() === 'a') {
          event.preventDefault();
          executeMenuAction('edit:select-all');
        }
        // View shortcuts
        else if (cmdOrCtrl && key.toLowerCase() === 'r') {
          event.preventDefault();
          executeMenuAction('view:reload');
        } else if (key === 'F11') {
          event.preventDefault();
          executeMenuAction('view:fullscreen');
        } else if (cmdOrCtrl && (key === '=' || key === '+')) {
          event.preventDefault();
          executeMenuAction('view:zoom-in');
        } else if (cmdOrCtrl && key === '-') {
          event.preventDefault();
          executeMenuAction('view:zoom-out');
        } else if (cmdOrCtrl && key === '0') {
          event.preventDefault();
          executeMenuAction('view:reset-zoom');
        } else if (key === 'F12' || (cmdOrCtrl && shift && key.toLowerCase() === 'i')) {
          event.preventDefault();
          executeMenuAction('view:toggle-devtools');
        }
      });

      console.log('[MenuBar] Local shortcuts registered successfully');
    } catch (error) {
      console.error('[MenuBar] Failed to register local shortcuts:', error);
    }
  };

  // Unregister function (no longer needed for local shortcuts)
  const unregisterAccelerators = () => {
    // Local shortcuts are automatically cleaned up when window is destroyed
    console.log('[MenuBar] Local shortcuts cleaned up');
  };

  // Register shortcuts when window is ready
  if (mainWindow.webContents.isLoading()) {
    mainWindow.once('ready-to-show', registerAccelerators);
  } else {
    registerAccelerators();
  }

  // Clean up shortcuts when window is closed
  mainWindow.on('closed', unregisterAccelerators);

  // Menu action handlers (for UI clicks)
  ipcMain.handle('menu-action', async (event, action: string) => {
    executeMenuAction(action);
  });

  // Window control handlers
  ipcMain.handle('window-action', async (event, action: string) => {
    if (!mainWindow) return;

    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        mainWindow.close();
        break;
      default:
        console.warn('Unknown window action:', action);
    }
  });
}

// Export function to unregister shortcuts (useful for app cleanup)
export function unregisterMenuAccelerators() {
  globalShortcut.unregisterAll();
}

/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { initializeDatabase, executeQuery, executeTransaction, closeDatabase, runMigrations } from '../service/db';
import { allMigrations } from '../service/migrations';
import { initAuth } from './auth';
import dotenv from 'dotenv';
import { setupChatroomHandlers } from './api/v2/chat/chatroom';

dotenv.config();

setupChatroomHandlers();
initAuth(process.env.ONLYSAID_API_URL || '', process.env.ONLYSAID_DOMAIN || '');

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

// Store tab windows
const tabWindows = new Map<string, BrowserWindow>();

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

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

// Add these IPC handlers before app.whenReady()
ipcMain.handle('db:initialize', async () => {
  try {
    const db = initializeDatabase();

    // Run migrations from the migrations file
    runMigrations(allMigrations);
    console.log('Database initialized');

    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
});

ipcMain.handle('db:query', async (_event, { query, params }) => {
  try {
    return executeQuery(query, params);
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
});

ipcMain.handle('db:transaction', async (_event, callback) => {
  try {
    return executeTransaction(callback);
  } catch (error) {
    console.error('Error executing transaction:', error);
    throw error;
  }
});

ipcMain.handle('db:close', async () => {
  try {
    closeDatabase();
    return true;
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  // Initialize database directly during app startup
  try {
    console.log('Initializing database during app startup...');
    const db = initializeDatabase();
    runMigrations(allMigrations);
    console.log('Database initialized and migrations applied successfully');
  } catch (error) {
    console.error('Failed to initialize database during startup:', error);
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

// Make sure to close the database when the app is quitting
app.on('will-quit', () => {
  closeDatabase();
});

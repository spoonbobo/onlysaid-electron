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
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { initializeDatabase, executeQuery, executeTransaction, closeDatabase, runMigrations } from '../service/db';
import { allMigrations } from '../service/migrations';
import { initAuth } from './auth';
import dotenv from 'dotenv';
import { setupChatroomHandlers } from './api/v2/chat';
import { setupUserHandlers } from './api/v2/user';
import { setupFileSystemHandlers } from './filesystem';
import os from 'os';
import fs from 'fs';
import { promisify } from 'util';
import childProcess from 'child_process';

dotenv.config();

setupChatroomHandlers();
setupUserHandlers();
setupFileSystemHandlers();

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
    initializeDatabase();

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

// These IPC handlers will report the Electron app's own resource usage

ipcMain.handle('system:get-cpu-usage', async () => {
  try {
    // Get initial CPU usage for the current process
    const startUsage = process.cpuUsage();

    // Wait a bit to measure delta
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get CPU usage after the delay and calculate the difference
    const endUsage = process.cpuUsage(startUsage);

    // Convert from microseconds to milliseconds and calculate percentage
    // endUsage contains user and system CPU time used in microseconds
    const totalUsage = endUsage.user + endUsage.system;

    // Convert to percentage of CPU used during the measured time period
    // We measured for 500ms, so divide by 5000 microseconds and multiply by 100 for percentage
    const cpuPercent = (totalUsage / 5000) * 100;

    // Cap at 100% for single core representation
    return Math.min(cpuPercent, 100);
  } catch (error) {
    console.error('Error getting Electron app CPU usage:', error);
    return 0;
  }
});

ipcMain.handle('system:get-memory-usage', async () => {
  try {
    // Get memory usage for the current process
    const memoryUsage = process.memoryUsage();

    // Return RSS (Resident Set Size) and heapTotal (total allocated heap)
    return {
      total: memoryUsage.heapTotal,  // Total heap allocated
      used: memoryUsage.heapUsed,    // Heap actually used
      rss: memoryUsage.rss           // Resident Set Size - total memory allocated
    };
  } catch (error) {
    console.error('Error getting Electron app memory usage:', error);
    return { total: 0, used: 0, rss: 0 };
  }
});

const exec = promisify(childProcess.exec);

// Directory size calculation helper
const getDirSize = async (dirPath: string): Promise<number> => {
  try {
    const files = await fs.promises.readdir(dirPath);
    const stats = await Promise.all(
      files.map(async (file: string) => {
        const filePath = path.join(dirPath, file);
        const stat = await fs.promises.stat(filePath);

        if (stat.isDirectory()) {
          return getDirSize(filePath);
        }
        return stat.size;
      })
    );

    return stats.reduce((acc: number, size: number) => acc + size, 0);
  } catch (e) {
    console.error(`Error calculating dir size for ${dirPath}:`, e);
    return 0;
  }
};

// Add this handler
ipcMain.handle('system:get-storage-usage', async () => {
  try {
    const userDataPath = app.getPath('userData');

    // Get app storage size (recursively)
    const appStorageUsed = await getDirSize(userDataPath);

    // Get disk space info
    let free = 0;
    let total = 0;

    // Platform-specific disk space check
    if (process.platform === 'win32') {
      // Windows
      const drive = path.parse(userDataPath).root;
      const { stdout } = await exec(`wmic logicaldisk where "DeviceID='${drive.charAt(0)}:'" get FreeSpace,Size /format:csv`);
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(',');
        if (parts.length >= 3) {
          free = parseInt(parts[1], 10) || 0;
          total = parseInt(parts[2], 10) || 0;
        }
      }
    } else {
      // Linux/macOS
      const { stdout } = await exec(`df -k "${userDataPath}"`);
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 4) {
          // df returns sizes in 1K blocks, convert to bytes
          total = parseInt(parts[1], 10) * 1024 || 0;
          free = parseInt(parts[3], 10) * 1024 || 0;
        }
      }
    }

    return {
      appStorage: appStorageUsed,
      free,
      total
    };
  } catch (error) {
    console.error('Error getting storage usage:', error);
    return { appStorage: 0, free: 0, total: 0 };
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
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
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
app.on('will-quit', (event) => {
  try {
    console.log('App is quitting, ensuring database is properly closed...');
    // Just call closeDatabase() which already handles the checkpoint internally
    closeDatabase();
    console.log('Database closed successfully on app exit');
  } catch (error) {
    console.error('Error during database close on app exit:', error);
  }
});

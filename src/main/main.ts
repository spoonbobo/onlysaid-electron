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
import { app, BrowserWindow, shell, ipcMain, dialog, session, net, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { resolveHtmlPath } from './util';
import { initializeDatabase, executeQuery, executeTransaction, closeDatabase, runMigrations } from '../service/db';
import { initAuth } from './auth';
import dotenv from 'dotenv';
import { setupChatroomHandlers } from './api/v2/chat';
import { setupUserHandlers } from './api/v2/user';
import { setupFileSystemHandlers } from './filesystem';
import { setupWindowHandlers } from './window';
import { setupResourceHandlers } from './system';
import { setupSSEHandlers } from './openai';
import { setupMCPHandlers } from './mcp';
import { setupContentHandlers } from './filesystem';
import { setupRedisHandlers } from './redis';
import { setupWorkspaceHandlers } from './api/v2/workspace';
import { initializeDeeplinkHandling } from './deeplink';
import { initializeKnowledgeBaseHandlers } from './api/v2/onlysaid_kb';
import { setupFileHandlers } from './api/v2/file';
import { setupSocketHandlers } from './socket';
import { setupStorageHandlers } from './api/v2/storage';
import { initMicrosoftAuth } from './msft';
import { setupOneasiaHandlers } from './oneasia';
import { setupMenuBarHandlers, unregisterMenuAccelerators } from './menubar';
import { setupAppHandlers } from './app';
import { setupCryptoHandlers } from './crypto/cryptoHandlers';
import { setupN8nHandlers } from './n8n';
import { setupHealthCheckHandlers, cleanupHealthCheck } from './healthcheck';
import { setupLangChainHandlers } from '../service/langchain';
import { setupHumanInTheLoopHandlers } from '../service/langchain/human_in_the_loop/ipc/human_in_the_loop';
import { setupInitializationHandlers } from './initialization';

// Load environment variables
dotenv.config();

// Initialize all handlers and services
setupChatroomHandlers();
setupUserHandlers();
setupFileSystemHandlers();
setupResourceHandlers();
setupSSEHandlers();
setupMCPHandlers();
setupContentHandlers();
setupRedisHandlers();
setupWorkspaceHandlers();
setupOneasiaHandlers();
initializeDeeplinkHandling();
setupFileHandlers();
setupStorageHandlers();
setupAppHandlers();
setupCryptoHandlers();
setupN8nHandlers();
setupHealthCheckHandlers();
setupLangChainHandlers();

// Initialize authentication modules
initAuth(process.env.ONLYSAID_API_URL || '', process.env.ONLYSAID_DOMAIN || '');

// Simplified Google Auth initialization (no preloading needed)
async function initializeGoogleAuth() {
  try {
    // @ts-ignore
    const { initGoogleAuth } = await import('./google');
    initGoogleAuth();
  } catch (error) {
    // Silent fail for Google Auth
  }
}

// Add Microsoft Auth initialization
async function initializeMicrosoftAuth() {
  try {
    initMicrosoftAuth();
  } catch (error) {
    // Silent fail for Microsoft Auth
  }
}

// Call both initializations
initializeGoogleAuth();
initializeMicrosoftAuth();

// Initialize knowledge base handlers
initializeKnowledgeBaseHandlers();

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.handle('db:initialize', async () => {
  try {
    initializeDatabase();
    await runMigrations();
    return true;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db:query', async (_event, { query, params }) => {
  try {
    return executeQuery(query, params);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db:transaction', async (_event, callback) => {
  try {
    return executeTransaction(callback);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('db:close', async () => {
  try {
    closeDatabase();
    return true;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('session:set-cookie', async (event, cookieDetails) => {
  try {
    await session.defaultSession.cookies.set({
      url: cookieDetails.url,
      name: cookieDetails.name,
      value: cookieDetails.value,
      httpOnly: cookieDetails.httpOnly,
      secure: cookieDetails.secure,
      path: cookieDetails.path || '/',
      domain: cookieDetails.domain,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// Add dialog handler for save dialog
ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, options);
    return result;
  } catch (error) {
    throw error;
  }
});

// ✅ Add initialization progress handlers
ipcMain.on('init:progress-update', (event, data) => {
  // Forward progress updates to all renderer processes
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('init:progress-update', data);
  }
});

ipcMain.on('init:step-complete', (event, data) => {
  // Forward step completion to all renderer processes
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('init:step-complete', data);
  }
});

ipcMain.on('init:complete', (event, data) => {
  // Forward completion to all renderer processes
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('init:complete', data);
  }
});

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
    .catch(() => {});
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  // Initialize database directly during app startup
  try {
    const db = initializeDatabase();
    await runMigrations();
  } catch (error) {
    // Database initialization failed
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: true,
    width: 1024,
    height: 728,
    // Set minimum window size to prevent UI from breaking
    minWidth: 600,  // Minimum width to accommodate collapsed menu
    minHeight: 400, // Minimum height for basic functionality
    icon: getAssetPath('icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
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

  // Disable the native application menu completely
  Menu.setApplicationMenu(null);

  // ✅ Add window state change listeners for the main window
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:state-changed', {
        windowId: 'main',
        isMaximized: true,
        isMinimized: false
      });
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:state-changed', {
        windowId: 'main',
        isMaximized: false,
        isMinimized: false
      });
    }
  });

  mainWindow.on('minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:state-changed', {
        windowId: 'main',
        isMaximized: false,
        isMinimized: true
      });
    }
  });

  mainWindow.on('restore', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:state-changed', {
        windowId: 'main',
        isMaximized: false,
        isMinimized: false
      });
    }
  });

  setupSocketHandlers(mainWindow);
  setupMenuBarHandlers(mainWindow);
  setupInitializationHandlers(mainWindow);
  
  // ✅ Setup human-in-the-loop handlers with main window reference
  setupHumanInTheLoopHandlers(mainWindow);
  
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

    // Since we're using direct HTTP requests, Google services are ready immediately
    setTimeout(() => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('google-services:ready');
      }
    }, 1000); // Small delay to let UI settle
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  new AppUpdater();
  setupWindowHandlers(mainWindow);
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Unregister shortcuts when all windows are closed
  unregisterMenuAccelerators();

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
  .catch(() => {});

// Update the app quit handler
app.on('will-quit', (event) => {
  try {
    // Unregister global shortcuts
    unregisterMenuAccelerators();

    // Clean up health check
    cleanupHealthCheck();

    // Close database
    closeDatabase();
  } catch (error) {
    // Silent cleanup error
  }
});

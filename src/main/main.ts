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
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { initializeDatabase, executeQuery, executeTransaction, closeDatabase, runMigrations } from '../service/db';
import { allMigrations } from '../service/migration/migrations';
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

// Initialize authentication modules
initAuth(process.env.ONLYSAID_API_URL || '', process.env.ONLYSAID_DOMAIN || '');

// Simplified Google Auth initialization (no preloading needed)
async function initializeGoogleAuth() {
  console.log('[Main] ===== INITIALIZING GOOGLE AUTH =====');
  try {
    // @ts-ignore
    const { initGoogleAuth } = await import('./google');
    initGoogleAuth();
    console.log('[Main] Google Auth initialized successfully');
  } catch (error) {
    console.warn('[Main] Google Auth initialization failed:', error);
  }
}

// Add Microsoft Auth initialization
async function initializeMicrosoftAuth() {
  console.log('[Main] ===== INITIALIZING MICROSOFT AUTH =====');
  try {
    initMicrosoftAuth();
    console.log('[Main] Microsoft Auth initialized successfully');
  } catch (error) {
    console.warn('[Main] Microsoft Auth initialization failed:', error);
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
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.handle('db:initialize', async () => {
  try {
    initializeDatabase();
    await runMigrations();
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
    console.log(`[Main] Cookie "${cookieDetails.name}" set for ${cookieDetails.url}`);
    return { success: true };
  } catch (error) {
    console.error('[Main] Failed to set cookie:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// Add dialog handler for save dialog
ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, options);
    return result;
  } catch (error) {
    console.error('Error showing save dialog:', error);
    throw error;
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
    .catch(console.log);
};

const createWindow = async () => {
  console.log('[Main] ===== CREATE WINDOW STARTED =====');

  if (isDebug) {
    console.log('[Main] Installing extensions...');
    await installExtensions();
    console.log('[Main] Extensions installed');
  }

  // Initialize database directly during app startup
  try {
    console.log('[Main] Initializing database during app startup...');
    const db = initializeDatabase();
    await runMigrations();
    console.log('[Main] Database initialized and migrations applied successfully');
  } catch (error) {
    console.error('[Main] Failed to initialize database during startup:', error);
  }

  console.log('[Main] Setting up resources path...');
  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  console.log('[Main] Creating BrowserWindow...');
  mainWindow = new BrowserWindow({
    show: true,
    width: 1024,
    height: 728,
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
  console.log('[Main] BrowserWindow created');

  // Disable the native application menu completely
  Menu.setApplicationMenu(null);

  // Call setupSocketHandlers immediately after BrowserWindow creation
  // and before loading the URL
  console.log('[Main] Setting up socket handlers...');
  setupSocketHandlers(mainWindow);
  console.log('[Main] Socket handlers set up');

  // Add menubar handlers setup
  console.log('[Main] Setting up menubar handlers...');
  setupMenuBarHandlers(mainWindow);
  console.log('[Main] Menubar handlers set up');

  console.log('[Main] Loading URL...');
  mainWindow.loadURL(resolveHtmlPath('index.html'));
  console.log('[Main] URL loaded');

  mainWindow.on('ready-to-show', () => {
    console.log('[Main] Window ready-to-show event fired');
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
        console.log('[Main] Google services ready (using direct HTTP requests)');
        mainWindow.webContents.send('google-services:ready');
      }
    }, 1000); // Small delay to let UI settle
  });

  mainWindow.on('closed', () => {
    console.log('[Main] Window closed event fired');
    mainWindow = null;
  });

  console.log('[Main] Building menu...');
  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();
  console.log('[Main] Menu not built');

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  console.log('[Main] Creating AppUpdater...');
  new AppUpdater();
  console.log('[Main] AppUpdater created');

  console.log('[Main] Setting up window handlers...');
  setupWindowHandlers(mainWindow);
  console.log('[Main] Window handlers set up');

  console.log('[Main] ===== CREATE WINDOW COMPLETED =====');
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
  .catch(console.log);

// Update the app quit handler
app.on('will-quit', (event) => {
  try {
    console.log('App is quitting, cleaning up...');

    // Unregister global shortcuts
    unregisterMenuAccelerators();
    console.log('Global shortcuts unregistered');

    // Close database
    closeDatabase();
    console.log('Database closed successfully on app exit');
  } catch (error) {
    console.error('Error during app cleanup:', error);
  }
});

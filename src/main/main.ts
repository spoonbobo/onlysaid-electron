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
  console.log('[Main] ===== INITIALIZATION STARTED =====');
  console.log('[Main] 📋 Task 1/7: Setting up development environment...');

  if (isDebug) {
    console.log('[Main] Installing development extensions...');
    await installExtensions();
    console.log('[Main] ✅ Development extensions installed');
  }

  console.log('[Main] 📋 Task 2/7: Initializing database...');
  // Initialize database directly during app startup
  try {
    const db = initializeDatabase();
    await runMigrations();
    console.log('[Main] ✅ Database initialized and migrations applied');
  } catch (error) {
    console.error('[Main] ❌ Failed to initialize database:', error);
  }

  console.log('[Main] 📋 Task 3/7: Setting up application window...');
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
  console.log('[Main] ✅ Application window created');

  // Disable the native application menu completely
  Menu.setApplicationMenu(null);

  console.log('[Main] 📋 Task 4/7: Setting up socket handlers...');
  setupSocketHandlers(mainWindow);
  console.log('[Main] ✅ Socket handlers configured');

  console.log('[Main] 📋 Task 5/7: Setting up menubar handlers...');
  setupMenuBarHandlers(mainWindow);
  console.log('[Main] ✅ Menubar handlers configured');

  console.log('[Main] 📋 Task 6/7: Loading application interface...');
  mainWindow.loadURL(resolveHtmlPath('index.html'));
  console.log('[Main] ✅ Application interface loaded');

  mainWindow.on('ready-to-show', () => {
    console.log('[Main] 📋 Task 7/7: Finalizing window setup...');
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
        console.log('[Main] ✅ Google services ready (using direct HTTP requests)');
        mainWindow.webContents.send('google-services:ready');
      }
    }, 1000); // Small delay to let UI settle
    
    console.log('[Main] ✅ Window setup completed');
  });

  mainWindow.on('closed', () => {
    console.log('[Main] Window closed event fired');
    mainWindow = null;
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  console.log('[Main] Setting up auto-updater...');
  new AppUpdater();
  console.log('[Main] ✅ Auto-updater configured');

  console.log('[Main] Setting up window event handlers...');
  setupWindowHandlers(mainWindow);
  console.log('[Main] ✅ Window event handlers configured');

  console.log('[Main] ===== INITIALIZATION COMPLETED =====');
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

    // Clean up health check
    cleanupHealthCheck();
    console.log('Health check cleaned up');

    // Close database
    closeDatabase();
    console.log('Database closed successfully on app exit');
  } catch (error) {
    console.error('Error during app cleanup:', error);
  }
});

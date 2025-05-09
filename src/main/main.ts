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
import { app, BrowserWindow, shell, ipcMain, dialog, session, net } from 'electron';
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
import { setupWindowHandlers } from './window';
import { setupResourceHandlers } from './resource';
import { setupSSEHandlers } from './streaming';
import { setupMCPHandlers } from './mcp/mcp';
import { initializeDeeplinkHandling } from './deeplink';
dotenv.config();

setupChatroomHandlers();
setupUserHandlers();
setupFileSystemHandlers();
setupResourceHandlers();
setupSSEHandlers();
setupMCPHandlers();
initializeDeeplinkHandling();
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

// Handler to set a cookie
ipcMain.handle('session:set-cookie', async (event, cookieDetails) => {
    try {
        await session.defaultSession.cookies.set({
            url: cookieDetails.url,
            name: cookieDetails.name,
            value: cookieDetails.value,
            httpOnly: cookieDetails.httpOnly,
            secure: cookieDetails.secure,
            path: cookieDetails.path || '/',
            domain: cookieDetails.domain, // Optional
            // expirationDate: ... // Optional
        });
        console.log(`[Main] Cookie "${cookieDetails.name}" set for ${cookieDetails.url}`);
        return { success: true };
    } catch (error) {
        console.error('[Main] Failed to set cookie:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
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

    setupWindowHandlers(mainWindow);
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

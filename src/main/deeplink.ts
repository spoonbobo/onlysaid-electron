import { app, BrowserWindow } from 'electron';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const PROTOCOL = 'onlysaid-electron';

function registerLinuxProtocolHandler() {
    if (process.platform !== 'linux') return;

    const homePath = process.env.HOME;
    const desktopPath = path.join(homePath || '~', '.local/share/applications/onlysaid-electron.desktop');

    let execCommand;
    let iconPath;
    const projectPath = path.resolve(__dirname, '../../');

    if (app.isPackaged) {
        execCommand = `${process.execPath} %u`;
        iconPath = path.join(path.dirname(process.execPath), '..', 'resources', 'assets', 'icon.png');
    } else {
        execCommand = `${process.execPath} "${projectPath}" %u`;
        iconPath = path.join(projectPath, 'assets', 'icon.png');
    }

    const desktopEntry = `[Desktop Entry]
Name=Onlysaid ${app.isPackaged ? '' : '(Dev)'}
Exec=${execCommand}
Icon=${iconPath}
Type=Application
Terminal=false
Categories=Utility;Development;
MimeType=x-scheme-handler/onlysaid-electron;
StartupWMClass=${app.isPackaged ? 'Onlysaid' : 'electron'}`;

    try {
        fs.writeFileSync(desktopPath, desktopEntry);
        execSync(`xdg-mime default onlysaid-electron.desktop x-scheme-handler/onlysaid-electron`);
        execSync(`update-desktop-database ${path.dirname(desktopPath)}`);
        console.log('[Deeplink] Linux protocol handler registered successfully');
    } catch (error) {
        console.error('[Deeplink] Failed to register Linux protocol handler:', error);
    }
}

function sendAuthInfoToRenderer(token: string, cookieName: string | null) {
    const focusedWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (focusedWindow) {
        console.log(`Sending auth info to renderer: token (partial) ${token.substring(0, 10)}..., cookieName ${cookieName}`);
        focusedWindow.webContents.send('deeplink:receive-auth-token', { token, cookieName });
    } else {
        console.warn('[Deeplink] No window available to send auth token to. App might not be fully initialized.');
    }
}

export function handleDeeplinkUrl(urlLink: string) {
    console.log(`[Deeplink] Received URL: ${urlLink}`);
    try {
        const parsedUrl = new URL(urlLink);
        if (parsedUrl.protocol === `${PROTOCOL}:` && (parsedUrl.hostname === 'auth' || parsedUrl.pathname.startsWith('/auth'))) {
            const token = parsedUrl.searchParams.get('token');
            const cookieName = parsedUrl.searchParams.get('cookieName');

            if (token) {
                console.log(`[Deeplink] Extracted token (partial): ${token.substring(0, 10)}... and cookieName: ${cookieName}`);
                sendAuthInfoToRenderer(token, cookieName);
            } else {
                console.error('[Deeplink] Auth token not found in URL.');
            }
        } else {
            console.warn(`[Deeplink] URL not recognized or not an auth URL: ${urlLink}`);
        }
    } catch (error) {
        console.error(`[Deeplink] Error parsing URL "${urlLink}":`, error);
    }
}

export function initializeDeeplinkHandling() {
    if (process.platform === 'linux') {
        registerLinuxProtocolHandler();
    }

    if (!app.isPackaged) {
        const mainScriptPath = process.argv[1];
        let launchArgs = [mainScriptPath];

        if (process.platform === 'win32' || process.platform === 'linux') {
            console.log(`[Deeplink Dev Registration] Setting protocol client for ${process.platform}`);
            console.log(`  PROTOCOL: ${PROTOCOL}`);
            console.log(`  process.execPath: ${process.execPath}`);
            console.log(`  mainScriptArg (process.argv[1]): ${mainScriptPath}`);

            app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [mainScriptPath]);
        } else {
            app.setAsDefaultProtocolClient(PROTOCOL);
        }
    } else {
        app.setAsDefaultProtocolClient(PROTOCOL);
    }

    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
        app.quit();
        return;
    }

    app.on('second-instance', (event, commandLine, workingDirectory) => {
        console.log('<<<<< SECOND-INSTANCE EVENT FIRED >>>>>');
        console.log('Received commandLine:', commandLine);

        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }

        const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
        if (url) {
            console.log('Deeplink URL found in commandLine:', url);
            handleDeeplinkUrl(url);
        } else {
            console.log('No deeplink URL found in commandLine for second-instance.');
        }
    });

    app.on('open-url', (event, url) => {
        event.preventDefault();
        handleDeeplinkUrl(url);
    });

    if (app.isPackaged) {
        const url = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
        if (url) {
            app.whenReady().then(() => handleDeeplinkUrl(url));
        }
    } else if (process.platform !== 'darwin') {
        const url = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
        if (url) {
            app.whenReady().then(() => handleDeeplinkUrl(url));
        }
    }

    console.log(`[Deeplink] Initialized for protocol "${PROTOCOL}://" (isPackaged: ${app.isPackaged})`);
}
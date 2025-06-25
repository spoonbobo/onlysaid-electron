import { app, BrowserWindow } from 'electron';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const PROTOCOL = 'onlysaid-electron';

function isValidDeeplinkUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === `${PROTOCOL}:` && 
               (parsedUrl.hostname === 'auth' || parsedUrl.pathname.startsWith('/auth'));
    } catch (error) {
        console.error('[Deeplink] Invalid URL format:', url, error);
        return false;
    }
}

function getMainScriptPath(): string {
    // In development, we need to find the actual main script path
    // process.argv might contain flags like --require, so we need to find the actual script
    
    if (app.isPackaged) {
        return process.argv[1] || '';
    }
    
    // For development, look for the main script in different ways
    console.log('[Deeplink] Full process.argv:', process.argv);
    
    // Method 1: Look for .js files in argv
    const jsFile = process.argv.find(arg => arg.endsWith('.js') && !arg.includes('node_modules'));
    if (jsFile) {
        console.log('[Deeplink] Found JS file in argv:', jsFile);
        return jsFile;
    }
    
    // Method 2: Look for the current working directory + main entry
    const mainEntry = path.join(process.cwd(), '.erb', 'dll', 'main.bundle.dev.js');
    if (fs.existsSync(mainEntry)) {
        console.log('[Deeplink] Using main bundle:', mainEntry);
        return mainEntry;
    }
    
    // Method 3: Fallback to current directory
    const fallback = process.cwd();
    console.log('[Deeplink] Using fallback path:', fallback);
    return fallback;
}

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
    
    if (!isValidDeeplinkUrl(urlLink)) {
        console.error('[Deeplink] Invalid deeplink URL:', urlLink);
        return;
    }
    
    try {
        const parsedUrl = new URL(urlLink);
        if (parsedUrl.protocol === `${PROTOCOL}:` && (parsedUrl.hostname === 'auth' || parsedUrl.pathname.startsWith('/auth'))) {
            const token = parsedUrl.searchParams.get('token');
            const cookieName = parsedUrl.searchParams.get('cookieName');
            const message = parsedUrl.searchParams.get('message');
            const error = parsedUrl.searchParams.get('error');

            if (token) {
                console.log(`[Deeplink] Extracted token (partial): ${token.substring(0, 10)}... and cookieName: ${cookieName}`);
                sendAuthInfoToRenderer(token, cookieName);
            } else if (message || error) {
                console.log('[Deeplink] Received auth error:', message || error);
                // Just log the error - the web page should handle showing it to the user
            } else {
                console.error('[Deeplink] Auth token not found in URL and no error message.');
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
        const mainScriptPath = getMainScriptPath();
        
        if (process.platform === 'win32') {
            console.log(`[Deeplink Dev Registration] Setting protocol client for Windows dev`);
            console.log(`  PROTOCOL: ${PROTOCOL}`);
            console.log(`  process.execPath: ${process.execPath}`);
            console.log(`  mainScriptArg: ${mainScriptPath}`);
            
            // For Windows development, we'll use a different approach
            // Instead of trying to pass the exact script path, we'll use the working directory
            const workingDir = process.cwd();
            console.log(`  workingDir: ${workingDir}`);
            
            // Register with working directory approach
            app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [workingDir]);
        } else if (process.platform === 'linux') {
            console.log(`[Deeplink Dev Registration] Setting protocol client for Linux dev`);
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
        console.log('Working directory:', workingDirectory);

        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }

        // Better URL extraction - look for the protocol URL anywhere in the command line
        const url = commandLine.find((arg) => {
            const trimmedArg = arg.trim();
            return trimmedArg.startsWith(`${PROTOCOL}://`);
        });
        
        if (url && isValidDeeplinkUrl(url)) {
            console.log('Deeplink URL found in commandLine:', url);
            handleDeeplinkUrl(url);
        } else {
            console.log('No valid deeplink URL found in commandLine for second-instance.');
            console.log('CommandLine args:', commandLine);
        }
    });

    app.on('open-url', (event, url) => {
        event.preventDefault();
        console.log('[Deeplink] open-url event received:', url);
        if (isValidDeeplinkUrl(url)) {
            handleDeeplinkUrl(url);
        } else {
            console.warn('[Deeplink] Invalid URL received in open-url:', url);
        }
    });

    // Process initial URL for both dev and prod
    const initialUrl = process.argv.find((arg) => {
        const trimmedArg = arg.trim();
        return trimmedArg.startsWith(`${PROTOCOL}://`);
    });
    
    if (initialUrl && isValidDeeplinkUrl(initialUrl)) {
        console.log('[Deeplink] Initial URL found:', initialUrl);
        app.whenReady().then(() => handleDeeplinkUrl(initialUrl));
    }

    console.log(`[Deeplink] Initialized for protocol "${PROTOCOL}://" (isPackaged: ${app.isPackaged})`);
}
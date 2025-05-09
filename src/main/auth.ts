import { BrowserWindow, ipcMain, shell } from 'electron';

// Will be imported from main.ts
let ONLYSAID_API_URL: string;
let ONLYSAID_DOMAIN: string;
let authWindow: BrowserWindow | null = null;

// Function to initialize the authentication module with the API URL
export function initAuth(apiUrl: string, domain: string) {
    ONLYSAID_API_URL = apiUrl;
    ONLYSAID_DOMAIN = domain;
    setupAuthHandlers();
}

// Set up all auth-related IPC handlers
function setupAuthHandlers() {
    // Handle authentication request
    ipcMain.on('auth:sign-in', async (event) => {
        const nextJsAppUrl = ONLYSAID_DOMAIN;
        const electronFinalCallback = `${nextJsAppUrl}/api/electron-flow/generate-electron-deeplink`;

        // URL to your standard web sign-in page, but with special parameters
        const electronInitiatedSignInPageUrl = `${nextJsAppUrl}/zh-HK/signin?client_type=electron&electron_callback_url=${encodeURIComponent(electronFinalCallback)}`;

        console.log('------------------------------------------------------');
        console.log('--- ELECTRON MAIN: Opening web sign-in page for Electron flow: ---');
        console.log(electronInitiatedSignInPageUrl);
        console.log('------------------------------------------------------');

        try {
            await shell.openExternal(electronInitiatedSignInPageUrl);
            event.reply('auth:external-browser-opened', { success: true });
            console.log('[Auth] External browser opened to web sign-in page successfully');
        } catch (error) {
            console.error('[Auth] Failed to open external browser:', error);
            event.reply('auth:signed-in', {
                success: false,
                error: 'Failed to open authentication page in browser.'
            });
        }
    });
}

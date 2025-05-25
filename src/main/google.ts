import { ipcMain, shell } from 'electron';

let callbackServer: any = null;
let google: any = null;
let express: any = null;
let oauth2Client: any = null;

// Lazy load Google dependencies
async function loadGoogleDependencies() {
  console.log('[Google Auth] loadGoogleDependencies called');

  // Log all environment variables related to Google
  console.log('[Google Auth] Environment variables check:');
  console.log('[Google Auth] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Google Auth] GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : 'NOT SET');
  console.log('[Google Auth] GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? `${process.env.GOOGLE_CLIENT_SECRET.substring(0, 10)}...` : 'NOT SET');
  console.log('[Google Auth] All env keys containing GOOGLE:', Object.keys(process.env).filter(key => key.includes('GOOGLE')));

  if (!google || !express) {
    try {
      console.log('[Google Auth] Loading dependencies...');

      // Check if packages are installed
      console.log('[Google Auth] Importing googleapis...');
      google = await import('googleapis').then(m => m.google);
      console.log('[Google Auth] googleapis imported successfully');

      console.log('[Google Auth] Importing express...');
      express = (await import('express')).default;
      console.log('[Google Auth] express imported successfully');

      // Google OAuth configuration
      const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
      const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
      const REDIRECT_URI = 'http://localhost:8080/oauth/google/callback';

      console.log('[Google Auth] Environment check:', {
        hasClientId: !!GOOGLE_CLIENT_ID,
        hasClientSecret: !!GOOGLE_CLIENT_SECRET,
        clientIdLength: GOOGLE_CLIENT_ID.length,
        clientSecretLength: GOOGLE_CLIENT_SECRET.length,
        redirectUri: REDIRECT_URI
      });

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('[Google Auth] Missing credentials:', {
          clientId: GOOGLE_CLIENT_ID ? 'SET' : 'MISSING',
          clientSecret: GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING'
        });
        throw new Error('Google OAuth credentials not configured in environment variables');
      }

      console.log('[Google Auth] Creating OAuth2 client...');
      oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
      );
      console.log('[Google Auth] OAuth2 client created successfully');

      console.log('[Google Auth] Dependencies loaded successfully');
    } catch (error) {
      console.error('[Google Auth] Failed to load dependencies:', error);
      console.error('[Google Auth] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  } else {
    console.log('[Google Auth] Dependencies already loaded');
  }
}

export function initGoogleAuth() {
  console.log('[Google Auth] ===== INIT GOOGLE AUTH CALLED =====');
  console.log('[Google Auth] Current working directory:', process.cwd());
  console.log('[Google Auth] Process env NODE_ENV:', process.env.NODE_ENV);

  try {
    setupGoogleAuthHandlers();
    console.log('[Google Auth] initGoogleAuth completed successfully');
  } catch (error) {
    console.error('[Google Auth] initGoogleAuth failed:', error);
    throw error;
  }
}

function setupGoogleAuthHandlers() {
  console.log('[Google Auth] setupGoogleAuthHandlers called');

  // Handle Google Calendar authentication request
  ipcMain.on('google-auth:request-calendar', async (event) => {
    console.log('[Google Auth] Received request-calendar event');

    try {
      console.log('[Google Auth] Starting Google Calendar OAuth flow');

      // Lazy load dependencies
      await loadGoogleDependencies();

      await startGoogleOAuthFlow(event, [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]);
    } catch (error) {
      console.error('[Google Auth] Failed to start Google OAuth flow:', error);
      event.reply('google-auth:result', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate authentication'
      });
    }
  });

  // Handle disconnect
  ipcMain.on('google-auth:disconnect', async (event) => {
    console.log('[Google Auth] Received disconnect event');
    try {
      if (oauth2Client) {
        oauth2Client.setCredentials({});
      }
      console.log('[Google Auth] Disconnected successfully');
      event.reply('google-auth:disconnected', { success: true });
    } catch (error) {
      console.error('[Google Auth] Error during disconnect:', error);
      event.reply('google-auth:disconnected', { success: false, error: error });
    }
  });

  // Handle fetch calendars
  ipcMain.handle('google-calendar:fetch-calendars', async (event, token: string) => {
    console.log('[Google Calendar] Fetching calendars...');

    try {
      await loadGoogleDependencies();

      // Set the token for this request
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      oauth2Client.setCredentials({ access_token: token });

      const response = await calendar.calendarList.list();

      console.log('[Google Calendar] Calendars response:', response.data);

      return {
        success: true,
        calendars: response.data.items || []
      };

    } catch (error) {
      console.error('[Google Calendar] Error fetching calendars:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendars'
      };
    }
  });

  // Handle fetch events
  ipcMain.handle('google-calendar:fetch-events', async (event, params: {
    token: string;
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }) => {
    console.log('[Google Calendar] Fetching events...', params);

    try {
      await loadGoogleDependencies();

      const { token, calendarId = 'primary', timeMin, timeMax, maxResults = 50 } = params;

      // Set the token for this request
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      oauth2Client.setCredentials({ access_token: token });

      // Default time range: next 30 days
      const now = new Date();
      const defaultTimeMin = timeMin || now.toISOString();
      const defaultTimeMax = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await calendar.events.list({
        calendarId,
        timeMin: defaultTimeMin,
        timeMax: defaultTimeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults
      });

      console.log('[Google Calendar] Events response:', response.data);

      return {
        success: true,
        events: response.data.items || []
      };

    } catch (error) {
      console.error('[Google Calendar] Error fetching events:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events'
      };
    }
  });

  console.log('[Google Auth] Handlers set up successfully');
}

async function startGoogleOAuthFlow(event: Electron.IpcMainEvent, scopes: string[]): Promise<void> {
  console.log('[Google Auth] Starting OAuth flow with scopes:', scopes);

  return new Promise(async (resolve, reject) => {
    try {
      // Generate OAuth URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        include_granted_scopes: true,
        prompt: 'consent'
      });

      console.log('[Google Auth] Generated auth URL:', authUrl);
      console.log('[Google Auth] OAuth2 client config:', {
        clientId: oauth2Client._clientId?.substring(0, 10) + '...',
        redirectUri: oauth2Client.redirectUri
      });

      // Start local server to handle callback
      await startCallbackServer(event, resolve, reject);

      // Open auth URL in default browser
      console.log('[Google Auth] Opening external browser...');
      await shell.openExternal(authUrl);
      console.log('[Google Auth] External browser opened');

    } catch (error) {
      console.error('[Google Auth] Error in OAuth flow:', error);
      event.reply('google-auth:result', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      reject(error);
    }
  });
}

async function startCallbackServer(event: Electron.IpcMainEvent, resolve: (value: void) => void, reject: (reason?: any) => void): Promise<void> {
  console.log('[Google Auth] Starting callback server...');

  // Stop any existing server
  if (callbackServer) {
    stopCallbackServer();
  }

  return new Promise((resolveServer, rejectServer) => {
    const app = express();

    app.get('/oauth/google/callback', async (req: any, res: any) => {
      console.log('[Google Auth] Received callback with query:', req.query);
      const { code, error } = req.query;

      if (error) {
        console.error('[Google Auth] OAuth error:', error);
        res.send('<h1>Authentication failed</h1><p>Error: ' + error + '</p><p>You can close this window.</p>');
        event.reply('google-auth:result', {
          success: false,
          error: error as string
        });
        stopCallbackServer();
        reject(new Error(error as string));
        return;
      }

      if (!code) {
        const errorMsg = 'No authorization code received';
        console.error('[Google Auth]', errorMsg);
        res.send('<h1>Authentication failed</h1><p>No authorization code received.</p><p>You can close this window.</p>');
        event.reply('google-auth:result', {
          success: false,
          error: errorMsg
        });
        stopCallbackServer();
        reject(new Error(errorMsg));
        return;
      }

      try {
        console.log('[Google Auth] Exchanging code for tokens...');

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code as string);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        console.log('[Google Auth] Authentication successful for user:', userInfo.data.email);

        res.send(`
          <h1>Authentication successful!</h1>
          <p>Welcome, ${userInfo.data.name || userInfo.data.email}!</p>
          <p>You can close this window and return to the app.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        `);

        event.reply('google-auth:result', {
          success: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          userInfo: userInfo.data
        });

        stopCallbackServer();
        resolve();
      } catch (error) {
        console.error('[Google Auth] Error exchanging code for tokens:', error);
        res.send('<h1>Authentication failed</h1><p>Failed to exchange authorization code.</p><p>You can close this window.</p>');
        event.reply('google-auth:result', {
          success: false,
          error: 'Failed to exchange authorization code'
        });
        stopCallbackServer();
        reject(error);
      }
    });

    // Handle server errors
    callbackServer = app.listen(8080, (err?: Error) => {
      if (err) {
        console.error('[Google Auth] Failed to start callback server:', err);
        if (err.message.includes('EADDRINUSE')) {
          event.reply('google-auth:result', {
            success: false,
            error: 'Port 8080 is already in use. Please close other applications using this port and try again.'
          });
        } else {
          event.reply('google-auth:result', {
            success: false,
            error: 'Failed to start callback server: ' + err.message
          });
        }
        rejectServer(err);
      } else {
        console.log('[Google Auth] OAuth callback server listening on port 8080');
        resolveServer();
      }
    });

    // Handle server errors
    callbackServer.on('error', (err: Error) => {
      console.error('[Google Auth] Callback server error:', err);
      event.reply('google-auth:result', {
        success: false,
        error: 'Callback server error: ' + err.message
      });
      stopCallbackServer();
      rejectServer(err);
    });
  });
}

function stopCallbackServer() {
  if (callbackServer) {
    console.log('[Google Auth] Stopping callback server');
    callbackServer.close();
    callbackServer = null;
  }
}

// Export oauth2Client for potential use in other modules
export { oauth2Client };

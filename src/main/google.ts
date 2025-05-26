import { ipcMain, shell } from 'electron';
import { net } from 'electron';

let callbackServer: any = null;
let express: any = null;
let oauth2Client: any = null;

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:8080/oauth/google/callback';

// Simple OAuth2 client without googleapis
class SimpleOAuth2Client {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private accessToken: string | null = null;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  generateAuthUrl(scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getToken(code: string): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    return response.json();
  }

  setCredentials(credentials: { access_token?: string }) {
    this.accessToken = credentials.access_token || null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// Direct HTTP requests to Google Calendar API
async function fetchCalendarList(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchCalendarEvents(accessToken: string, params: {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}) {
  const { calendarId = 'primary', timeMin, timeMax, maxResults = 50 } = params;

  const searchParams = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: maxResults.toString(),
  });

  if (timeMin) searchParams.append('timeMin', timeMin);
  if (timeMax) searchParams.append('timeMax', timeMax);

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function getUserInfo(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`UserInfo API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Initialize OAuth client immediately (no heavy imports)
oauth2Client = new SimpleOAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);

export function initGoogleAuth() {
  console.log('[Google Auth] ===== INIT GOOGLE AUTH CALLED =====');
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

  // Handle fetch calendars - NO BLOCKING
  ipcMain.handle('google-calendar:fetch-calendars', async (event, token: string) => {
    console.log('[Google Calendar] Fetching calendars...');

    try {
      const response = await fetchCalendarList(token);
      // console.log('[Google Calendar] Calendars response:', response);

      return {
        success: true,
        calendars: response.items || []
      };

    } catch (error) {
      console.error('[Google Calendar] Error fetching calendars:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendars'
      };
    }
  });

  // Handle fetch events - NO BLOCKING
  ipcMain.handle('google-calendar:fetch-events', async (event, params: {
    token: string;
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }) => {
    // console.log('[Google Calendar] Fetching events...', params);

    try {
      const { token, ...eventParams } = params;
      const response = await fetchCalendarEvents(token, eventParams);
      // console.log('[Google Calendar] Events response:', response);

      return {
        success: true,
        events: response.items || []
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
      const authUrl = oauth2Client.generateAuthUrl(scopes);
      console.log('[Google Auth] Generated auth URL:', authUrl);

      // Start local server to handle callback (only load express when needed)
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

  // Only load express when we actually need it
  if (!express) {
    console.log('[Google Auth] Loading express for callback server...');
    express = (await import('express')).default;
  }

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
        const tokens = await oauth2Client.getToken(code as string);
        oauth2Client.setCredentials({ access_token: tokens.access_token });

        // Get user info
        const userInfo = await getUserInfo(tokens.access_token);

        console.log('[Google Auth] Authentication successful for user:', userInfo.email);

        res.send(`
          <h1>Authentication successful!</h1>
          <p>Welcome, ${userInfo.name || userInfo.email}!</p>
          <p>You can close this window and return to the app.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        `);

        event.reply('google-auth:result', {
          success: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : undefined,
          userInfo: userInfo
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
        rejectServer(err);
      } else {
        console.log('[Google Auth] OAuth callback server listening on port 8080');
        resolveServer();
      }
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

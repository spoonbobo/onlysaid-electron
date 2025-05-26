import { ipcMain, shell } from 'electron';

let callbackServer: any = null;
let express: any = null;

// Microsoft OAuth configuration - Public client for desktop app
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
// Remove client secret for public client
const MICROSOFT_TENANT_ID = 'common';
const REDIRECT_URI = 'http://localhost:8081/oauth/microsoft/callback';

// Simple OAuth2 client for Microsoft (similar to Google's approach)
class SimpleMicrosoftOAuth2Client {
  private clientId: string;
  private tenantId: string;
  private redirectUri: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(clientId: string, tenantId: string, redirectUri: string) {
    this.clientId = clientId;
    this.tenantId = tenantId;
    this.redirectUri = redirectUri;
  }

  generateAuthUrl(scopes: string[]): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      response_mode: 'query',
      state: Math.random().toString(36).substring(7),
      prompt: 'select_account'        // Remove domain_hint for public client
    });

    return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  generateAdminConsentUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'Calendars.Read User.Read offline_access openid profile email',
      response_type: 'code',
      prompt: 'admin_consent'
    });

    return `https://login.microsoftonline.com/${this.tenantId}/adminconsent?${params.toString()}`;
  }

  async getToken(code: string): Promise<any> {
    console.log('[Microsoft OAuth] Exchanging code for tokens (public client)...');
    console.log('[Microsoft OAuth] Using client ID:', this.clientId.substring(0, 8) + '...');

    const response = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        // Remove client_secret for public client
      }),
    });

    console.log('[Microsoft OAuth] Token exchange response status:', response.status);
    const result = await response.json();
    console.log('[Microsoft OAuth] Token exchange response keys:', Object.keys(result));

    if (!response.ok || result.error) {
      console.error('[Microsoft OAuth] Token exchange failed:', {
        status: response.status,
        error: result.error,
        errorDescription: result.error_description,
        errorCodes: result.error_codes
      });
      throw new Error(`Token exchange failed: ${result.error_description || result.error}`);
    }

    return result;
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    const response = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        // Remove client_secret for public client
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Microsoft OAuth] Token refresh failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error,
        errorDescription: errorData.error_description,
        errorCodes: errorData.error_codes,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error}`);
    }

    return response.json();
  }

  setCredentials(credentials: { access_token?: string; refresh_token?: string }) {
    this.accessToken = credentials.access_token || null;
    this.refreshToken = credentials.refresh_token || null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }
}

// Updated auth handler for desktop app users
ipcMain.on('microsoft-auth:request-calendar', async (event) => {
  console.log('[Microsoft Auth] Received request-calendar event');

  try {
    await startMicrosoftOAuthFlow(event, [
      'Calendars.Read',           // Read calendar data
      'User.Read',               // Basic user info
      'offline_access',          // Refresh tokens
      'openid',                  // Authentication
      'profile',                 // Basic profile
      'email'                    // Email address
    ]);
  } catch (error) {
    console.error('[Microsoft Auth] Failed to start Microsoft OAuth flow:', error);
    event.reply('microsoft-auth:result', {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate authentication'
    });
  }
});

// Enhanced error handling for desktop app users
async function fetchMicrosoftCalendarList(accessToken: string) {
  console.log('[Microsoft API] Calling Microsoft Graph calendars endpoint...');

  try {
    // Try the standard calendars endpoint first
    console.log('[Microsoft API] Trying calendars collection endpoint...');
    const response = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'ConsistencyLevel': 'eventual'
      },
    });

    console.log('[Microsoft API] Calendars response status:', response.status);
    console.log('[Microsoft API] Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('[Microsoft API] Successfully retrieved calendars, count:', data.value?.length || 0);
      return data;
    } else {
      // Log the exact error response
      const errorText = await response.text();
      console.error('[Microsoft API] Calendars error response:', errorText);

      // Try to parse error details
      try {
        const errorData = JSON.parse(errorText);
        console.error('[Microsoft API] Parsed error details:', {
          error: errorData.error?.code,
          message: errorData.error?.message,
          details: errorData.error?.details
        });
      } catch (parseError) {
        console.error('[Microsoft API] Could not parse error response');
      }
    }

    // If calendars collection fails, try default calendar
    console.log('[Microsoft API] Calendars collection failed, trying default calendar...');
    const defaultCalendarResponse = await fetch('https://graph.microsoft.com/v1.0/me/calendar', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    console.log('[Microsoft API] Default calendar response status:', defaultCalendarResponse.status);

    if (defaultCalendarResponse.ok) {
      const defaultCalendar = await defaultCalendarResponse.json();
      console.log('[Microsoft API] Successfully retrieved default calendar');

      // Return in collection format
      return {
        value: [{
          id: defaultCalendar.id,
          name: defaultCalendar.name || 'My Calendar',
          description: defaultCalendar.description,
          color: defaultCalendar.hexColor || '#1f497d',
          isDefaultCalendar: true,
          canEdit: true,
          owner: defaultCalendar.owner
        }]
      };
    } else {
      const defaultErrorText = await defaultCalendarResponse.text();
      console.error('[Microsoft API] Default calendar error:', defaultErrorText);
    }

    // Try one more endpoint - just check if we can access user info
    console.log('[Microsoft API] Testing basic user access...');
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('[Microsoft API] User access works:', {
        userPrincipalName: userData.userPrincipalName,
        mail: userData.mail,
        displayName: userData.displayName
      });
    }

    throw new Error('Unable to access Microsoft Calendar. Please ensure you have re-authenticated after changing the app configuration.');

  } catch (error) {
    console.error('[Microsoft API] Error fetching calendars:', error);
    throw error;
  }
}

async function fetchMicrosoftCalendarEvents(accessToken: string, params: {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
}) {
  const { calendarId = 'calendar', timeMin, timeMax, maxResults = 50 } = params;

  // Default time range: next 30 days if not specified
  const now = new Date();
  const defaultTimeMin = timeMin || now.toISOString();
  const defaultTimeMax = timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const searchParams = new URLSearchParams({
    startDateTime: defaultTimeMin,
    endDateTime: defaultTimeMax,
    '$orderby': 'start/dateTime',
  });

  if (maxResults) {
    searchParams.append('$top', maxResults.toString());
  }

  const url = `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events?${searchParams.toString()}`;

  console.log('[Microsoft API] Fetching events from URL:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  console.log('[Microsoft API] Events response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Microsoft API] Events error response body:', errorText);
    throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Microsoft API] Events count:', data.value?.length || 0);
  return data;
}

async function getMicrosoftUserInfo(accessToken: string) {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// Initialize OAuth client immediately (no heavy imports)
const oauth2Client = new SimpleMicrosoftOAuth2Client(
  MICROSOFT_CLIENT_ID,
  MICROSOFT_TENANT_ID,
  REDIRECT_URI
);

export function initMicrosoftAuth() {
  console.log('[Microsoft Auth] ===== INIT MICROSOFT AUTH CALLED =====');
  try {
    setupMicrosoftAuthHandlers();
    console.log('[Microsoft Auth] initMicrosoftAuth completed successfully');
  } catch (error) {
    console.error('[Microsoft Auth] initMicrosoftAuth failed:', error);
    throw error;
  }
}

function setupMicrosoftAuthHandlers() {
  console.log('[Microsoft Auth] setupMicrosoftAuthHandlers called');

  // Handle Microsoft Calendar authentication request
  ipcMain.on('microsoft-auth:request-calendar', async (event) => {
    console.log('[Microsoft Auth] Received request-calendar event');

    try {
      await startMicrosoftOAuthFlow(event, [
        'Calendars.Read',           // Read calendar data
        'User.Read',               // Basic user info
        'offline_access',          // Refresh tokens
        'openid',                  // Authentication
        'profile',                 // Basic profile
        'email'                    // Email address
      ]);
    } catch (error) {
      console.error('[Microsoft Auth] Failed to start Microsoft OAuth flow:', error);
      event.reply('microsoft-auth:result', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate authentication'
      });
    }
  });

  // Handle disconnect
  ipcMain.on('microsoft-auth:disconnect', async (event) => {
    console.log('[Microsoft Auth] Received disconnect event');
    try {
      if (oauth2Client) {
        oauth2Client.setCredentials({});
      }
      console.log('[Microsoft Auth] Disconnected successfully');
      event.reply('microsoft-auth:disconnected', { success: true });
    } catch (error) {
      console.error('[Microsoft Auth] Error during disconnect:', error);
      event.reply('microsoft-auth:disconnected', { success: false, error: error });
    }
  });

  // Handle token refresh
  ipcMain.handle('microsoft-auth:refresh-token', async (event, refreshToken: string) => {
    console.log('[Microsoft Auth] Refreshing access token...');

    try {
      const tokens = await oauth2Client.refreshAccessToken(refreshToken);
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken // Use new refresh token if provided, otherwise keep existing
      });

      console.log('[Microsoft Auth] Token refreshed successfully');
      return {
        success: true,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || refreshToken,
        expiryDate: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : undefined
      };

    } catch (error) {
      console.error('[Microsoft Auth] Error refreshing token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh token'
      };
    }
  });

  // Handle fetch calendars with enhanced external user support
  ipcMain.handle('microsoft-calendar:fetch-calendars', async (event, token: string, refreshToken?: string) => {
    console.log('[Microsoft Calendar] Fetching calendars with token length:', token.length);
    console.log('[Microsoft Calendar] Has refresh token:', !!refreshToken);

    // Debug token information
    const tokenInfo = await debugTokenScopes(token);

    try {
      console.log('[Microsoft Calendar] Making API call to fetch calendars...');
      const response = await fetchMicrosoftCalendarList(token);
      console.log('[Microsoft Calendar] Raw API response:', {
        hasValue: !!response?.value,
        valueLength: response?.value?.length || 0,
        keys: Object.keys(response || {})
      });
      console.log('[Microsoft Calendar] Calendars response:', response);

      return {
        success: true,
        calendars: response.value || []
      };

    } catch (error) {
      console.error('[Microsoft Calendar] Error fetching calendars:', error);
      console.error('[Microsoft Calendar] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack'
      });

      // Check if this is an external user permission issue
      if (error instanceof Error && error.message.includes('External/Guest')) {
        return {
          success: false,
          error: error.message,
          isExternalUserIssue: true,
          requiresAdminAction: true
        };
      }

      // If 401 error and we have a refresh token, try to refresh
      if (error instanceof Error && error.message.includes('401') && refreshToken) {
        console.log('[Microsoft Calendar] Attempting to refresh token and retry...');
        try {
          const refreshResult = await oauth2Client.refreshAccessToken(refreshToken);
          const retryResponse = await fetchMicrosoftCalendarList(refreshResult.access_token);

          return {
            success: true,
            calendars: retryResponse.value || [],
            newToken: {
              accessToken: refreshResult.access_token,
              refreshToken: refreshResult.refresh_token || refreshToken,
              expiryDate: refreshResult.expires_in ? Date.now() + (refreshResult.expires_in * 1000) : undefined
            }
          };
        } catch (refreshError) {
          console.error('[Microsoft Calendar] Token refresh failed:', refreshError);

          // Check if refresh error is also external user related
          if (refreshError instanceof Error && refreshError.message.includes('External/Guest')) {
            return {
              success: false,
              error: refreshError.message,
              isExternalUserIssue: true,
              requiresAdminAction: true
            };
          }

          return {
            success: false,
            error: 'Token expired and refresh failed',
            requiresReauth: true
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendars'
      };
    }
  });

  // Handle fetch events with auto-refresh
  ipcMain.handle('microsoft-calendar:fetch-events', async (event, params: {
    token: string;
    refreshToken?: string;
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }) => {
    console.log('[Microsoft Calendar] Fetching events...', params);

    try {
      const { token, refreshToken, ...eventParams } = params;
      const response = await fetchMicrosoftCalendarEvents(token, eventParams);
      console.log('[Microsoft Calendar] Events response:', response);

      return {
        success: true,
        events: response.value || []
      };

    } catch (error) {
      console.error('[Microsoft Calendar] Error fetching events:', error);

      // If 401 error and we have a refresh token, try to refresh
      if (error instanceof Error && error.message.includes('401') && params.refreshToken) {
        console.log('[Microsoft Calendar] Attempting to refresh token and retry...');
        try {
          const refreshResult = await oauth2Client.refreshAccessToken(params.refreshToken);
          const { token, refreshToken, ...eventParams } = params;
          const retryResponse = await fetchMicrosoftCalendarEvents(refreshResult.access_token, eventParams);

          return {
            success: true,
            events: retryResponse.value || [],
            newToken: {
              accessToken: refreshResult.access_token,
              refreshToken: refreshResult.refresh_token || params.refreshToken,
              expiryDate: refreshResult.expires_in ? Date.now() + (refreshResult.expires_in * 1000) : undefined
            }
          };
        } catch (refreshError) {
          console.error('[Microsoft Calendar] Token refresh failed:', refreshError);
          return {
            success: false,
            error: 'Token expired and refresh failed',
            requiresReauth: true
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events'
      };
    }
  });

  console.log('[Microsoft Auth] Handlers set up successfully');
}

async function startMicrosoftOAuthFlow(event: Electron.IpcMainEvent, scopes: string[]): Promise<void> {
  console.log('[Microsoft Auth] Starting OAuth flow with scopes:', scopes);

  return new Promise(async (resolve, reject) => {
    try {
      // Generate OAuth URL
      const authUrl = oauth2Client.generateAuthUrl(scopes);
      console.log('[Microsoft Auth] Generated auth URL:', authUrl);

      // Start local server to handle callback (only load express when needed)
      await startCallbackServer(event, resolve, reject);

      // Open auth URL in default browser
      console.log('[Microsoft Auth] Opening external browser...');
      await shell.openExternal(authUrl);
      console.log('[Microsoft Auth] External browser opened');

    } catch (error) {
      console.error('[Microsoft Auth] Error in OAuth flow:', error);
      event.reply('microsoft-auth:result', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      reject(error);
    }
  });
}

async function startCallbackServer(event: Electron.IpcMainEvent, resolve: (value: void) => void, reject: (reason?: any) => void): Promise<void> {
  console.log('[Microsoft Auth] Starting callback server...');

  // Only load express when we actually need it
  if (!express) {
    console.log('[Microsoft Auth] Loading express for callback server...');
    express = (await import('express')).default;
  }

  // Stop any existing server
  if (callbackServer) {
    stopCallbackServer();
  }

  return new Promise((resolveServer, rejectServer) => {
    const app = express();

    app.get('/oauth/microsoft/callback', async (req: any, res: any) => {
      console.log('[Microsoft Auth] Received callback with query:', req.query);
      const { code, error } = req.query;

      if (error) {
        console.error('[Microsoft Auth] OAuth error:', error);
        res.send('<h1>Authentication failed</h1><p>Error: ' + error + '</p><p>You can close this window.</p>');
        event.reply('microsoft-auth:result', {
          success: false,
          error: error as string
        });
        stopCallbackServer();
        reject(new Error(error as string));
        return;
      }

      if (!code) {
        const errorMsg = 'No authorization code received';
        console.error('[Microsoft Auth]', errorMsg);
        res.send('<h1>Authentication failed</h1><p>No authorization code received.</p><p>You can close this window.</p>');
        event.reply('microsoft-auth:result', {
          success: false,
          error: errorMsg
        });
        stopCallbackServer();
        reject(new Error(errorMsg));
        return;
      }

      try {
        console.log('[Microsoft Auth] Exchanging code for tokens...');

        // Exchange code for tokens
        const tokens = await oauth2Client.getToken(code as string);
        console.log('[Microsoft Auth] Token exchange response keys:', Object.keys(tokens));
        console.log('[Microsoft Auth] Raw token response:', {
          access_token_length: tokens.access_token?.length,
          access_token_start: tokens.access_token?.substring(0, 20),
          refresh_token_length: tokens.refresh_token?.length,
          refresh_token_start: tokens.refresh_token?.substring(0, 20),
          token_type: tokens.token_type,
          expires_in: tokens.expires_in
        });

        oauth2Client.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token
        });

        // Get user info
        const userInfo = await getMicrosoftUserInfo(tokens.access_token);

        console.log('[Microsoft Auth] Authentication successful for user:', userInfo.mail || userInfo.userPrincipalName);

        res.send(`
          <h1>Authentication successful!</h1>
          <p>Welcome, ${userInfo.displayName || userInfo.mail || userInfo.userPrincipalName}!</p>
          <p>You can close this window and return to the app.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        `);

        event.reply('microsoft-auth:result', {
          success: true,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : undefined,
          userInfo: userInfo
        });

        stopCallbackServer();
        resolve();
      } catch (error) {
        console.error('[Microsoft Auth] Error exchanging code for tokens:', error);
        res.send('<h1>Authentication failed</h1><p>Failed to exchange authorization code.</p><p>You can close this window.</p>');
        event.reply('microsoft-auth:result', {
          success: false,
          error: 'Failed to exchange authorization code'
        });
        stopCallbackServer();
        reject(error);
      }
    });

    // Handle server errors
    callbackServer = app.listen(8081, (err?: Error) => {
      if (err) {
        console.error('[Microsoft Auth] Failed to start callback server:', err);
        rejectServer(err);
      } else {
        console.log('[Microsoft Auth] OAuth callback server listening on port 8081');
        resolveServer();
      }
    });
  });
}

function stopCallbackServer() {
  if (callbackServer) {
    console.log('[Microsoft Auth] Stopping callback server');
    callbackServer.close();
    callbackServer = null;
  }
}

async function debugTokenScopes(accessToken: string) {
  try {
    // Decode JWT token to check scopes (for debugging)
    const tokenParts = accessToken.split('.');
    if (tokenParts.length >= 2) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('[Microsoft Auth] Token scopes:', payload.scp || payload.scope);
      console.log('[Microsoft Auth] Token audience:', payload.aud);
      console.log('[Microsoft Auth] Token issuer:', payload.iss);
      return payload;
    }
  } catch (error) {
    console.error('[Microsoft Auth] Error decoding token:', error);
  }
  return null;
}

// Export oauth2Client for potential use in other modules
export { oauth2Client };
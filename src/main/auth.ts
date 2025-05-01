import { BrowserWindow, ipcMain } from 'electron';

// Will be imported from main.ts
let ONLYSAID_API_URL: string;

let authWindow: BrowserWindow | null = null;

// Function to initialize the authentication module with the API URL
export function initAuth(apiUrl: string) {
  ONLYSAID_API_URL = apiUrl;
  setupAuthHandlers();
}

// Set up all auth-related IPC handlers
function setupAuthHandlers() {
  // Handle authentication request
  ipcMain.on('auth:sign-in', async (event) => {
    // Create a new window for auth
    if (authWindow) {
      authWindow.focus();
      return;
    }

    let authCompleted = false;

    authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Inject code to observe network requests and extract session data
    authWindow.webContents.on('did-finish-load', async () => {
      try {
        // Inject code to monitor fetch/XHR requests and capture session data
        await authWindow?.webContents.executeJavaScript(`
          (function() {
            // Create a global variable to store the session data
            window.__authSessionData = null;

            // Monitor fetch requests
            const originalFetch = window.fetch;
            window.fetch = async function(url, options) {
              const response = await originalFetch.apply(this, arguments);

              // Clone the response so we can read it twice
              const responseClone = response.clone();

              // Check if this is a session-related request
              if (url.toString().includes('/session') || url.toString().includes('/api/auth')) {
                try {
                  const data = await responseClone.json();
                  console.log('Fetch response intercepted:', url, data);

                  if (data && data.user) {
                    console.log('Session data found in fetch response!', data);
                    window.__authSessionData = data;
                  }
                } catch (e) {
                  console.error('Error parsing fetch response:', e);
                }
              }

              return response;
            };

            // Monitor XMLHttpRequest
            const originalXhrOpen = XMLHttpRequest.prototype.open;
            const originalXhrSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.open = function() {
              this._url = arguments[1];
              return originalXhrOpen.apply(this, arguments);
            };

            XMLHttpRequest.prototype.send = function() {
              if (this._url && (this._url.includes('/session') || this._url.includes('/api/auth'))) {
                const originalOnLoad = this.onload;
                this.onload = function() {
                  try {
                    if (this.responseText) {
                      const data = JSON.parse(this.responseText);
                      console.log('XHR response intercepted:', this._url, data);

                      if (data && data.user) {
                        console.log('Session data found in XHR response!', data);
                        window.__authSessionData = data;
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing XHR response:', e);
                  }

                  if (originalOnLoad) {
                    originalOnLoad.apply(this, arguments);
                  }
                };
              }

              return originalXhrSend.apply(this, arguments);
            };

            // Add a function to check if we have session data
            window.checkForSessionData = function() {
              return window.__authSessionData;
            };

            return "Network monitoring set up successfully";
          })();
        `);

        // Check for session cookies that indicate the user is logged in
        const checkForSession = async () => {
          const cookies = await authWindow?.webContents.session.cookies.get({
            url: ONLYSAID_API_URL
          });

          const sessionCookie = cookies?.find(cookie =>
            cookie.name === 'next-auth.session-token' ||
            cookie.name === '__Secure-next-auth.session-token'
          );

          if (sessionCookie) {
            console.log('Found session cookie, checking for user data...', sessionCookie);
            return sessionCookie;
          }

          return null;
        };

        // Make an initial session check
        const sessionCookie = await checkForSession();

        // If we already have a session cookie, try to get session data immediately
        if (sessionCookie) {
          // Try a direct fetch to the session endpoint
          await authWindow?.webContents.executeJavaScript(`
            fetch('/api/auth/session')
              .then(res => res.json())
              .then(data => {
                console.log('Initial fetch result:', data);
                window.__authSessionData = data;
              })
              .catch(err => console.error('Initial fetch error:', err));
          `);

          // Give it a moment to process
          setTimeout(async () => {
            const sessionData = await authWindow?.webContents.executeJavaScript('window.checkForSessionData()');

            if (sessionData && sessionData.user) {
              console.log('Retrieved session data on initial load!', sessionData);

              // Send the data back to the renderer
              event.reply('auth:signed-in', {
                success: true,
                token: sessionCookie.value,
                cookieName: sessionCookie.name,
                userData: sessionData.user
              });

              authCompleted = true;

              // Close the auth window
              setTimeout(() => {
                if (authWindow) {
                  authWindow.close();
                  authWindow = null;
                }
              }, 1000);
            } else {
              // Start polling if we didn't get data right away
              startPolling(sessionCookie);
            }
          }, 1000);
        }
      } catch (e) {
        console.error('Error setting up network monitoring:', e);
      }
    });

    // Function to start polling for session data
    const startPolling = (sessionCookie: any) => {
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = setInterval(async () => {
        try {
          attempts++;
          console.log(`Polling for session data (attempt ${attempts}/${maxAttempts})...`);

          // Check if we have session data
          const sessionData = await authWindow?.webContents.executeJavaScript('window.checkForSessionData()');

          // If we found session data
          if (sessionData && sessionData.user) {
            console.log('Successfully retrieved session data!', sessionData);
            clearInterval(pollInterval);

            // Send the token and user data back to the renderer process
            event.reply('auth:signed-in', {
              success: true,
              token: sessionCookie.value,
              cookieName: sessionCookie.name,
              userData: sessionData.user
            });

            authCompleted = true;

            // Close the auth window after a delay
            setTimeout(() => {
              if (authWindow) {
                authWindow.close();
                authWindow = null;
              }
            }, 1000);
            return;
          }

          // Try to fetch the session manually on each attempt
          if (attempts % 2 === 0) {
            await authWindow?.webContents.executeJavaScript(`
              fetch('/api/auth/session')
                .then(res => res.json())
                .then(data => {
                  console.log('Manual fetch result:', data);
                  window.__authSessionData = data;
                })
                .catch(err => console.error('Manual fetch error:', err));
            `);
          }

          // If we've reached max attempts, create default user data
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            console.log('Max polling attempts reached, using default user data');

            // User is authenticated (we have a session cookie) but we couldn't get details
            event.reply('auth:signed-in', {
              success: true,
              token: sessionCookie.value,
              cookieName: sessionCookie.name,
              userData: {
                name: 'Authenticated User',
                email: 'user@example.com',
                image: ''
              }
            });

            authCompleted = true;

            // Close the auth window
            if (authWindow) {
              authWindow.close();
              authWindow = null;
            }
          }
        } catch (e) {
          console.error('Error polling for session data:', e);

          // If we've reached max attempts, fall back to default user
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            // Handle error case
          }
        }
      }, 1000);
    };

    // Load the Next.js auth page
    authWindow.loadURL(ONLYSAID_API_URL + '/zh-HK/signin');

    // Watch for URL changes - simplified to just detect when we leave the signin page
    authWindow.webContents.on('did-navigate', async (_, url) => {
      console.log('Navigation to:', url);

      // If we've navigated away from the signin page, we might be logged in
      if (!url.includes('/signin') && !authCompleted) {
        // Check for session cookie
        const cookies = await authWindow?.webContents.session.cookies.get({
          url: ONLYSAID_API_URL
        });

        const sessionCookie = cookies?.find(cookie =>
          cookie.name === 'next-auth.session-token' ||
          cookie.name === '__Secure-next-auth.session-token'
        );

        if (sessionCookie) {
          // Start polling for session data
          startPolling(sessionCookie);
        }
      }
    });

    // Handle auth window closed
    authWindow.on('closed', () => {
      // If the window was closed but auth wasn't completed, notify the renderer
      if (!authCompleted) {
        event.reply('auth:signed-in', {
          success: false,
          error: 'Authentication window closed before completion'
        });
      }

      authWindow = null;
    });
  });
}

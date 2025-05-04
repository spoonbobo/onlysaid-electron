import { TextField, Switch, Button, FormControlLabel, Typography, Box } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { FormattedMessage, useIntl as useReactIntl } from "react-intl";
import SettingsSection from "@/components/Settings/SettingsSection";
import SettingsFormField from "@/components/Settings/SettingsFormField";
import { useUserStore } from "@/stores/User/User";
import { useUserTokenStore } from "@/stores/User/UserToken";
import { useIntl } from "@/providers/IntlProvider";
import { useThemeStore } from "@/providers/MaterialTheme";
import authService from "@/service/auth";
import { toast } from "@/utils/toast";

function UserPreferences() {
  const { locale, setLocale, availableLocales } = useIntl();
  const intl = useReactIntl();
  const user = useUserStore(state => state.user);
  const setUser = useUserStore(state => state.setUser);
  const { setToken, clearToken, setSigningIn, setSignInError, getToken } = useUserTokenStore();
  const { mode, setMode } = useThemeStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState({
    darkMode: mode === 'dark',
    language: locale
  });

  // Use a ref for the timeout to avoid hook dependency issues
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Update language preference when locale changes
    setPreferences(prev => ({
      ...prev,
      language: locale
    }));
  }, [locale]);

  useEffect(() => {
    // Update darkMode preference when theme mode changes
    setPreferences(prev => ({
      ...prev,
      darkMode: mode === 'dark'
    }));
  }, [mode]);

  useEffect(() => {
    // Set up the listener for auth responses
    const removeListener = window.electron.ipcRenderer.on('auth:signed-in', async (response: any) => {
      setSigningIn(false);

      // Clear timeout if it exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (response.success) {
        try {
          // Store token in UserTokenStore
          if (response.token && response.cookieName) {
            setToken(response.token, response.cookieName);
            console.log('Token set:', response.token, response.cookieName);
            console.log('Token:', getToken());
          }

          // We should have userData directly from the main process now
          if (response.userData) {
            const userData = authService.createUserFromData(response.userData);
            console.log('User data:', userData);

            if (userData) {
              // Store user data in Zustand store
              setUser(userData);
              setError('');
              setSignInError(null);
              // Show success toast
              toast.success(intl.formatMessage(
                { id: 'toast.welcome' },
                { name: userData.name }
              ));
            } else {
              const errorMsg = 'Could not create user from provided data';
              setError(errorMsg);
              setSignInError(errorMsg);
              toast.error(errorMsg);
            }
          } else {
            const errorMsg = 'No user data received from authentication';
            setError(errorMsg);
            setSignInError(errorMsg);
            toast.error(errorMsg);
          }
        } catch (error) {
          console.error('Error processing user data:', error);
          const errorMsg = 'Failed to process user data';
          setError(errorMsg);
          setSignInError(errorMsg);
          toast.error(errorMsg);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        const errorMsg = response.error || 'Authentication failed';
        setError(errorMsg);
        setSignInError(errorMsg);
        toast.error(errorMsg);
      }
    });

    // Clean up listener when component unmounts
    return () => {
      if (removeListener) removeListener();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [setUser, setToken, setSignInError, intl]);

  const handleSignIn = () => {
    setIsLoading(true);
    setError('');
    setSignInError(null);
    setSigningIn(true);
    toast.info(intl.formatMessage({ id: 'toast.signingIn' }));

    // Send authentication request to the main process
    window.electron.ipcRenderer.sendMessage('auth:sign-in');

    // Set a timeout to handle cases where no response comes back
    // Store the timeout ID in the ref
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setSigningIn(false);
      const errorMsg = 'Authentication timed out. Please try again.';
      setError(errorMsg);
      setSignInError(errorMsg);
      toast.warning(intl.formatMessage({ id: 'toast.authTimeout' }));
    }, 60000); // 1 minute timeout
  };

  const handleLogout = () => {
    setUser(null);
    clearToken();
    toast.info(intl.formatMessage({ id: 'toast.loggedOut' }));
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));

    // If language changed, update the locale
    if (key === 'language') {
      setLocale(value);
    }

    // If darkMode changed, update the theme mode
    if (key === 'darkMode') {
      setMode(value ? 'dark' : 'light');
    }
  };

  return (
    <>
      <SettingsSection title={<FormattedMessage id="settings.account" />} sx={{ mb: 3 }}>
        <Box sx={{ py: 2 }}>
          {!user ? (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <FormattedMessage id="settings.signinMessage" />
              </Typography>
              {error && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                  {error}
                </Typography>
              )}
              <Button
                variant="contained"
                onClick={handleSignIn}
                disabled={isLoading}
              >
                {isLoading ?
                  <FormattedMessage id="settings.signingIn" /> :
                  <FormattedMessage id="settings.signin" />}
              </Button>
            </>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
                <FormattedMessage id="settings.signedInAs" />
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {user.name} ({user.email})
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={handleLogout}
              >
                <FormattedMessage id="settings.logout" />
              </Button>
            </>
          )}
        </Box>
      </SettingsSection>

      <SettingsSection title={<FormattedMessage id="settings.userPreferences" />}>
        <SettingsFormField>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.darkMode}
                onChange={(e) => handlePreferenceChange('darkMode', e.target.checked)}
              />
            }
            label={<FormattedMessage id="settings.darkMode" />}
          />
        </SettingsFormField>

        <SettingsFormField label={<FormattedMessage id="settings.language" />}>
          <TextField
            select
            fullWidth
            size="small"
            value={preferences.language}
            onChange={(e) => handlePreferenceChange('language', e.target.value)}
            slotProps={{
              select: {
                native: true
              }
            }}
          >
            <option value="en">
              <FormattedMessage id="language.english" />
            </option>
            <option value="es">
              <FormattedMessage id="language.spanish" />
            </option>
            <option value="fr">
              <FormattedMessage id="language.french" />
            </option>
            <option value="zh-hk">
              <FormattedMessage id="language.chinese" />
            </option>
          </TextField>
        </SettingsFormField>

      </SettingsSection>
    </>
  );
}

export default UserPreferences;
import { TextField, Switch, Button, FormControlLabel, Typography, Box } from "@mui/material";
import { useState, useEffect } from "react";
import { FormattedMessage, useIntl as useReactIntl } from "react-intl";
import SettingsSection from "@/components/Settings/SettingsSection";
import SettingsFormField from "@/components/Settings/SettingsFormField";
import { useUserStore } from "@/stores/User/UserStore";
import { useIntl } from "@/providers/IntlProvider";
import { useThemeStore } from "@/providers/MaterialTheme";
import { toast } from "@/utils/toast";

function UserPreferences() {
  const { locale, setLocale } = useIntl();
  const intl = useReactIntl();
  const user = useUserStore(state => state.user);
  const isLoading = useUserStore(state => state.isLoading);
  const error = useUserStore(state => state.error);
  const signIn = useUserStore(state => state.signIn);
  const logout = useUserStore(state => state.logout);
  const { mode, setMode } = useThemeStore();
  const [preferences, setPreferences] = useState({
    darkMode: mode === 'dark',
    language: locale
  });

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

  const handleSignIn = () => {
    signIn();
    toast.info(intl.formatMessage({ id: 'toast.signingIn' }));
  };

  const handleLogout = () => {
    logout();
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
                {user.username} ({user.email})
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

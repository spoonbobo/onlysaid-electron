import { TextField, Switch, Button, FormControlLabel, Typography, Box, List, ListItem, ListItemText, ListItemIcon, Chip } from "@mui/material";
import { useState, useEffect } from "react";
import { FormattedMessage, useIntl as useReactIntl } from "react-intl";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import SettingsFormField from "@/renderer/components/Settings/SettingsFormField";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";
import { useIntl } from "@/renderer/providers/IntlProvider";
import { useThemeStore } from "@/renderer/providers/MaterialTheme";
import { toast } from "@/utils/toast";
import { AccountBox, Computer, Smartphone, Tablet } from "@mui/icons-material";
import ThemeCustomization from "@/renderer/components/Settings/ThemeCustomization";

interface DeviceInfo {
  platform: string;
  arch: string;
  hostname: string;
  osVersion: string;
  totalMemory: number;
  cpuCount: number;
  nodeVersion: string;
  electronVersion: string;
}

interface Device {
  id: string;
  name: string;
  platform: string;
  osVersion: string;
  lastSeen: string;
  isCurrent: boolean;
}

function UserPreferences() {
  const { locale, setLocale } = useIntl();
  const intl = useReactIntl();
  const user = useUserStore(state => state.user);
  const isLoading = useUserStore(state => state.isLoading);
  const error = useUserStore(state => state.error);
  const signIn = useUserStore(state => state.signIn);
  const cancelSignIn = useUserStore(state => state.cancelSignIn);
  const logout = useUserStore(state => state.logout);

  const isSigningIn = useUserTokenStore(state => state.isSigningIn);
  const signInError = useUserTokenStore(state => state.signInError);

  const { mode, setMode } = useThemeStore();

  const [preferences, setPreferences] = useState({
    darkMode: mode === 'dark',
    language: locale
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [currentDeviceInfo, setCurrentDeviceInfo] = useState<DeviceInfo | null>(null);
  const [deviceId, setDeviceId] = useState<string>("");

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
    // Fetch current device information
    const fetchDeviceInfo = async () => {
      try {
        const [deviceInfo, deviceIdResult] = await Promise.all([
          window.electron.app.getDeviceInfo(),
          window.electron.app.getDeviceId()
        ]);
        
        setCurrentDeviceInfo(deviceInfo);
        setDeviceId(deviceIdResult);

        // Create current device entry
        const currentDevice: Device = {
          id: deviceIdResult,
          name: deviceInfo.hostname,
          platform: formatPlatform(deviceInfo.platform),
          osVersion: deviceInfo.osVersion,
          lastSeen: new Date().toISOString(),
          isCurrent: true
        };

        // For now, just show the current device
        // TODO: Replace with actual API call when device list endpoint is implemented
        setDevices([currentDevice]);
      } catch (error) {
        console.error('Error fetching device info:', error);
      }
    };

    fetchDeviceInfo();
  }, []);

  const formatPlatform = (platform: string) => {
    const platformMap: Record<string, string> = {
      'win32': 'Windows',
      'darwin': 'macOS',
      'linux': 'Linux',
      'freebsd': 'FreeBSD',
      'openbsd': 'OpenBSD',
      'sunos': 'SunOS'
    };
    return platformMap[platform] || platform;
  };

  const getDeviceIcon = (platform: string) => {
    const lowerPlatform = platform.toLowerCase();
    if (lowerPlatform.includes('windows') || lowerPlatform.includes('mac') || lowerPlatform.includes('linux')) {
      return <Computer />;
    } else if (lowerPlatform.includes('android') || lowerPlatform.includes('ios')) {
      return <Smartphone />;
    } else if (lowerPlatform.includes('tablet') || lowerPlatform.includes('ipad')) {
      return <Tablet />;
    }
    return <Computer />;
  };

  const handleSignIn = () => {
    signIn();
    toast.info(intl.formatMessage({ id: 'toast.signingIn' }));
  };

  const handleCancelSignIn = () => {
    cancelSignIn();
    toast.info(intl.formatMessage({ id: 'toast.signInCancelled' }));
  };

  const handleLogout = () => {
    logout();
    toast.info(intl.formatMessage({ id: 'toast.loggedOut' }));
  };

  const handleManageAccount = async () => {
    try {
      const result = await window.electron.app.openAccountManagement();
      if (result.success) {
        toast.info(intl.formatMessage({ id: 'toast.openingExternalLink' }));
      } else {
        toast.error(intl.formatMessage({ id: 'toast.errorOpeningLink' }));
      }
    } catch (error) {
      console.error('Error opening account management:', error);
      toast.error(intl.formatMessage({ id: 'toast.errorOpeningLink' }));
    }
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

  const isAuthenticating = isLoading || isSigningIn;
  const authError = error || signInError;

  return (
    <>
      <SettingsSection title={<FormattedMessage id="settings.account" />} sx={{ mb: 3 }}>
        <Box sx={{ py: 2 }}>
          {!user ? (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <FormattedMessage id="settings.signinMessage" />
              </Typography>
              {authError && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                  {authError}
                </Typography>
              )}

              {!isAuthenticating ? (
                <Button
                  variant="contained"
                  onClick={handleSignIn}
                >
                  <FormattedMessage id="settings.signin" />
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleCancelSignIn}
                  >
                    <FormattedMessage id="settings.cancelSignIn" />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    <FormattedMessage id="settings.signingIn" />
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 1 }}>
                <FormattedMessage id="settings.signedInAs" />
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {user.username} ({user.email})
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<AccountBox />}
                  onClick={handleManageAccount}
                >
                  <FormattedMessage id="settings.manageAccount" />
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleLogout}
                >
                  <FormattedMessage id="settings.logout" />
                </Button>
              </Box>
            </>
          )}
        </Box>
      </SettingsSection>

      <SettingsSection title={<FormattedMessage id="settings.connectedDevices" />} sx={{ mb: 3 }}>
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <FormattedMessage id="settings.connectedDevicesDescription" />
          </Typography>
          
          <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {devices.map((device, index) => (
              <ListItem key={device.id} divider={index < devices.length - 1}>
                <ListItemIcon>
                  {getDeviceIcon(device.platform)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {device.name}
                      </Typography>
                      {device.isCurrent && (
                        <Chip 
                          label={<FormattedMessage id="settings.currentDevice" />}
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {device.platform} {device.osVersion}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <FormattedMessage 
                          id="settings.deviceId" 
                          values={{ id: device.id }}
                        />
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        <FormattedMessage 
                          id="settings.lastSeen" 
                          values={{ 
                            time: new Date(device.lastSeen).toLocaleString(locale)
                          }}
                        />
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </SettingsSection>

      <SettingsSection title={<FormattedMessage id="settings.userPreferences" />} sx={{ mb: 3 }}>
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
            <option value="zh-hk">
              <FormattedMessage id="language.chinese" />
            </option>
            <option value="ja">
              <FormattedMessage id="language.japanese" />
            </option>
          </TextField>
        </SettingsFormField>
      </SettingsSection>

      <SettingsSection title={<FormattedMessage id="settings.themeCustomization" />}>
        <ThemeCustomization />
      </SettingsSection>
    </>
  );
}

export default UserPreferences;

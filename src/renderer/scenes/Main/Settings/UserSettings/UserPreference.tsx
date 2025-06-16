import { TextField, Switch, Button, FormControlLabel, Typography, Box, List, ListItem, ListItemText, ListItemIcon, Chip, IconButton, CircularProgress } from "@mui/material";
import { useState, useEffect } from "react";
import { FormattedMessage, useIntl as useReactIntl } from "react-intl";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import SettingsFormField from "@/renderer/components/Settings/SettingsFormField";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";
import { useIntl } from "@/renderer/providers/IntlProvider";
import { useThemeStore } from "@/renderer/providers/MaterialTheme";
import { toast } from "@/utils/toast";
import { AccountBox, Computer, Smartphone, Tablet, Delete, Refresh } from "@mui/icons-material";
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

function UserPreferences() {
  const { locale, setLocale } = useIntl();
  const intl = useReactIntl();
  
  // User store
  const user = useUserStore(state => state.user);
  const isLoading = useUserStore(state => state.isLoading);
  const error = useUserStore(state => state.error);
  const signIn = useUserStore(state => state.signIn);
  const cancelSignIn = useUserStore(state => state.cancelSignIn);
  const logout = useUserStore(state => state.logout);
  
  // Device management from store
  const devices = useUserStore(state => state.devices);
  const isDevicesLoading = useUserStore(state => state.isDevicesLoading);
  const devicesError = useUserStore(state => state.devicesError);
  const fetchDevices = useUserStore(state => state.fetchDevices);
  const registerDevice = useUserStore(state => state.registerDevice);
  const removeDevice = useUserStore(state => state.removeDevice);
  const updateDeviceLastSeenOnStartup = useUserStore(state => state.updateDeviceLastSeenOnStartup);

  const isSigningIn = useUserTokenStore(state => state.isSigningIn);
  const signInError = useUserTokenStore(state => state.signInError);

  const { mode, setMode } = useThemeStore();

  const [preferences, setPreferences] = useState({
    darkMode: mode === 'dark',
    language: locale
  });

  const [currentDeviceInfo, setCurrentDeviceInfo] = useState<DeviceInfo | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("");
  const [hasRegisteredCurrentDevice, setHasRegisteredCurrentDevice] = useState(false);

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
        setCurrentDeviceId(deviceIdResult);
      } catch (error) {
        console.error('Error fetching device info:', error);
      }
    };

    fetchDeviceInfo();
  }, []);

  useEffect(() => {
    // Fetch devices when user is authenticated
    if (user) {
      fetchDevices();
    }
  }, [user, fetchDevices]);

  useEffect(() => {
    // Register current device if not in the list and user is authenticated
    // Only run this once when the component mounts and we have all the required data
    if (user && currentDeviceId && currentDeviceInfo && !hasRegisteredCurrentDevice && !isDevicesLoading) {
      const currentDeviceExists = devices.some(device => device.device_id === currentDeviceId);
      
      if (!currentDeviceExists) {
        const deviceName = `${formatPlatform(currentDeviceInfo.platform)} - ${currentDeviceInfo.hostname}`;
        console.log('Registering current device:', currentDeviceId, deviceName);
        registerDevice(currentDeviceId, deviceName);
      } else {
        // Update last seen for current device only once when app starts
        console.log('Updating last seen for current device on app start');
        updateDeviceLastSeenOnStartup(currentDeviceId);
      }
      
      setHasRegisteredCurrentDevice(true);
    }
  }, [user, currentDeviceId, currentDeviceInfo, devices, isDevicesLoading, hasRegisteredCurrentDevice, registerDevice, updateDeviceLastSeenOnStartup]);

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

  const getDeviceIcon = (deviceName: string) => {
    const lowerName = deviceName.toLowerCase();
    if (lowerName.includes('windows') || lowerName.includes('mac') || lowerName.includes('linux')) {
      return <Computer />;
    } else if (lowerName.includes('android') || lowerName.includes('ios') || lowerName.includes('iphone')) {
      return <Smartphone />;
    } else if (lowerName.includes('tablet') || lowerName.includes('ipad')) {
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

  const handleRemoveDevice = async (deviceId: string) => {
    if (deviceId === currentDeviceId) {
      toast.error('Cannot remove current device');
      return;
    }
    
    if (window.confirm(intl.formatMessage({ id: 'settings.confirmRemoveDevice' }))) {
      await removeDevice(deviceId);
    }
  };

  const handleRefreshDevices = () => {
    fetchDevices();
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

      {user && (
        <SettingsSection title={<FormattedMessage id="settings.connectedDevices" />} sx={{ mb: 3 }}>
          <Box sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage id="settings.connectedDevicesDescription" />
              </Typography>
              <IconButton 
                onClick={handleRefreshDevices} 
                disabled={isDevicesLoading}
                size="small"
              >
                {isDevicesLoading ? <CircularProgress size={20} /> : <Refresh />}
              </IconButton>
            </Box>

            {devicesError && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {devicesError}
              </Typography>
            )}
            
            <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              {devices.length === 0 && !isDevicesLoading ? (
                <ListItem>
                  <ListItemText
                    primary={<FormattedMessage id="settings.noDevicesFound" />}
                    secondary={<FormattedMessage id="settings.noDevicesFoundDescription" />}
                  />
                </ListItem>
              ) : (
                devices.map((device, index) => {
                  const isCurrentDevice = device.device_id === currentDeviceId;
                  return (
                    <ListItem 
                      key={device.device_id} 
                      divider={index < devices.length - 1}
                      secondaryAction={
                        !isCurrentDevice && (
                          <IconButton 
                            edge="end" 
                            aria-label="delete"
                            onClick={() => handleRemoveDevice(device.device_id)}
                            size="small"
                          >
                            <Delete />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemIcon>
                        {getDeviceIcon(device.device_name || 'computer')}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {device.device_name || 'Unknown Device'}
                            </Typography>
                            {isCurrentDevice && (
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
                            <Typography variant="caption" color="text.secondary">
                              <FormattedMessage 
                                id="settings.deviceId" 
                                values={{ id: device.device_id }}
                              />
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              <FormattedMessage 
                                id="settings.lastSeen" 
                                values={{ 
                                  time: new Date(device.last_seen).toLocaleString(locale)
                                }}
                              />
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })
              )}
            </List>
          </Box>
        </SettingsSection>
      )}

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

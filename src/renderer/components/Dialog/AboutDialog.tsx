import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider
} from "@mui/material";
import { useState, useEffect } from "react";
import { useIntl } from "react-intl";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

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

function AboutDialog({ open, onClose }: AboutDialogProps) {
  const intl = useIntl();
  const [version, setVersion] = useState<string>("Loading...");
  const [buildTime, setBuildTime] = useState<string>("");
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [appName, setAppName] = useState<string>("Loading...");
  const [productName, setProductName] = useState<string>("Loading...");
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchAppInfo = async () => {
      try {
        const [appVersion, appBuildTime, appDeviceInfo, appAppName, appProductName] = await Promise.all([
          window.electron.ipcRenderer.invoke('app:get-version'),
          window.electron.ipcRenderer.invoke('app:get-build-time'),
          window.electron.ipcRenderer.invoke('app:get-device-info'),
          window.electron.app.getName(),
          window.electron.app.getProductName()
        ]);

        setVersion(appVersion);
        setDeviceInfo(appDeviceInfo);
        setAppName(appAppName);
        setProductName(appProductName);

        // Format build time nicely
        const buildDate = new Date(appBuildTime);
        setBuildTime(buildDate.toLocaleDateString());
      } catch (error) {
        console.error('Failed to get app info:', error);
        setVersion('Unknown');
        setBuildTime('Unknown');
        setDeviceInfo(null);
        setAppName('Unknown');
        setProductName('Unknown');
      }
    };

    if (open) {
      fetchAppInfo();
    }
  }, [open]);

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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {intl.formatMessage({ id: 'titleBar.help.about' })}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'normal' }}>
            {productName}
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            {intl.formatMessage({ id: 'about.version' })}: {version}{buildTime && ` (${buildTime})`}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Platform: {deviceInfo ? formatPlatform(deviceInfo.platform) : 'Loading...'}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage({ id: 'about.description' })}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {intl.formatMessage({ id: 'common.close' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AboutDialog;

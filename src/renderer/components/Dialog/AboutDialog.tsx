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
  const [deviceId, setDeviceId] = useState<string>("Loading...");
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchAppInfo = async () => {
      try {
        const [appVersion, appBuildTime, appDeviceId, appDeviceInfo] = await Promise.all([
          window.electron.ipcRenderer.invoke('app:get-version'),
          window.electron.ipcRenderer.invoke('app:get-build-time'),
          window.electron.ipcRenderer.invoke('app:get-device-id'),
          window.electron.ipcRenderer.invoke('app:get-device-info')
        ]);

        setVersion(appVersion);
        setDeviceId(appDeviceId);
        setDeviceInfo(appDeviceInfo);

        // Format build time nicely
        const buildDate = new Date(appBuildTime);
        setBuildTime(buildDate.toLocaleDateString());
      } catch (error) {
        console.error('Failed to get app info:', error);
        setVersion('Unknown');
        setBuildTime('Unknown');
        setDeviceId('Unknown');
        setDeviceInfo(null);
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
            {intl.formatMessage({ id: 'titleBar.appName' })}
          </Typography>

          <Typography variant="body1" sx={{ mb: 1 }}>
            {intl.formatMessage({ id: 'about.version' })}: {version}{buildTime && ` (${buildTime})`}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Device ID: {deviceId} ({deviceInfo ? formatPlatform(deviceInfo.platform) : 'Loading...'})
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

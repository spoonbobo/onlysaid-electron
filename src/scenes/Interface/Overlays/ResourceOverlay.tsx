import { Box, Typography, IconButton } from "@mui/material";
import { useDebugStore } from "../../../stores/Debug/DebugStore";
import { useEffect, useState } from "react";

export default function ResourceOverlay() {
  const { resourceOverlayMinimized, setResourceOverlayMinimized } = useDebugStore();
  const [cpuUsage, setCpuUsage] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number;
    total: number;
    rss?: number;
  }>({ used: 0, total: 0 });
  const [storageUsage, setStorageUsage] = useState<{
    appStorage: number;
    free: number;
    total: number;
  }>({ appStorage: 0, free: 0, total: 0 });

  useEffect(() => {
    const updateResourceUsage = async () => {
      if (!resourceOverlayMinimized && window.electron) {
        try {
          const cpu = await window.electron.ipcRenderer.invoke('system:get-cpu-usage');
          const memory = await window.electron.ipcRenderer.invoke('system:get-memory-usage');
          const storage = await window.electron.ipcRenderer.invoke('system:get-storage-usage');

          setCpuUsage(cpu);
          setMemoryUsage(memory);
          setStorageUsage(storage);
        } catch (err) {
          console.error('Failed to fetch resource usage:', err);
        }
      }
    };

    updateResourceUsage();
    const interval = setInterval(updateResourceUsage, 2000);
    return () => clearInterval(interval);
  }, [resourceOverlayMinimized]);

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <Box sx={{
      width: '100%',
      bgcolor: 'background.paper',
      borderRadius: 1,
      overflow: 'hidden',
      border: '1px solid rgba(0, 0, 0, 0.08)'
    }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1,
        bgcolor: 'primary.light',
        color: 'primary.contrastText'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          System Resources
        </Typography>
        <IconButton
          size="small"
          onClick={() => setResourceOverlayMinimized(!resourceOverlayMinimized)}
          sx={{ color: 'inherit', p: 0.2, height: 20, width: 20 }}
        >
          {resourceOverlayMinimized ? "+" : "-"}
        </IconButton>
      </Box>

      {!resourceOverlayMinimized && (
        <Box sx={{ p: 1 }}>
          <InfoRow label="CPU Usage (App)" value={`${cpuUsage.toFixed(1)}%`} />
          <InfoRow label="Memory Used (App)" value={`${formatMemory(memoryUsage.used)} / ${formatMemory(memoryUsage.total)}`} />
          <InfoRow label="RSS Memory" value={`${formatMemory(memoryUsage.rss || 0)}`} />
          <InfoRow label="App Storage" value={`${formatSize(storageUsage.appStorage)}`} />
          <InfoRow label="Disk Space" value={`${formatSize(storageUsage.free)} free of ${formatSize(storageUsage.total)}`} />
        </Box>
      )}
    </Box>
  );
}

function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
        {label}:
      </Typography>
      <Typography variant="caption" sx={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </Typography>
    </Box>
  );
}

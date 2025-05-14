import { Box, Typography, IconButton } from "@mui/material";
import { useDebugStore } from "@/stores/Debug/DebugStore";
import { useSocketStore } from "@/stores/Socket/SocketStore";

export default function SocketOverlay() {
  const { socketOverlayMinimized, setSocketOverlayMinimized } = useDebugStore();
  const { isConnected, isInitialized } = useSocketStore();

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
        bgcolor: 'info.light',
        color: 'primary.contrastText'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          Socket Info
        </Typography>
        <IconButton
          size="small"
          onClick={() => setSocketOverlayMinimized(!socketOverlayMinimized)}
          sx={{ color: 'inherit', p: 0.2, height: 20, width: 20 }}
        >
          {socketOverlayMinimized ? "+" : "-"}
        </IconButton>
      </Box>

      {!socketOverlayMinimized && (
        <Box sx={{ p: 1 }}>
          <InfoRow
            label="Connected"
            value={isConnected ? "Yes" : "No"}
          />
          <InfoRow
            label="Initialized"
            value={isInitialized ? "Yes" : "No"}
          />
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
      <Typography variant="caption" sx={{
        maxWidth: '150px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        userSelect: 'text'
      }}>
        {value}
      </Typography>
    </Box>
  );
}

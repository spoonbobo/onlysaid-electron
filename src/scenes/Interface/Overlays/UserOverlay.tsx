import { Box, Typography, IconButton } from "@mui/material";
import { useUserStore } from "../../../stores/User/UserStore";
import { useDebugStore } from "../../../stores/Debug/DebugStore"; // We'll add the relevant state here later
import { InfoRow } from "./DebugOverlay"; // Assuming InfoRow can be reused or adapted

export default function UserOverlay() {
  const { user, isLoading, error } = useUserStore();
  const userOverlayMinimized = useDebugStore(state => state.userOverlayMinimized);
  const setUserOverlayMinimized = useDebugStore(state => state.setUserOverlayMinimized);


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
        bgcolor: 'secondary.light', // Changed color for distinction
        color: 'secondary.contrastText'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          User Info
        </Typography>
        <IconButton
          size="small"
          onClick={() => setUserOverlayMinimized(!userOverlayMinimized)}
          sx={{ color: 'inherit', p: 0.2, height: 20, width: 20 }}
        >
          {userOverlayMinimized ? "+" : "-"}
        </IconButton>
      </Box>

      {!userOverlayMinimized && (
        <Box sx={{ p: 1 }}>
          <InfoRow label="User ID" value={user?.id?.toString() || 'N/A'} />
          <InfoRow label="Username" value={user?.username || 'N/A'} />
          <InfoRow label="Email" value={user?.email || 'N/A'} />
          <InfoRow label="Agent ID" value={user?.agent_id?.toString() || 'N/A'} />
          <InfoRow label="Is Loading" value={isLoading ? 'Yes' : 'No'} />
          <InfoRow label="Error" value={error || 'None'} />
        </Box>
      )}
    </Box>
  );
}

// If InfoRow is not exported from DebugOverlay or needs modification, define it here.
// For now, assuming it's exported and can be reused.
// function InfoRow({ label, value }: { label: string, value: string }) { ... }

import { Box, Typography, CircularProgress, Paper, SxProps, Theme, Chip } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";

// Placeholder for the actual status structure.
// You might want to replace this with a more specific type
// once you know the exact shape of the statusResult from getKBStatus.
export interface IKBStatus {
  // Example fields - adjust based on actual data
  lastChecked?: string;
  status?: string;
  message?: string | null;
  syncState?: 'syncing' | 'synced' | 'error' | 'pending';
  documentCount?: number;
  errorDetails?: string;
  [key: string]: any; // Allow other properties
}

interface KBExplorerProps {
  kbStatus: IKBStatus | null;
  isLoading: boolean;
  sx?: SxProps<Theme>;
}

const KBExplorer: React.FC<KBExplorerProps> = ({ kbStatus, isLoading, sx }) => {
  const intl = useIntl();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, flexGrow: 1 }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography variant="body2">
          <FormattedMessage id="kbExplorer.loadingStatus" defaultMessage="Loading status..." />
        </Typography>
      </Box>
    );
  }

  // Content previously here is now removed or handled elsewhere.
  // The main status display is moved to KBInfo.
  // This component can be left to render an empty container or a minimal placeholder if needed.

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        backgroundColor: 'transparent',
        ...(sx || {}),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1, // Ensure it still takes up space if needed by layout
      }}
    >
      {/* Intentionally left empty as per requirements. Status is shown in KBInfo. */}
    </Paper>
  );
};

export default KBExplorer;

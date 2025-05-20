import { Box, Typography, CircularProgress, Paper, SxProps, Theme, Chip } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";

// Placeholder for the actual status structure.
// You might want to replace this with a more specific type
// once you know the exact shape of the statusResult from getKBStatus.
export interface IKBStatus {
  // Example fields - adjust based on actual data
  lastChecked?: string;
  Status?: string;
  Message?: string | null;
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

  if (!kbStatus) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage id="kbExplorer.noStatusAvailable" defaultMessage="Status details will appear here once available." />
        </Typography>
      </Box>
    );
  }

  const getStatusChip = (status?: string) => {
    if (!status) return null;
    let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
    switch (status) {
      case 'syncing': color = 'info'; break;
      case 'synced': color = 'success'; break;
      case 'error': color = 'error'; break;
      case 'pending': color = 'warning'; break;
    }
    return <Chip label={status.toUpperCase()} color={color} size="small" />;
  };


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
      }}
    >
      {/* Content omitted as requested */}
    </Paper>
  );
};

export default KBExplorer;

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import { memo } from "react";
import { IChatMessageToolCall } from "@/../../types/Chat/Message";
import MarkdownRenderer from "@/renderer/components/Chat/MarkdownRenderer";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface ToolResultDialogProps {
  open: boolean;
  onClose: () => void;
  toolCall: IChatMessageToolCall | null;
  executionTime?: number;
}

const ToolResultDialog = memo(
  ({ open, onClose, toolCall, executionTime }: ToolResultDialogProps) => {
    if (!toolCall) return null;

    const formatTime = (seconds?: number): string => {
      if (!seconds) return "Unknown";
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'executed': return 'success';
        case 'error': return 'error';
        default: return 'default';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'executed': return <CheckCircleIcon sx={{ fontSize: '1rem' }} />;
        case 'error': return <ErrorIcon sx={{ fontSize: '1rem' }} />;
        default: return null;
      }
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              {toolCall.function.name}
            </Typography>
            {getStatusIcon(toolCall.status || 'pending') && (
              <Chip
                icon={getStatusIcon(toolCall.status || 'pending')!}
                label={toolCall.status || 'pending'}
                color={getStatusColor(toolCall.status || 'pending') as any}
                size="small"
              />
            )}
            {executionTime && (
              <Chip
                icon={<AccessTimeIcon sx={{ fontSize: '0.875rem' }} />}
                label={formatTime(executionTime)}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Arguments
            </Typography>
            <MarkdownRenderer
              content={`\`\`\`json\n${JSON.stringify(toolCall.function.arguments, null, 2)}\n\`\`\``}
            />
          </Box>

          {toolCall.result && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Result
              </Typography>
              <MarkdownRenderer
                content={`\`\`\`json\n${JSON.stringify(toolCall.result, null, 2)}\n\`\`\``}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }
);

export default ToolResultDialog;

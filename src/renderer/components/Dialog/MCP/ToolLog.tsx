import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { memo } from "react";
import { IToolLog } from "@/renderer/stores/LLM/LLMStore"; // Import IToolLog

interface ToolLogDialogProps {
  open: boolean;
  onClose: () => void;
  logContent: IToolLog[]; // Updated to accept an array of IToolLog
  toolName?: string;
}

const ToolLogDialog = memo(
  ({ open, onClose, logContent, toolName }: ToolLogDialogProps) => {
    const formatTimestamp = (isoString: string) => {
      if (!isoString) return "Invalid date";
      try {
        const date = new Date(isoString);
        return date.toLocaleString([], {
          year: 'numeric', month: 'numeric', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
      } catch (e) {
        return "Invalid date";
      }
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          Logs for {toolName || "Tool Call"}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {logContent && logContent.length > 0 ? (
            <Box sx={{ maxHeight: "70vh", overflowY: "auto" }}>
              <List disablePadding>
                {logContent.map((log, index) => (
                  <>
                    <ListItem key={log.id || index} sx={{ alignItems: 'flex-start', py: 1.5, px: 2 }}>
                      <ListItemText
                        primary={
                          <Typography
                            component="pre"
                            variant="body2"
                            sx={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                              fontSize: '0.875rem',
                              lineHeight: 1.6
                            }}
                          >
                            {log.content}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                            {formatTimestamp(log.created_at)}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < logContent.length - 1 && <Divider component="li" />}
                  </>
                ))}
              </List>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="textSecondary">No logs available.</Typography>
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

export default ToolLogDialog;

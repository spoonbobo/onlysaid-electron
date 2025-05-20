import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FormattedMessage } from "react-intl";
import { useFileExplorerStore, selectors } from "@/stores/File/FileExplorerStore"; // Import store and selector

interface FileClickDialogProps {
  open: boolean;
  onClose: () => void;
  nodeId: string; // Changed from filePath
}

export default function FileClickDialog({
  open,
  onClose,
  nodeId
}: FileClickDialogProps) {
  // Fetch node details from the store
  const node = useFileExplorerStore(selectors.selectNodeById(nodeId));

  const nodeDisplayName = node?.label || node?.name || "Unknown Item";
  const nodePath = node?.path || "N/A";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            <FormattedMessage id="dialog.item.click.title" defaultMessage="Item Selected" />
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mt={1}>
          <Typography variant="body1" gutterBottom>
            <FormattedMessage
              id="dialog.item.click.info"
              defaultMessage="You selected: {item}"
              values={{
                item: <Box component="span" fontWeight="bold">{nodeDisplayName}</Box>
              }}
            />
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Path: {nodePath}
          </Typography>
          {node && node.source === 'remote' && node.workspaceId && (
            <Typography variant="caption" display="block">
              Workspace ID: {node.workspaceId} ({node.source})
            </Typography>
          )}
          {node && node.source === 'local' && (
            <Typography variant="caption" display="block">
              Source: {node.source}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          <FormattedMessage id="common.close" defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
}
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
import { useFileExplorerStore, selectors } from "@/stores/File/FileExplorerStore";

interface FileDropDialogProps {
  open: boolean;
  onClose: () => void;
  sourceNodeId: string | null;
  targetNodeId: string;
}

export interface FileClickDialogProps {
  open: boolean;
  onClose: () => void;
  nodeId: string;
}

export default function FileDropDialog({
  open,
  onClose,
  sourceNodeId,
  targetNodeId
}: FileDropDialogProps) {
  const sourceNode = useFileExplorerStore(selectors.selectNodeById(sourceNodeId));
  const targetNode = useFileExplorerStore(selectors.selectNodeById(targetNodeId));

  const sourceName = sourceNode?.label || sourceNode?.name || "Unknown Source";
  const targetName = targetNode?.label || targetNode?.name || "Unknown Target";

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
            <FormattedMessage id="dialog.file.drop.title" defaultMessage="Item Dropped" />
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
              id="dialog.file.drop.info"
              defaultMessage="Item {source} was dropped onto {target}"
              values={{
                source: <Box component="span" fontWeight="bold">{sourceName}</Box>,
                target: <Box component="span" fontWeight="bold">{targetName}</Box>
              }}
            />
          </Typography>
          {sourceNode && <Typography variant="caption">Source path: {sourceNode.path}</Typography>}
          <br />
          {targetNode && <Typography variant="caption">Target path: {targetNode.path}</Typography>}
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

export function FileClickDialog(props: FileClickDialogProps) {
  console.warn("FileClickDialog should be imported from its own module.");
  return null;
}

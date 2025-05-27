import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress
} from "@mui/material";
import { useIntl } from "react-intl";
import { useState } from "react";
import { IWorkspaceUser } from "@/../../types/Workspace/Workspace";

interface RemoveUserDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: IWorkspaceUser | null;
  workspaceName: string;
}

function RemoveUserDialog({ open, onClose, onConfirm, user, workspaceName }: RemoveUserDialogProps) {
  const intl = useIntl();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    if (!user) return;

    setIsRemoving(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error removing user from workspace:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {intl.formatMessage({ id: 'workspace.removeUser.title', defaultMessage: 'Remove Member' })}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">
            {intl.formatMessage(
              {
                id: 'workspace.removeUser.confirmation',
                defaultMessage: 'Are you sure you want to remove {username} from workspace "{workspaceName}"?'
              },
              {
                username: user?.username || intl.formatMessage({ id: 'user.unknown', defaultMessage: 'Unknown' }),
                workspaceName
              }
            )}
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
            {intl.formatMessage(
              {
                id: 'workspace.removeUser.warning',
                defaultMessage: 'This user will no longer have access to the workspace. You can invite them back later if needed.'
              }
            )}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isRemoving}>
          {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button
          onClick={handleRemove}
          variant="contained"
          color="error"
          disabled={isRemoving}
          startIcon={isRemoving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isRemoving
            ? intl.formatMessage({ id: 'common.removing', defaultMessage: 'Removing...' })
            : intl.formatMessage({ id: 'common.remove', defaultMessage: 'Remove' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RemoveUserDialog;

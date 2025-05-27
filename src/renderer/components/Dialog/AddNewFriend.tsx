import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography
} from "@mui/material";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { useIntl } from "react-intl";

interface AddNewFriendDialogProps {
  open: boolean;
  onClose: () => void;
}

function AddNewFriend({ open, onClose }: AddNewFriendDialogProps) {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const intl = useIntl();
  const handleSendRequest = () => {
    // Validate
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    // TODO: Send friend request logic
    console.log("Friend request sent to:", username, "with message:", message);

    // Close the dialog
    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setUsername("");
    setMessage("");
    setError("");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <FormattedMessage id="menu.home.addNewFriend" />
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label={<FormattedMessage id="menu.home.username" />}
            fullWidth
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
            }}
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
          />
          <TextField
            label={<FormattedMessage id="menu.home.message" />}
            fullWidth
            multiline
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            sx={{ mb: 2 }}
            placeholder={intl.formatMessage({ id: "menu.home.messagePlaceholder" })}
          />
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage id="menu.home.messageDescription" />
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>
          <FormattedMessage id="common.cancel" />
        </Button>
        <Button onClick={handleSendRequest} variant="contained" color="primary">
          <FormattedMessage id="common.send" />
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddNewFriend;

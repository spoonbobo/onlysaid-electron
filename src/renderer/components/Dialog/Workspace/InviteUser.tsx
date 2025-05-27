import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectChangeEvent,
  Typography
} from "@mui/material";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { useIntl } from "react-intl";
import { IWorkspace } from "@/../../types/Workspace/Workspace";

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => void;
  workspace?: IWorkspace;
}

function InviteUserDialog({ open, onClose, onInvite, workspace }: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("member");
  const [error, setError] = useState("");
  const intl = useIntl();

  const handleInviteUser = () => {
    // Validate
    if (!email.trim()) {
      setError(intl.formatMessage({ id: "common.error.requiredField" }));
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(intl.formatMessage({ id: "common.error.invalidEmail" }));
      return;
    }

    // Invoke the callback with email and role
    onInvite(email, role);

    // Close the dialog
    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setEmail("");
    setRole("member");
    setError("");
  };

  const handleRoleChange = (event: SelectChangeEvent) => {
    setRole(event.target.value);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <FormattedMessage id="menu.workspace.inviteUser" />
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {workspace && (
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
              <FormattedMessage
                id="menu.workspace.inviteUserTo"
                values={{ name: workspace.name }}
              />
            </Typography>
          )}

          <TextField
            autoFocus
            label={<FormattedMessage id="menu.workspace.userEmail" />}
            fullWidth
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="user-role-select-label">
              <FormattedMessage id="menu.workspace.userRole" />
            </InputLabel>
            <Select
              labelId="user-role-select-label"
              value={role}
              label={<FormattedMessage id="menu.workspace.userRole" />}
              onChange={handleRoleChange}
            >
              <MenuItem value="member">
                <FormattedMessage id="menu.workspace.role.member" />
              </MenuItem>
              <MenuItem value="admin">
                <FormattedMessage id="menu.workspace.role.admin" />
              </MenuItem>
              <MenuItem value="super_admin">
                <FormattedMessage id="menu.workspace.role.superAdmin" />
              </MenuItem>
            </Select>
            <FormHelperText>
              <FormattedMessage id="menu.workspace.roleDescription" />
            </FormHelperText>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>
          <FormattedMessage id="common.cancel" />
        </Button>
        <Button onClick={handleInviteUser} variant="contained" color="primary">
          <FormattedMessage id="common.invite" />
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default InviteUserDialog;
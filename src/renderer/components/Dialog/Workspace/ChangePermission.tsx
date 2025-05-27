import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  SelectChangeEvent
} from "@mui/material";
import { useIntl } from "react-intl";
import { useState, useEffect } from "react";
import { IWorkspaceUser } from "@/../../types/Workspace/Workspace";

interface ChangePermissionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newRole: "super_admin" | "admin" | "member") => Promise<void>;
  user: IWorkspaceUser | null;
  workspaceName: string;
  currentUserRole: string;
}

function ChangePermissionDialog({
  open,
  onClose,
  onConfirm,
  user,
  workspaceName,
  currentUserRole
}: ChangePermissionDialogProps) {
  const intl = useIntl();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const handleRoleChange = (event: SelectChangeEvent) => {
    setSelectedRole(event.target.value);
  };

  const handleChange = async () => {
    if (!user || !selectedRole) return;

    setIsUpdating(true);
    try {
      await onConfirm(selectedRole as "super_admin" | "admin" | "member");
      onClose();
    } catch (error) {
      console.error("Error changing user permission:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      setSelectedRole(user.role);
    }
  }, [open, user]);

  const roleHierarchy: { [key: string]: number } = {
    super_admin: 3,
    admin: 2,
    member: 1,
  };

  const roleOptions = [
    { value: 'member', label: intl.formatMessage({ id: 'workspace.roles.member', defaultMessage: 'Member' }) },
    { value: 'admin', label: intl.formatMessage({ id: 'workspace.roles.admin', defaultMessage: 'Admin' }) }
  ];

  // Super admin can assign other super admins
  if (currentUserRole === 'super_admin') {
    roleOptions.push({
      value: 'super_admin',
      label: intl.formatMessage({ id: 'workspace.roles.superAdmin', defaultMessage: 'Super Admin' })
    });
  }

  // Sort the role options based on hierarchy
  roleOptions.sort((a, b) => roleHierarchy[b.value as keyof typeof roleHierarchy] - roleHierarchy[a.value as keyof typeof roleHierarchy]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {intl.formatMessage({ id: 'workspace.changePermission.title', defaultMessage: 'Change Permission' })}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">
            {intl.formatMessage(
              {
                id: 'workspace.changePermission.explanation',
                defaultMessage: 'Change permission level for {username} in "{workspaceName}"'
              },
              {
                username: user?.username || intl.formatMessage({ id: 'user.unknown', defaultMessage: 'Unknown' }),
                workspaceName
              }
            )}
          </Typography>

          <FormControl fullWidth sx={{ mt: 3 }}>
            <InputLabel>
              {intl.formatMessage({ id: 'workspace.changePermission.role', defaultMessage: 'Role' })}
            </InputLabel>
            <Select
              value={selectedRole}
              onChange={handleRoleChange}
              label={intl.formatMessage({ id: 'workspace.changePermission.role', defaultMessage: 'Role' })}
            >
              {roleOptions.map(role => (
                <MenuItem
                  key={role.value}
                  value={role.value}
                  disabled={
                    // Disable option if it's higher than current user's role
                    roleHierarchy[role.value as keyof typeof roleHierarchy] > roleHierarchy[currentUserRole as keyof typeof roleHierarchy]
                  }
                >
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {intl.formatMessage(
              {
                id: 'workspace.changePermission.info',
                defaultMessage: 'Changing a user\'s role will affect their permissions in this workspace.'
              }
            )}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isUpdating}>
          {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button
          onClick={handleChange}
          variant="contained"
          color="primary"
          disabled={isUpdating || !selectedRole || selectedRole === user?.role}
          startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isUpdating
            ? intl.formatMessage({ id: 'common.updating', defaultMessage: 'Updating...' })
            : intl.formatMessage({ id: 'common.change', defaultMessage: 'Change' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ChangePermissionDialog;

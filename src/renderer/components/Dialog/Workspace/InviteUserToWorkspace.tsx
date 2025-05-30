import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  TextField,
  Avatar,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Chip
} from "@mui/material";
import { useState, useMemo, useCallback, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

import { IWorkspace } from "@/../../types/Workspace/Workspace";
import { IUser } from "@/../../types/User/User";
import { getUserTokenFromStore } from "@/utils/user";

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
  onInvite: (users: Array<{ email: string; role: string; user: IUser }>) => void;
  workspace?: IWorkspace;
}

interface SelectedUser {
  user: IUser;
  role: string;
}

function InviteUserDialog({ open, onClose, onInvite, workspace }: InviteUserDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const intl = useIntl();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return async (query: string) => {
        if (timeoutId) clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {
          if (!query.trim() || query.length < 2) {
            setSearchResults([]);
            return;
          }

          setLoading(true);
          try {
            const token = getUserTokenFromStore();
            if (!token) {
              throw new Error('No authentication token available');
            }

            const response = await window.electron.user.search({
              token,
              email: query,
              limit: 10
            });

            if (response.error) {
              throw new Error(response.error);
            }

            // Filter out already selected users
            const selectedUserIds = selectedUsers.map(su => su.user.id);
            const filteredResults = response.data?.data?.filter(
              (user: IUser) => !selectedUserIds.includes(user.id)
            ) || [];

            setSearchResults(filteredResults);
          } catch (err: any) {
            console.error('Error searching users:', err);
            setError(err.message || 'Error searching users');
            setSearchResults([]);
          } finally {
            setLoading(false);
          }
        }, 300);
      };
    },
    [selectedUsers]
  );

  // Handle search input change
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    setError("");
    debouncedSearch(query);
  }, [debouncedSearch]);

  // Handle user selection from search results
  const handleUserSelect = (user: IUser) => {
    if (!selectedUsers.find(su => su.user.id === user.id)) {
      setSelectedUsers(prev => [...prev, { user, role: "member" }]);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  // Handle removing selected user
  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(su => su.user.id !== userId));
  };

  // Handle role change for selected user
  const handleRoleChange = (userId: string, newRole: string) => {
    setSelectedUsers(prev =>
      prev.map(su =>
        su.user.id === userId ? { ...su, role: newRole } : su
      )
    );
  };

  const handleInviteUsers = () => {
    if (selectedUsers.length === 0) {
      setError(intl.formatMessage({ id: "menu.workspace.selectUsers", defaultMessage: "Please select at least one user to invite" }));
      return;
    }

    // Prepare invitation data
    const invitations = selectedUsers.map(su => ({
      email: su.user.email,
      role: su.role,
      user: su.user
    }));

    onInvite(invitations);
    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleCopyInviteCode = async () => {
    if (workspace?.invite_code) {
      try {
        await navigator.clipboard.writeText(workspace.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy invite code:', err);
      }
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUsers([]);
    setError("");
    setCopied(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddIcon />
          <FormattedMessage id="menu.workspace.inviteUser" defaultMessage="Invite Users" />
          {selectedUsers.length > 0 && (
            <Chip
              label={`${selectedUsers.length} selected`}
              size="small"
              color="primary"
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {workspace && (
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
              <FormattedMessage
                id="menu.workspace.inviteUserTo"
                defaultMessage="Invite users to {name}"
                values={{ name: workspace.name }}
              />
            </Typography>
          )}

          {/* User Search Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              <FormattedMessage id="menu.workspace.searchUsers" defaultMessage="Search Users" />
            </Typography>

            <TextField
              fullWidth
              value={searchQuery}
              onChange={handleSearchChange}
              error={!!error && selectedUsers.length === 0}
              helperText={error && selectedUsers.length === 0 ? error : ""}
              InputProps={{
                endAdornment: loading && <CircularProgress size={20} />
              }}
              placeholder={intl.formatMessage({
                id: "menu.workspace.searchUsersPlaceholder",
                defaultMessage: "Type email to search users..."
              })}
            />

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Box sx={{
                mt: 1,
                maxHeight: 200,
                overflowY: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1
              }}>
                {searchResults.map((user) => (
                  <Box
                    key={user.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1.5,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      borderBottom: 1,
                      borderBottomColor: 'divider',
                      '&:last-child': { borderBottom: 'none' }
                    }}
                    onClick={() => handleUserSelect(user)}
                  >
                    <Avatar src={user.avatar || undefined} sx={{ width: 36, height: 36, mr: 2 }}>
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {user.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                    <PersonAddIcon fontSize="small" color="action" />
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Selected Users Section */}
          {selectedUsers.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  <FormattedMessage
                    id="menu.workspace.selectedUsers"
                    defaultMessage="Selected Users ({count})"
                    values={{ count: selectedUsers.length }}
                  />
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedUsers.map((selectedUser, index) => (
                    <Box
                      key={selectedUser.user.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <Typography variant="body2" sx={{ mr: 2, minWidth: 20, color: 'text.secondary' }}>
                          {index + 1}.
                        </Typography>
                        <Avatar src={selectedUser.user.avatar || undefined} sx={{ width: 32, height: 32, mr: 2 }}>
                          {selectedUser.user.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {selectedUser.user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {selectedUser.user.email}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <InputLabel id={`role-select-${selectedUser.user.id}`}>
                            <FormattedMessage id="menu.workspace.userRole" defaultMessage="Role" />
                          </InputLabel>
                          <Select
                            labelId={`role-select-${selectedUser.user.id}`}
                            value={selectedUser.role}
                            label={<FormattedMessage id="menu.workspace.userRole" />}
                            onChange={(e) => handleRoleChange(selectedUser.user.id!, e.target.value)}
                          >
                            <MenuItem value="member">
                              <FormattedMessage id="menu.workspace.role.member" defaultMessage="Member" />
                            </MenuItem>
                            <MenuItem value="admin">
                              <FormattedMessage id="menu.workspace.role.admin" defaultMessage="Admin" />
                            </MenuItem>
                            <MenuItem value="super_admin">
                              <FormattedMessage id="menu.workspace.role.superAdmin" defaultMessage="Super Admin" />
                            </MenuItem>
                          </Select>
                        </FormControl>

                        <Tooltip title={<FormattedMessage id="common.remove" defaultMessage="Remove" />}>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveUser(selectedUser.user.id!)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {/* Simplified Invite Code Display */}
        {workspace?.invite_code && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <FormattedMessage
                id="menu.workspace.inviteCode"
                defaultMessage="Invite Code:"
              />
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main' }}
            >
              {workspace.invite_code}
            </Typography>
            <IconButton
              size="small"
              onClick={handleCopyInviteCode}
              sx={{ color: copied ? 'success.main' : 'text.secondary' }}
            >
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Box>
        )}

        <Button onClick={handleCancel}>
          <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
        </Button>
        <Button
          onClick={handleInviteUsers}
          variant="contained"
          color="primary"
          disabled={selectedUsers.length === 0}
          startIcon={<PersonAddIcon />}
        >
          <FormattedMessage
            id="menu.workspace.inviteUsers"
            defaultMessage="Invite {count} User{plural}"
            values={{
              count: selectedUsers.length,
              plural: selectedUsers.length === 1 ? '' : 's'
            }}
          />
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default InviteUserDialog;
import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Pagination, TextField, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, InputAdornment, Avatar, IconButton } from '@mui/material';
import { useWorkspaceStore } from '@/stores/Workspace/WorkspaceStore';
import { IWorkspaceUser } from '@/../../types/Workspace/Workspace';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import { useIntl } from 'react-intl';
import { getUserFromStore } from '@/utils/user';
import RemoveUserDialog from '@/components/Dialog/Workspace/RemoveUser';
import ChangePermissionDialog from '@/components/Dialog/Workspace/ChangePermission';

interface MembersProps {
  workspaceId: string;
}

const Members = ({ workspaceId }: MembersProps) => {
  const intl = useIntl();
  const { getUsersByWorkspace, getUserInWorkspace, removeUserFromWorkspace, isLoading, error, getWorkspace, getWorkspaceById } = useWorkspaceStore();
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [users, setUsers] = useState<IWorkspaceUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Remove dialog state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<IWorkspaceUser | null>(null);

  // Change permission dialog state
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [userToChangePermission, setUserToChangePermission] = useState<IWorkspaceUser | null>(null);

  const [workspaceName, setWorkspaceName] = useState('');

  const handleOpenPermissionDialog = (user: IWorkspaceUser) => {
    setUserToChangePermission(user);
    setPermissionDialogOpen(true);
  };

  const handleClosePermissionDialog = () => {
    setPermissionDialogOpen(false);
    setUserToChangePermission(null);
  };

  const handleConfirmPermissionChange = async (newRole: "super_admin" | "admin" | "member") => {
    if (!userToChangePermission) return Promise.reject('No user selected');

    console.log(`Changing ${userToChangePermission.username}'s role to ${newRole}`);

    // Update the local state to reflect the change
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.user_id === userToChangePermission.user_id
          ? { ...user, role: newRole }
          : user
      )
    );

    return Promise.resolve();
  };

  const handleOpenRemoveDialog = (user: IWorkspaceUser) => {
    setUserToRemove(user);
    setRemoveDialogOpen(true);
  };

  const handleCloseRemoveDialog = () => {
    setRemoveDialogOpen(false);
    setUserToRemove(null);
  };

  const handleConfirmRemove = async () => {
    if (!userToRemove) return Promise.reject('No user selected');
    await removeUserFromWorkspace(workspaceId, userToRemove.user_id);
    setRefreshTrigger(prev => prev + 1);
    return Promise.resolve();
  };

  useEffect(() => {
    const fetchWorkspaceName = async () => {
      try {
        const currentUser = getUserFromStore();
        if (currentUser?.id) {
          await getWorkspace(currentUser.id);
          const workspace = getWorkspaceById(workspaceId);
          setWorkspaceName(workspace?.name || workspaceId);
        }
      } catch (error) {
        console.error("Error fetching workspace:", error);
        // Fallback to using the ID as name
        setWorkspaceName(workspaceId);
      }
    };

    fetchWorkspaceName();
  }, [workspaceId, getWorkspace, getWorkspaceById]);

  useEffect(() => {
    const fetchUsers = async () => {
      const workspaceUsers = await getUsersByWorkspace(workspaceId);
      setUsers(workspaceUsers);
    };

    fetchUsers();
  }, [workspaceId, getUsersByWorkspace, refreshTrigger]);

  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      const currentUser = getUserFromStore();
      if (currentUser?.id) {
        setCurrentUserId(currentUser.id);
        const userInWorkspace = await getUserInWorkspace(workspaceId, currentUser.id);
        if (userInWorkspace) {
          setCurrentUserRole(userInWorkspace.role);
        }
      }
    };

    fetchCurrentUserRole();
  }, [workspaceId, getUserInWorkspace]);

  const roleOptions = [
    { value: 'all', label: intl.formatMessage({ id: 'workspace.roles.all', defaultMessage: 'All Roles' }) },
    { value: 'super_admin', label: intl.formatMessage({ id: 'workspace.roles.superAdmin', defaultMessage: 'Super Admin' }) },
    { value: 'admin', label: intl.formatMessage({ id: 'workspace.roles.admin', defaultMessage: 'Admin' }) },
    { value: 'member', label: intl.formatMessage({ id: 'workspace.roles.member', defaultMessage: 'Member' }) }
  ];

  const roleHierarchy: { [key: string]: number } = {
    super_admin: 3,
    admin: 2,
    member: 1,
  };

  const getUserInitials = (username: string) => {
    return username ? username.substring(0, 2).toUpperCase() : 'U';
  };

  const getRoleTranslation = (role: string) => {
    switch (role) {
      case 'super_admin':
        return intl.formatMessage({ id: 'workspace.roles.superAdmin', defaultMessage: 'Super Admin' });
      case 'admin':
        return intl.formatMessage({ id: 'workspace.roles.admin', defaultMessage: 'Admin' });
      case 'member':
        return intl.formatMessage({ id: 'workspace.roles.member', defaultMessage: 'Member' });
      default:
        return role;
    }
  };

  const filteredUsers = users.filter(user =>
    (selectedRole === 'all' || user.role === selectedRole) &&
    (searchTerm === '' ||
      (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Sort users by current user first, then by role and level
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // Always show current user first
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;

    // Then sort by role hierarchy
    if (roleHierarchy[a.role] !== roleHierarchy[b.role]) {
      return roleHierarchy[b.role] - roleHierarchy[a.role];
    }
    // Then sort by agent level
    return (b.level ?? 0) - (a.level ?? 0);
  });

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  const getCurrentPageItems = () => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedUsers.slice(startIndex, endIndex);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleRoleChange = (event: SelectChangeEvent) => {
    setSelectedRole(event.target.value);
    setPage(1);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {intl.formatMessage({ id: 'menu.workspace.members', defaultMessage: 'Members' })}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>{intl.formatMessage({ id: 'workspace.filterByRole', defaultMessage: 'Filter by Role' })}</InputLabel>
          <Select
            value={selectedRole}
            onChange={handleRoleChange}
            label={intl.formatMessage({ id: 'workspace.filterByRole', defaultMessage: 'Filter by Role' })}
          >
            {roleOptions.map(role => (
              <MenuItem key={role.value} value={role.value}>
                {role.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder={intl.formatMessage({ id: 'workspace.searchByUsername', defaultMessage: 'Search by username' })}
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ width: 200 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }
          }}
        />
      </Box>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="medium" sx={{ minWidth: 750 }}>
              <TableHead>
                <TableRow>
                  <TableCell width="25%">{intl.formatMessage({ id: 'user.name', defaultMessage: 'User' })}</TableCell>
                  <TableCell width="10%">{intl.formatMessage({ id: 'agent.level', defaultMessage: 'Level' })}</TableCell>
                  <TableCell width="18%">{intl.formatMessage({ id: 'workspace.create.joined', defaultMessage: 'Joined' })}</TableCell>
                  <TableCell width="17%">{intl.formatMessage({ id: 'user.lastLogin', defaultMessage: 'Last Login' })}</TableCell>
                  <TableCell width="30%" align="right">{intl.formatMessage({ id: 'menu.workspace.manage', defaultMessage: 'Manage' })}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getCurrentPageItems().length > 0 ? (
                  getCurrentPageItems().map((user) => (
                    <TableRow
                      key={user.user_id}
                      hover
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        ...(user.user_id === currentUserId && { bgcolor: 'action.hover' })
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {user.avatar ? (
                            <Avatar
                              src={user.avatar}
                              sx={{ width: 40, height: 40 }}
                              alt={user.username || ''}
                            />
                          ) : (
                            <Avatar
                              sx={{
                                bgcolor: '#2196F3',
                                width: 40,
                                height: 40
                              }}
                            >
                              {getUserInitials(user.username || '')}
                            </Avatar>
                          )}
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {user.username || intl.formatMessage({ id: 'user.unknown', defaultMessage: 'Unknown' })}
                              {user.user_id === currentUserId && (
                                <Typography component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                                  ({intl.formatMessage({ id: 'user.itsYou', defaultMessage: "It's you" })})
                                </Typography>
                              )}
                            </Typography>
                            <Chip
                              label={getRoleTranslation(user.role)}
                              color="primary"
                              size="small"
                              sx={{ minWidth: 80, mt: 0.5, height: 22 }}
                            />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{user.level ?? 0}</TableCell>
                      <TableCell>{formatDate(user.created_at || '')}</TableCell>
                      <TableCell>{formatDate(user.last_login || '')}</TableCell>
                      <TableCell align="right">
                        {user.user_id === currentUserId ? (
                          <Typography variant="caption" color="text.secondary">
                            {intl.formatMessage({ id: 'user.currentUser', defaultMessage: "It's you" })}
                          </Typography>
                        ) : (roleHierarchy[currentUserRole] > roleHierarchy[user.role]) && (
                          <>
                            <IconButton
                              size="small"
                              sx={{ color: 'text.secondary', ml: 0.5 }}
                              onClick={() => handleOpenPermissionDialog(user)}
                              title={intl.formatMessage({ id: 'actions.changePermission', defaultMessage: 'Change Permission' })}
                            >
                              <AdminPanelSettingsOutlinedIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              sx={{ color: 'text.secondary', ml: 0.5 }}
                              onClick={() => handleOpenRemoveDialog(user)}
                              title={intl.formatMessage({ id: 'actions.kick', defaultMessage: 'Remove Member' })}
                            >
                              <PersonRemoveOutlinedIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>{intl.formatMessage({ id: 'workspace.members.noMembersFound', defaultMessage: 'No members found' })}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}

      <RemoveUserDialog
        open={removeDialogOpen}
        onClose={handleCloseRemoveDialog}
        onConfirm={handleConfirmRemove}
        user={userToRemove}
        workspaceName={workspaceName}
      />

      <ChangePermissionDialog
        open={permissionDialogOpen}
        onClose={handleClosePermissionDialog}
        onConfirm={handleConfirmPermissionChange}
        user={userToChangePermission}
        workspaceName={workspaceName}
        currentUserRole={currentUserRole}
      />
    </Box>
  );
};

export default Members;

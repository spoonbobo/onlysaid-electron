import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Pagination, TextField, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, InputAdornment, Avatar, IconButton, LinearProgress, Tooltip } from '@mui/material';
import { useWorkspaceStore } from '@/renderer/stores/Workspace/WorkspaceStore';
import { useAgentStore } from '@/renderer/stores/Agent/AgentStore';
import { IWorkspaceUser } from '@/../../types/Workspace/Workspace';
import { IUser } from '@/../../types/User/User';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useIntl } from 'react-intl';
import { getUserFromStore, getUserTokenFromStore } from '@/utils/user';
import RemoveUserDialog from '@/renderer/components/Dialog/Workspace/RemoveUser';
import ChangePermissionDialog from '@/renderer/components/Dialog/Workspace/ChangePermission';

interface MembersProps {
  workspaceId: string;
}

interface UserWithAgent extends IWorkspaceUser {
  agent?: IUser | null;
}

const Members = ({ workspaceId }: MembersProps) => {
  const intl = useIntl();
  const {
    getUserInWorkspace,
    removeUserFromWorkspace,
    updateUserRole,
    fetchWorkspaceById,
    getWorkspaceById
  } = useWorkspaceStore();
  const { fetchAgent } = useAgentStore();

  const isLoading = useWorkspaceStore(state => state.isLoading);
  const getUsersByWorkspace = useWorkspaceStore(state => state.getUsersByWorkspace);

  const [localError, setLocalError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [users, setUsers] = useState<UserWithAgent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const token = getUserTokenFromStore();

  const [isComponentLoading, setIsComponentLoading] = useState(true);

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserWithAgent | null>(null);

  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [userToChangePermission, setUserToChangePermission] = useState<UserWithAgent | null>(null);

  const [workspaceName, setWorkspaceName] = useState('');

  const handleOpenPermissionDialog = (user: UserWithAgent) => {
    setUserToChangePermission(user);
    setPermissionDialogOpen(true);
  };

  const handleClosePermissionDialog = () => {
    setPermissionDialogOpen(false);
    setUserToChangePermission(null);
  };

  const handleConfirmPermissionChange = async (newRole: "super_admin" | "admin" | "member") => {
    if (!userToChangePermission || !userToChangePermission.user_id) {
      console.error('No user selected or user_id is missing');
      return Promise.reject('No user selected or user_id is missing');
    }
    try {
      setLocalError(null);
      await updateUserRole(workspaceId, userToChangePermission.user_id, newRole);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.user_id === userToChangePermission.user_id
            ? { ...user, role: newRole }
            : user
        )
      );
    } catch (err: any) {
      console.error("Error changing permission:", err);
      setLocalError(err?.message || "Failed to change user permission");
    } finally {
      handleClosePermissionDialog();
    }
  };

  const handleOpenRemoveDialog = (user: UserWithAgent) => {
    setUserToRemove(user);
    setRemoveDialogOpen(true);
  };

  const handleCloseRemoveDialog = () => {
    setRemoveDialogOpen(false);
    setUserToRemove(null);
  };

  const handleConfirmRemove = async () => {
    if (!userToRemove) return Promise.reject('No user selected');
    try {
      setLocalError(null);
      await removeUserFromWorkspace(workspaceId, userToRemove.user_id);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Error removing user:", err);
      setLocalError(err?.message || "Failed to remove user");
    } finally {
      handleCloseRemoveDialog();
    }
  };

  useEffect(() => {
    const fetchWorkspaceDetails = async () => {
      if (!workspaceId) {
        setWorkspaceName('');
        return;
      }
      try {
        setLocalError(null);
        let ws = getWorkspaceById(workspaceId);
        if (!ws) {
          const fetchedWs = await fetchWorkspaceById(workspaceId);
          ws = fetchedWs || undefined;
        }

        if (ws) {
          setWorkspaceName(ws.name || workspaceId);
        } else {
          console.warn(`Workspace with ID ${workspaceId} not found in store or via fetch.`);
          setWorkspaceName(workspaceId);
        }
      } catch (fetchError: any) {
        console.error("Error fetching workspace name:", fetchError);
        setLocalError(fetchError?.message || "Failed to fetch workspace details");
        setWorkspaceName(workspaceId);
      }
    };
    fetchWorkspaceDetails();
  }, [workspaceId, fetchWorkspaceById, getWorkspaceById]);


  useEffect(() => {
    const loadMemberData = async () => {
      setIsComponentLoading(true);
      setLocalError(null);
      if (!token || !workspaceId) {
        setUsers([]);
        setIsComponentLoading(false);
        return;
      }

      try {
        const currentUser = getUserFromStore();
        if (currentUser?.id) {
          setCurrentUserId(currentUser.id);
          const userInWorkspace = await getUserInWorkspace(workspaceId, currentUser.id);
          setCurrentUserRole(userInWorkspace ? userInWorkspace.role : 'member');
        } else {
          setCurrentUserId('');
          setCurrentUserRole('member');
        }

        const workspaceUsers = await getUsersByWorkspace(workspaceId);

        const agentsMap = new Map<string, IUser>();

        const agentPromises = workspaceUsers
          .filter(user => user.agent_id && typeof user.agent_id === 'string')
          .map(async (user) => {
            try {
              const response = await window.electron.user.get({
                token,
                args: { ids: [user.agent_id!] }
              });

              if (!response.error && response.data?.data) {
                const agentData = Array.isArray(response.data.data)
                  ? response.data.data[0] as IUser
                  : response.data.data as IUser;

                if (agentData) {
                  agentsMap.set(user.agent_id!, agentData);
                }
              }
            } catch (error) {
              console.error(`Error fetching agent ${user.agent_id}:`, error);
            }
          });

        await Promise.all(agentPromises);

        const usersWithAgents = workspaceUsers.map(wsUser => ({
          ...wsUser,
          agent: wsUser.agent_id ? agentsMap.get(wsUser.agent_id) || null : null
        }));

        setUsers(usersWithAgents);

      } catch (e: any) {
        console.error("Error loading member data:", e);
        setLocalError(e?.message || "Failed to load member data");
        setUsers([]);
      } finally {
        setIsComponentLoading(false);
      }
    };

    loadMemberData();
  }, [workspaceId, refreshTrigger, token, getUsersByWorkspace, getUserInWorkspace]);

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

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;

    if (roleHierarchy[a.role] !== roleHierarchy[b.role]) {
      return roleHierarchy[b.role] - roleHierarchy[a.role];
    }

    const aLevel = a.agent?.level ?? a.level ?? 0;
    const bLevel = b.agent?.level ?? b.level ?? 0;
    return bLevel - aLevel;
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

  const calculateXpProgress = (user: UserWithAgent) => {
    if (!user.agent || typeof user.agent.level !== 'number' || typeof user.agent.xp !== 'number') {
      return 0;
    }

    const currentLevel = user.agent.level;
    const currentXp = user.agent.xp;
    const nextLevelXp = 50 * (currentLevel + 1);

    if (nextLevelXp === 0) return 0;

    return (currentXp / nextLevelXp) * 100;
  };

  if (localError) {
    return <Typography color="error">{localError}</Typography>;
  }

  return (
    <Box>
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
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {(isComponentLoading || isLoading) ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="medium" sx={{ minWidth: 750 }}>
              <TableHead>
                <TableRow>
                  <TableCell width="22%">{intl.formatMessage({ id: 'user.name', defaultMessage: 'User' })}</TableCell>
                  <TableCell width="33%">{intl.formatMessage({ id: 'agent.info', defaultMessage: 'Agent Info' })}</TableCell>
                  <TableCell width="15%">{intl.formatMessage({ id: 'workspace.create.joined', defaultMessage: 'Joined' })}</TableCell>
                  <TableCell width="15%">{intl.formatMessage({ id: 'user.lastLogin', defaultMessage: 'Last Login' })}</TableCell>
                  <TableCell width="15%" align="right">{intl.formatMessage({ id: 'menu.workspace.manage', defaultMessage: 'Manage' })}</TableCell>
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
                              alt=""
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
                      <TableCell>
                        {user.agent ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              src={user.agent.avatar || ''}
                              sx={{
                                width: 40,
                                height: 40
                              }}
                            />
                            <Box sx={{ flexGrow: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <EmojiEventsIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                                <Typography variant="body2" fontWeight="medium">
                                  {`Level ${user.agent.level ?? 0} • XP: ${user.agent.xp ?? 0}`}
                                </Typography>
                              </Box>
                              <Tooltip title={`${user.agent.xp ?? 0} XP / ${50 * ((user.agent.level ?? 0) + 1)} XP to level ${(user.agent.level ?? 0) + 1}`}>
                                <LinearProgress
                                  variant="determinate"
                                  value={calculateXpProgress(user)}
                                  sx={{ height: 6, borderRadius: 1 }}
                                />
                              </Tooltip>
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {intl.formatMessage({ id: 'agent.noInfo', defaultMessage: 'No agent info' })}
                          </Typography>
                        )}
                      </TableCell>
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

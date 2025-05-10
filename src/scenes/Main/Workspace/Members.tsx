import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Pagination, TextField, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, InputAdornment, Avatar, IconButton } from '@mui/material';
import { useWorkspaceStore } from '@/stores/Workspace/WorkspaceStore';
import { IWorkspaceUser } from '@/../../types/Workspace/Workspace';
import SearchIcon from '@mui/icons-material/Search';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import { useIntl } from 'react-intl';

interface MembersProps {
    workspaceId: string;
}

const Members = ({ workspaceId }: MembersProps) => {
    const intl = useIntl();
    const { getUsersByWorkspace, isLoading, error } = useWorkspaceStore();
    // FIXME: Replace 'admin' with the actual current user's role, possibly from a store or props
    const currentUserRole = 'admin'; // Example: 'super_admin', 'admin', or 'member'
    const [users, setUsers] = useState<IWorkspaceUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    const [page, setPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // Placeholder functions for icon actions
    const handleDetails = (userId: string) => {
        console.log('Details for user:', userId);
        // Implement details logic here
    };

    const handleChangePermission = (userId: string) => {
        console.log('Change permission for user:', userId);
        // Implement change permission logic here
    };

    const handleKick = (userId: string) => {
        console.log('Kick user:', userId);
        // Implement kick logic here
    };

    useEffect(() => {
        const fetchUsers = async () => {
            const workspaceUsers = await getUsersByWorkspace(workspaceId);
            setUsers(workspaceUsers);
        };

        fetchUsers();
    }, [workspaceId, getUsersByWorkspace]);

    useEffect(() => {
        console.log(users);
    }, [users]);

    // Role options
    const roleOptions = [
        { value: 'all', label: 'All Roles' },
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'admin', label: 'Admin' },
        { value: 'member', label: 'Member' }
    ];

    // Define role hierarchy for permission checks
    const roleHierarchy: { [key: string]: number } = {
        super_admin: 3,
        admin: 2,
        member: 1,
    };

    // Get user initials from username
    const getUserInitials = (username: string) => {
        return username ? username.substring(0, 2).toUpperCase() : 'U';
    };

    // Filter users based on role and search term
    const filteredUsers = users.filter(user =>
        (selectedRole === 'all' || user.role === selectedRole) &&
        (searchTerm === '' ||
            (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    // Calculate total pages
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    // Get current page items
    const getCurrentPageItems = () => {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredUsers.slice(startIndex, endIndex);
    };

    // Handle page change
    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    // Handle role filter change
    const handleRoleChange = (event: SelectChangeEvent) => {
        setSelectedRole(event.target.value);
        setPage(1);
    };

    // Handle search change
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setPage(1);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
    };

    if (error) {
        return <Typography color="error">{error}</Typography>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Workspace Members</Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <FormControl sx={{ minWidth: 150 }}>
                    <InputLabel>Filter by Role</InputLabel>
                    <Select
                        value={selectedRole}
                        onChange={handleRoleChange}
                        label="Filter by Role"
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
                    placeholder="Search by username"
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
                        <Table size="medium" sx={{ minWidth: 650 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell width="28%">{intl.formatMessage({ id: 'user.name', defaultMessage: '用戶' })}</TableCell>
                                    <TableCell width="22%">{intl.formatMessage({ id: 'workspace.create.joined', defaultMessage: '加入時間' })}</TableCell>
                                    <TableCell width="20%">{intl.formatMessage({ id: 'user.lastLogin', defaultMessage: '最後登入' })}</TableCell>
                                    <TableCell width="30%" align="right">{intl.formatMessage({ id: 'menu.workspace.manage', defaultMessage: '管理' })}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {getCurrentPageItems().length > 0 ? (
                                    getCurrentPageItems().map((user) => (
                                        <TableRow
                                            key={user.user_id}
                                            hover
                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
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
                                                            {user.username || intl.formatMessage({ id: 'user.unknown', defaultMessage: '未知' })}
                                                        </Typography>
                                                        <Chip
                                                            label={user.role}
                                                            color={user.role === 'super_admin' ? 'error' : user.role === 'admin' ? 'warning' : 'default'}
                                                            size="small"
                                                            sx={{ minWidth: 80, mt: 0.5, height: 22 }}
                                                        />
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{formatDate(user.created_at || '')}</TableCell>
                                            <TableCell>{formatDate(user.last_login || '')}</TableCell>
                                            <TableCell align="right">
                                                {(roleHierarchy[currentUserRole] > roleHierarchy[user.role]) && (
                                                    <>
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: 'text.secondary' }}
                                                            onClick={() => handleDetails(user.user_id)}
                                                            title={intl.formatMessage({ id: 'actions.details', defaultMessage: 'Details' })}
                                                        >
                                                            <InfoOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: 'text.secondary', ml: 0.5 }}
                                                            onClick={() => handleChangePermission(user.user_id)}
                                                            title={intl.formatMessage({ id: 'actions.changePermission', defaultMessage: 'Change Permission' })}
                                                        >
                                                            <AdminPanelSettingsOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            sx={{ color: 'text.secondary', ml: 0.5 }}
                                                            onClick={() => handleKick(user.user_id)}
                                                            title={intl.formatMessage({ id: 'actions.kick', defaultMessage: 'Kick' })}
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
                                        <TableCell colSpan={4} align="center" sx={{ py: 3 }}>{intl.formatMessage({ id: 'workspace.members.noMembersFound', defaultMessage: '找不到成員' })}</TableCell>
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
        </Box>
    );
};

export default Members;
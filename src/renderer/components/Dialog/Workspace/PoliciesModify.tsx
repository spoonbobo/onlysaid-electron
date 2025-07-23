import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextField,
  InputAdornment,
  Pagination,
  Stack,
  Paper,
  Divider,
  IconButton,
} from '@mui/material';
import { 
  Search, 
  Security, 
  FilterList,
  Assignment,
  Person,
  Close
} from '@mui/icons-material';
import { useWorkspaceStore } from '@/renderer/stores/Workspace/WorkspaceStore';
import { IWorkspaceUser, IPolicy } from '@/../../types/Workspace/Workspace';
import { useIntl } from 'react-intl';
import { toast } from '@/utils/toast';

interface PoliciesModifyProps {
  open: boolean;
  onClose: () => void;
  user: IWorkspaceUser | null;
  workspaceId: string;
  workspaceName: string;
}

const POLICIES_PER_PAGE = 8;

const PoliciesModify: React.FC<PoliciesModifyProps> = ({
  open,
  onClose,
  user,
  workspaceId,
  workspaceName,
}) => {
  const intl = useIntl();
  const {
    getUserPolicies,
    getAvailablePolicies,
    grantUserPolicy,
    revokeUserPolicy
  } = useWorkspaceStore();

  const [loading, setLoading] = useState(false);
  const [userPolicies, setUserPolicies] = useState<any>(null);
  const [availablePolicies, setAvailablePolicies] = useState<IPolicy[]>([]);
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user && workspaceId) {
      loadPoliciesData();
    }
  }, [open, user, workspaceId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedResourceType]);

  const loadPoliciesData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [userPoliciesData, availablePoliciesData] = await Promise.all([
        getUserPolicies(workspaceId, user.user_id),
        getAvailablePolicies(workspaceId)
      ]);
      
      setUserPolicies(userPoliciesData);
      setAvailablePolicies(availablePoliciesData);
    } catch (err: any) {
      console.error("Error loading policies data:", err);
      setError(err.message || intl.formatMessage({ id: 'workspace.policies.error.loadFailed', defaultMessage: 'Failed to load policies data' }));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUserPolicies(null);
    setAvailablePolicies([]);
    setSelectedResourceType('all');
    setSearchQuery('');
    setCurrentPage(1);
    setError(null);
    onClose();
  };

  const getFilteredAndSearchedPolicies = useMemo((): IPolicy[] => {
    let filtered = availablePolicies;

    if (selectedResourceType !== 'all') {
      filtered = filtered.filter(policy => policy.resource_type === selectedResourceType);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(policy => 
        policy.name.toLowerCase().includes(query) ||
        policy.description?.toLowerCase().includes(query) ||
        policy.resource_type.toLowerCase().includes(query) ||
        policy.action.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [availablePolicies, selectedResourceType, searchQuery]);

  const paginatedPolicies = useMemo((): IPolicy[] => {
    const startIndex = (currentPage - 1) * POLICIES_PER_PAGE;
    const endIndex = startIndex + POLICIES_PER_PAGE;
    return getFilteredAndSearchedPolicies.slice(startIndex, endIndex);
  }, [getFilteredAndSearchedPolicies, currentPage]);

  const totalPages = Math.ceil(getFilteredAndSearchedPolicies.length / POLICIES_PER_PAGE);

  const getResourceTypes = (): string[] => {
    const types = [...new Set(availablePolicies.map(policy => policy.resource_type))];
    return types.sort();
  };

  const hasPolicyDirectly = (policyId: string): boolean => {
    return userPolicies?.direct_policies?.some((p: any) => p.id === policyId) || false;
  };

  const hasPolicyFromRole = (policyId: string): boolean => {
    return userPolicies?.role_policies?.some((p: any) => p.id === policyId) || false;
  };

  const handlePolicyToggle = async (policy: IPolicy, shouldGrant: boolean) => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (shouldGrant) {
        await grantUserPolicy(workspaceId, user.user_id, policy.id);
        toast.success(intl.formatMessage({ id: 'workspace.policies.success.granted', defaultMessage: 'Policy granted successfully' }));
      } else {
        await revokeUserPolicy(workspaceId, user.user_id, policy.id);
        toast.success(intl.formatMessage({ id: 'workspace.policies.success.revoked', defaultMessage: 'Policy revoked successfully' }));
      }
      
      await loadPoliciesData();
    } catch (err: any) {
      console.error("Error updating policy:", err);
      toast.error(err.message || intl.formatMessage({ id: 'workspace.policies.error.updateFailed', defaultMessage: 'Failed to update policy' }));
    } finally {
      setLoading(false);
    }
  };

  const handleResourceTypeChange = (event: SelectChangeEvent<string>) => {
    setSelectedResourceType(event.target.value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const formatPolicyName = (name: string): string => {
    return name.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  };

  const getPolicyStatus = (policy: IPolicy): 'direct' | 'role' | 'none' => {
    if (hasPolicyDirectly(policy.id)) return 'direct';
    if (hasPolicyFromRole(policy.id)) return 'role';
    return 'none';
  };

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: { 
          height: '90vh', 
          maxHeight: '900px', 
          width: '95vw',
          borderRadius: 1
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Security color="action" />
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          {intl.formatMessage(
            { id: 'workspace.policies.modify.title', defaultMessage: 'Manage Policies for {username}' },
                  { username: user.username || intl.formatMessage({ id: 'user.name', defaultMessage: 'User' }) }
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {intl.formatMessage(
            { id: 'workspace.policies.modify.subtitle', defaultMessage: 'Workspace: {workspaceName}' },
            { workspaceName }
          )}
        </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '100%' }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Left Column - Policy Selection */}
            <Box sx={{ flex: '1 1 65%', borderRight: 1, borderColor: 'divider' }}>
              <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.25' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Assignment fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {intl.formatMessage({ id: 'workspace.policies.available', defaultMessage: 'Available Policies' })}
                  </Typography>
                  <Chip 
                    label={getFilteredAndSearchedPolicies.length} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>
                
                {/* Search and Filter Controls */}
                <Stack direction="row" spacing={2}>
                  <TextField
                    size="small"
                    placeholder={intl.formatMessage({ id: 'workspace.policies.search', defaultMessage: 'Search policies...' })}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ flexGrow: 1 }}
                  />
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>
                  {intl.formatMessage({ id: 'workspace.policies.filterByResource', defaultMessage: 'Filter by Resource' })}
                </InputLabel>
                <Select
                  value={selectedResourceType}
                  onChange={handleResourceTypeChange}
                  label={intl.formatMessage({ id: 'workspace.policies.filterByResource', defaultMessage: 'Filter by Resource' })}
                      startAdornment={<FilterList fontSize="small" sx={{ mr: 1 }} />}
                >
                  <MenuItem value="all">
                    {intl.formatMessage({ id: 'workspace.policies.allResources', defaultMessage: 'All Resources' })}
                  </MenuItem>
                  {getResourceTypes().map(resourceType => (
                    <MenuItem key={resourceType} value={resourceType}>
                      {formatPolicyName(resourceType)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
                </Stack>
            </Box>

              {/* Policies List */}
              <Box sx={{ p: 2, height: 'calc(100% - 180px)', overflow: 'auto' }}>
                <Stack spacing={1}>
                  {paginatedPolicies.map((policy) => {
                    const status = getPolicyStatus(policy);
                    const canToggle = status !== 'role';
                    const isChecked = status === 'direct';
                    
                    return (
                      <Paper
                        key={policy.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          backgroundColor: status === 'direct' ? 'grey.50' : 
                                          status === 'role' ? 'grey.100' : 'background.paper',
                          borderColor: status === 'direct' ? 'primary.main' : 
                                      status === 'role' ? 'grey.400' : 'divider',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor: status === 'none' ? 'grey.25' : undefined
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={isChecked}
                                disabled={!canToggle || loading}
                                onChange={(e) => handlePolicyToggle(policy, e.target.checked)}
                                size="small"
                              />
                            }
                            label=""
                            sx={{ margin: 0, mt: 0.5 }}
                          />
                          
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                                {formatPolicyName(policy.name)}
                              </Typography>
                              <Chip
                                label={
                                  status === 'direct' 
                                    ? intl.formatMessage({ id: 'workspace.policies.status.direct', defaultMessage: 'Direct' })
                                    : status === 'role' 
                                    ? intl.formatMessage({ id: 'workspace.policies.status.fromRole', defaultMessage: 'From Role' })
                                    : intl.formatMessage({ id: 'workspace.policies.status.available', defaultMessage: 'Available' })
                                }
                            size="small"
                                variant={status === 'none' ? 'outlined' : 'filled'}
                                color={status === 'direct' ? 'default' : status === 'role' ? 'default' : 'default'}
                                sx={{
                                  bgcolor: status === 'direct' ? 'primary.100' : 
                                          status === 'role' ? 'grey.300' : undefined,
                                  color: status === 'direct' ? 'primary.800' : 
                                         status === 'role' ? 'grey.700' : undefined
                                }}
                          />
                        </Box>
                        
                        {policy.description && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {policy.description}
                          </Typography>
                        )}
                        
                            <Typography variant="caption" sx={{ 
                              color: 'text.secondary',
                              fontFamily: 'monospace',
                              bgcolor: 'grey.100',
                              px: 1,
                              py: 0.25,
                              borderRadius: 0.5,
                              fontSize: '0.75rem'
                            }}>
                          {policy.resource_type}.{policy.action}
                        </Typography>
                      </Box>
                        </Box>
                      </Paper>
                    );
                  })}

                  {paginatedPolicies.length === 0 && (
                    <Paper sx={{ p: 4, textAlign: 'center' }} variant="outlined">
                      <Typography color="text.secondary" variant="body1">
                        {intl.formatMessage({ id: 'workspace.policies.noPolicies', defaultMessage: 'No policies found for the selected filter.' })}
                      </Typography>
                    </Paper>
                  )}
                </Stack>
              </Box>

              {/* Pagination Footer */}
              <Box sx={{ 
                p: 2, 
                borderTop: 1, 
                borderColor: 'divider',
                bgcolor: 'grey.25',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="body2" color="text.secondary">
                  {intl.formatMessage(
                    { 
                      id: 'workspace.policies.results.summary', 
                      defaultMessage: 'Showing {start}-{end} of {total} policies' 
                    },
                    {
                      start: Math.min((currentPage - 1) * POLICIES_PER_PAGE + 1, getFilteredAndSearchedPolicies.length),
                      end: Math.min(currentPage * POLICIES_PER_PAGE, getFilteredAndSearchedPolicies.length),
                      total: getFilteredAndSearchedPolicies.length
                    }
                  )}
                </Typography>
                
                {totalPages > 1 && (
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="small"
                  />
                )}
              </Box>
            </Box>

            {/* Right Column - User's Current Policies */}
            <Box sx={{ flex: '0 0 35%', bgcolor: 'grey.25' }}>
              <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <Person fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>
                    {intl.formatMessage(
                      { id: 'workspace.policies.userPolicies', defaultMessage: '{username}\'s Policies' },
                      { username: user.username }
                    )}
                  </Typography>
                </Box>

                <Stack spacing={3}>
                  {/* Role Policies */}
                  {userPolicies?.role_policies && userPolicies.role_policies.length > 0 && (
                    <Card variant="outlined">
                      <CardHeader
                        title={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {intl.formatMessage({ id: 'workspace.policies.fromRole', defaultMessage: 'Policies from Role' })}
                            </Typography>
                            <Chip 
                              label={userPolicies.role_policies.length} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        }
                        subheader={intl.formatMessage({ id: 'workspace.policies.fromRole.description', defaultMessage: 'Inherited from user\'s role' })}
                        sx={{ pb: 1 }}
                      />
                      <CardContent>
                        <Stack spacing={1}>
                          {userPolicies.role_policies.map((policy: any) => (
                            <Paper
                              key={policy.id}
                              variant="outlined"
                              sx={{ p: 1.5, bgcolor: 'grey.50' }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                {formatPolicyName(policy.name)}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: 'text.secondary',
                                fontFamily: 'monospace',
                                fontSize: '0.7rem'
                              }}>
                                {policy.resource_type}.{policy.action}
                              </Typography>
                            </Paper>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  )}

                  {/* Direct Policies */}
                  <Card variant="outlined" sx={{ flexGrow: 1 }}>
                    <CardHeader
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {intl.formatMessage({ id: 'workspace.policies.direct', defaultMessage: 'Direct Policies' })}
                          </Typography>
                          <Chip 
                            label={userPolicies?.direct_policies?.length || 0} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      }
                      subheader={intl.formatMessage({ id: 'workspace.policies.direct.description', defaultMessage: 'Directly assigned policies' })}
                      sx={{ pb: 1 }}
                    />
                    <CardContent>
                      {userPolicies?.direct_policies && userPolicies.direct_policies.length > 0 ? (
                        <Stack spacing={1}>
                          {userPolicies.direct_policies.map((policy: any) => (
                            <Paper
                              key={policy.id}
                              variant="outlined"
                              sx={{ 
                                p: 1.5, 
                                bgcolor: 'primary.50',
                                borderColor: 'primary.200'
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                                {formatPolicyName(policy.name)}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: 'text.secondary',
                                fontFamily: 'monospace',
                                fontSize: '0.7rem'
                              }}>
                                {policy.resource_type}.{policy.action}
                              </Typography>
                            </Paper>
                          ))}
                        </Stack>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 3 }}>
                          <Typography color="text.secondary" variant="body2">
                            {intl.formatMessage({ id: 'workspace.policies.direct.empty', defaultMessage: 'No direct policies assigned' })}
                  </Typography>
                        </Box>
                )}
              </CardContent>
            </Card>

                  {/* Summary Stats */}
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
                      {intl.formatMessage({ id: 'workspace.policies.summary', defaultMessage: 'Policy Summary' })}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {userPolicies?.direct_policies?.length || 0}
                      </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {intl.formatMessage({ id: 'workspace.policies.summary.direct', defaultMessage: 'Direct' })}
                      </Typography>
                    </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {userPolicies?.role_policies?.length || 0}
                      </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {intl.formatMessage({ id: 'workspace.policies.summary.fromRole', defaultMessage: 'From Role' })}
                      </Typography>
                    </Box>
                  </Box>
                  </Paper>
                </Stack>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.25' }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          variant="contained"
          size="medium"
        >
          {intl.formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PoliciesModify;

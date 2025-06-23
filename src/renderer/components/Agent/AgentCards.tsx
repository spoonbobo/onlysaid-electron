import React, { useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Stack,
  Button,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  Paper,
  Chip,
  useTheme,
  alpha,
  Skeleton
} from '@mui/material';
import {
  Search,
  FilterList,
  ViewModule,
  ViewList,
  Refresh,
  Add
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { AgentCard as IAgentCard } from '@/../../types/Agent/AgentCard';
import AgentCard from './AgentCard';

interface AgentCardsProps {
  agents: IAgentCard[];
  loading?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onAgentSelect?: (agent: IAgentCard) => void;
  onAgentAction?: (action: string, agent: IAgentCard) => void;
  onRefresh?: () => void;
  onCreateAgent?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  roleFilter?: string;
  onRoleFilterChange?: (role: string) => void;
}

export const AgentCards: React.FC<AgentCardsProps> = ({
  agents,
  loading = false,
  viewMode = 'grid',
  onViewModeChange,
  onAgentSelect,
  onAgentAction,
  onRefresh,
  onCreateAgent,
  searchQuery = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  roleFilter = 'all',
  onRoleFilterChange
}) => {
  const theme = useTheme();
  const intl = useIntl();

  // Filter and search agents
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchesSearch = !searchQuery || 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.expertise?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      const matchesRole = roleFilter === 'all' || agent.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [agents, searchQuery, statusFilter, roleFilter]);

  // Get unique roles and statuses for filters
  const availableRoles = useMemo(() => {
    const roles = new Set(agents.map(agent => agent.role).filter(Boolean));
    return Array.from(roles);
  }, [agents]);

  const availableStatuses = useMemo(() => {
    const statuses = new Set(agents.map(agent => agent.status).filter(Boolean));
    return Array.from(statuses);
  }, [agents]);

  // Get status counts
  const statusCounts = useMemo(() => {
    const counts = agents.reduce((acc, agent) => {
      const status = agent.status || 'idle';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return counts;
  }, [agents]);

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            {intl.formatMessage({ id: 'agents.title' })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredAgents.length} of {agents.length} agents
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          {onRefresh && (
            <Tooltip title={intl.formatMessage({ id: 'common.refresh' })}>
              <IconButton onClick={onRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          )}

          {onViewModeChange && (
            <Stack direction="row" spacing={0}>
              <Tooltip title={intl.formatMessage({ id: 'view.grid' })}>
                <IconButton
                  onClick={() => onViewModeChange('grid')}
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                >
                  <ViewModule />
                </IconButton>
              </Tooltip>
              <Tooltip title={intl.formatMessage({ id: 'view.list' })}>
                <IconButton
                  onClick={() => onViewModeChange('list')}
                  color={viewMode === 'list' ? 'primary' : 'default'}
                >
                  <ViewList />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          {onCreateAgent && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onCreateAgent}
            >
              {intl.formatMessage({ id: 'agents.create' })}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Status Overview */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          {intl.formatMessage({ id: 'agents.statusOverview' })}
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Chip
            label={`${intl.formatMessage({ id: 'status.idle' })}: ${statusCounts.idle || 0}`}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.grey[500], 0.1) }}
          />
          <Chip
            label={`${intl.formatMessage({ id: 'status.busy' })}: ${statusCounts.busy || 0}`}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}
          />
          <Chip
            label={`${intl.formatMessage({ id: 'status.completed' })}: ${statusCounts.completed || 0}`}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}
          />
          <Chip
            label={`${intl.formatMessage({ id: 'status.failed' })}: ${statusCounts.failed || 0}`}
            size="small"
            sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}
          />
        </Stack>
      </Paper>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        {/* Search */}
        {onSearchChange && (
          <TextField
            placeholder={intl.formatMessage({ id: 'agents.search.placeholder' })}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* Status Filter */}
        {onStatusFilterChange && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{intl.formatMessage({ id: 'filter.status' })}</InputLabel>
            <Select
              value={statusFilter}
              label={intl.formatMessage({ id: 'filter.status' })}
              onChange={(e) => onStatusFilterChange(e.target.value)}
            >
              <MenuItem value="all">
                {intl.formatMessage({ id: 'filter.all' })}
              </MenuItem>
              {availableStatuses.map(status => (
                <MenuItem key={status} value={status}>
                  {intl.formatMessage({ id: `status.${status}` })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Role Filter */}
        {onRoleFilterChange && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{intl.formatMessage({ id: 'filter.role' })}</InputLabel>
            <Select
              value={roleFilter}
              label={intl.formatMessage({ id: 'filter.role' })}
              onChange={(e) => onRoleFilterChange(e.target.value)}
            >
              <MenuItem value="all">
                {intl.formatMessage({ id: 'filter.all' })}
              </MenuItem>
              {availableRoles.map(role => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>

      {/* Agents Grid/List */}
      {loading ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" width={300} height={200} />
          ))}
        </Box>
      ) : filteredAgents.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {intl.formatMessage({ id: 'agents.noAgents' })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {searchQuery || statusFilter !== 'all' || roleFilter !== 'all'
              ? intl.formatMessage({ id: 'agents.noMatchingAgents' })
              : intl.formatMessage({ id: 'agents.noAgentsDescription' })
            }
          </Typography>
        </Paper>
      ) : (
        <Box 
          sx={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: viewMode === 'grid' ? 3 : 2,
            '& > *': {
              flex: viewMode === 'grid' ? '1 1 300px' : '1 1 100%',
              minWidth: viewMode === 'grid' ? '300px' : 'auto',
              maxWidth: viewMode === 'grid' ? '400px' : 'none'
            }
          }}
        >
          {filteredAgents.map((agent) => (
            <Box key={agent.runtimeId || agent.name}>
              <AgentCard
                agentCard={agent}
                compact={viewMode === 'list'}
                onSelect={onAgentSelect}
                onAction={onAgentAction}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AgentCards; 
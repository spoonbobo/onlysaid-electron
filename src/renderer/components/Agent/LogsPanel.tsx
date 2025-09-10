import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  useTheme,
  alpha,
  TextField,
  InputAdornment,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Timeline, 
  Analytics, 
  Refresh, 
  Search,
  FilterList,
  Clear,
  Download,
  Visibility,
  VisibilityOff,
  ErrorOutline,
  Warning,
  Info,
  CheckCircle,
  Psychology,
  Build,
  AutoAwesome
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { useLogStore } from '@/renderer/stores/Agent/task/LogStore';

interface LogsPanelProps {
  currentExecution: {
    id?: string;
    executionId?: string;
    status?: string;
    currentPhase?: string;
    activeAgentCards?: Record<string, any>;
    agentResults?: Record<string, any>;
    errors?: string[];
    created_at?: string;
  } | null;
  isTaskRunning: boolean;
  isTaskActive: boolean;
  isFullscreen: boolean;
}

type LogLevel = 'all' | 'error' | 'warning' | 'info' | 'agent_execution' | 'tool_request' | 'tool_result' | 'synthesis' | 'status_update';

interface FormattedLog {
  id: string;
  message: string;
  timestamp: string;
  log_type: string;
  execution_id?: string;
  agent_role?: string;
  tool_name?: string;
  formattedMessage?: string;
  displayText?: string;
  isLive?: boolean;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({
  currentExecution,
  isTaskRunning,
  isTaskActive,
  isFullscreen
}) => {
  const intl = useIntl();
  const theme = useTheme();
  
  const { 
    logs: storeLogs, 
    loadLogsByExecution, 
    getFormattedLogs,
    isLoading,
    error 
  } = useLogStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogLevel, setSelectedLogLevel] = useState<LogLevel>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  const executionId = currentExecution?.id || currentExecution?.executionId;

  useEffect(() => {
    if (executionId) {
      console.log('[LogsPanel] Loading logs for execution:', executionId);
      loadLogsByExecution(executionId).catch(error => {
        console.error('[LogsPanel] Failed to load logs:', error);
      });
    }
  }, [executionId, loadLogsByExecution]);

  const allLogs = useMemo(() => {
    if (!executionId) return [];
    // Recompute whenever store logs change for real-time updates
    return getFormattedLogs(executionId);
  }, [executionId, getFormattedLogs, storeLogs]);

  const filteredLogs = useMemo(() => {
    let logs = [...allLogs];
    
    logs = logs.filter((log, index, self) => 
      index === self.findIndex(l => l.message === log.message && l.timestamp === log.timestamp)
    );
    
    if (selectedLogLevel !== 'all') {
      logs = logs.filter(log => log.log_type === selectedLogLevel);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      logs = logs.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.agent_role?.toLowerCase().includes(query) ||
        log.tool_name?.toLowerCase().includes(query)
      );
    }
    
    return logs.sort((a: FormattedLog, b: FormattedLog) => {
      if (a.isLive && !b.isLive) return 1;
      if (!a.isLive && b.isLive) return -1;
      return a.timestamp.localeCompare(b.timestamp);
    });
  }, [allLogs, selectedLogLevel, searchQuery, storeLogs]);

  const logTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      counts[log.log_type] = (counts[log.log_type] || 0) + 1;
    });
    return counts;
  }, [filteredLogs, storeLogs]);

  const handleRefresh = useCallback(() => {
    if (executionId) {
      loadLogsByExecution(executionId);
    }
  }, [executionId, loadLogsByExecution]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleExportLogs = useCallback(() => {
    const logData = filteredLogs.map((log: FormattedLog)   => ({
      timestamp: log.timestamp,
      type: log.log_type,
      message: log.message,
      agentRole: log.agent_role,
      toolName: log.tool_name,
      isLive: log.isLive ?? false,
      executionId: log.execution_id
    }));
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-logs-${executionId || 'unknown'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredLogs, executionId]);

  const getTranslatedAgentRole = useCallback((role?: string) => {
    if (!role) return null;
    
    try {
      return intl.formatMessage({ id: `agent.role.${role.toLowerCase()}` });
    } catch {
      return role;
    }
  }, [intl]);

  const getLogTypeProps = useCallback((type: string) => {
    switch (type) {
      case 'error':
        return { 
          color: 'error' as const, 
          icon: <ErrorOutline fontSize="small" />, 
          label: intl.formatMessage({ id: 'agent.logs.type.error', defaultMessage: 'Error' }) 
        };
      case 'warning':
        return { 
          color: 'warning' as const, 
          icon: <Warning fontSize="small" />, 
          label: intl.formatMessage({ id: 'agent.logs.type.warning', defaultMessage: 'Warning' }) 
        };
      case 'tool_request':
        return { 
          color: 'info' as const, 
          icon: <Build fontSize="small" />, 
          label: intl.formatMessage({ id: 'agent.logs.type.tool_request', defaultMessage: 'Tool Request' }) 
        };
      case 'tool_result':
        return { 
          color: 'success' as const, 
          icon: <CheckCircle fontSize="small" />, 
          label: intl.formatMessage({ id: 'agent.logs.type.tool_result', defaultMessage: 'Tool Result' }) 
        };
      case 'agent_execution':
        return { 
          color: 'secondary' as const, 
          icon: <Psychology fontSize="small" />, 
          label: intl.formatMessage({ id: 'agent.logs.type.agent_execution', defaultMessage: 'Agent Execution' }) 
        };
      case 'synthesis':
        return { 
          color: 'primary' as const, 
          icon: <AutoAwesome fontSize="small" />, 
          label: intl.formatMessage({ id: 'agent.logs.type.synthesis', defaultMessage: 'Synthesis' }) 
        };
      case 'status_update':
        return { 
          color: 'default' as const, 
          icon: <Info fontSize="small" />, 
          label: intl.formatMessage({ id: 'agent.logs.type.status_update', defaultMessage: 'Status Update' }) 
        };
      default:
        return { 
          color: 'default' as const, 
          icon: <Info fontSize="small" />, 
          label: intl.formatMessage({ id: 'agent.logs.type.info', defaultMessage: 'Info' }) 
        };
    }
  }, [intl]);

  if (isLoading) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading logs...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Stack alignItems="center" spacing={2}>
          <ErrorOutline color="error" sx={{ fontSize: 48 }} />
          <Typography variant="body2" color="error">
            {error}
          </Typography>
          <Button onClick={handleRefresh} variant="outlined" size="small">
            Retry
          </Button>
        </Stack>
      </Box>
    );
  }

  const historicalLogs = filteredLogs.filter((log: FormattedLog) => !log.isLive);
  const liveLogs = filteredLogs.filter((log: FormattedLog) => log.isLive);

  return (
    <Box
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {filteredLogs.length > 0 || searchQuery || selectedLogLevel !== 'all' ? (
        <Stack spacing={2} sx={{ height: '100%', overflow: 'hidden' }}>
          <Paper 
            elevation={2}
            sx={{ 
              p: 2, 
              flexShrink: 0,
              bgcolor: 'background.paper',
              borderRadius: 2
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Timeline />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="600" sx={{ lineHeight: 1.2 }}>
                      {intl.formatMessage({ id: 'agent.logs.title', defaultMessage: 'Execution Logs' })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {intl.formatMessage(
                        { id: 'agent.logs.summary', defaultMessage: '{total} logs' }, 
                        { 
                          total: filteredLogs.length,
                          historical: historicalLogs.length,
                          live: liveLogs.length
                        }
                      )}
                    </Typography>
                  </Box>
                </Stack>
                
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={handleExportLogs} disabled={filteredLogs.length === 0}>
                    <Download fontSize="small" />
                  </IconButton>
                  
                  <IconButton size="small" onClick={handleRefresh}>
                    <Refresh fontSize="small" />
                  </IconButton>
                  
                  <IconButton 
                    size="small" 
                    onClick={() => setAutoScroll(!autoScroll)}
                    color={autoScroll ? 'primary' : 'default'}
                  >
                    {autoScroll ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                  </IconButton>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center">
                <TextField
                  size="small"
                  placeholder={intl.formatMessage({ id: 'agent.logs.searchPlaceholder', defaultMessage: 'Search logs...' })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={handleClearSearch}>
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 200, flexGrow: 1 }}
                />
                
                <Button
                  size="small"
                  startIcon={<FilterList />}
                  onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                  variant={selectedLogLevel !== 'all' ? 'contained' : 'outlined'}
                  sx={{ minWidth: 120 }}
                >
                  {selectedLogLevel === 'all' 
                    ? intl.formatMessage({ id: 'agent.logs.filter.all', defaultMessage: 'All Logs' })
                    : getLogTypeProps(selectedLogLevel).label
                  }
                </Button>
              </Stack>

              {Object.keys(logTypeCounts).length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.entries(logTypeCounts).map(([logType, count]) => {
                    if (count === 0) return null;
                    const chipProps = getLogTypeProps(logType);
                    
                    return (
                      <Chip
                        key={logType}
                        icon={chipProps.icon}
                        label={`${chipProps.label} (${count})`}
                        size="small"
                        variant={selectedLogLevel === logType ? 'filled' : 'outlined'}
                        color={chipProps.color}
                        clickable
                        onClick={() => setSelectedLogLevel(selectedLogLevel === logType ? 'all' : logType as LogLevel)}
                        sx={{ 
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          '& .MuiChip-icon': { fontSize: '1rem' }
                        }}
                      />
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>
          
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              maxHeight: isFullscreen ? 'calc(100vh - 280px)' : '600px',
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-track': { backgroundColor: alpha(theme.palette.action.hover, 0.1) },
              '&::-webkit-scrollbar-thumb': { 
                backgroundColor: alpha(theme.palette.action.hover, 0.3),
                borderRadius: 4,
                '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.5) }
              },
            }}
          >
            <Stack spacing={1}>
              {filteredLogs.map((log: FormattedLog) => {
                const logTypeProps = getLogTypeProps(log.log_type);
                
                return (
                  <Paper
                    key={log.id}
                    variant="outlined"
                    sx={{ 
                      p: 0,
                      backgroundColor: log.isLive
                        ? alpha(theme.palette.success.main, 0.03)
                        : 'background.paper',
                      borderColor: log.isLive
                        ? alpha(theme.palette.success.main, 0.2)
                        : 'divider',
                      borderRadius: 2,
                      '&:hover': {
                        backgroundColor: log.isLive
                          ? alpha(theme.palette.success.main, 0.08)
                          : alpha(theme.palette.action.hover, 0.04),
                        borderColor: log.isLive
                          ? alpha(theme.palette.success.main, 0.3)
                          : alpha(theme.palette.action.hover, 0.2)
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', width: '100%' }}>
                      <Box 
                        sx={{ 
                          width: 160,
                          flexShrink: 0,
                          p: 1.5,
                          borderRight: 1,
                          borderColor: 'divider',
                          bgcolor: alpha(theme.palette.background.default, 0.3)
                        }}
                      >
                        <Stack spacing={0.5} alignItems="flex-start">
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              color: 'text.secondary',
                              fontWeight: 500,
                              bgcolor: alpha(theme.palette.background.paper, 0.8),
                              px: 0.5,
                              py: 0.25,
                              borderRadius: 0.5
                            }}
                          >
                            {log.timestamp}
                          </Typography>
                          
                          <Chip 
                            icon={logTypeProps.icon}
                            label={logTypeProps.label} 
                            size="small" 
                            color={logTypeProps.color}
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.65rem',
                              height: 20,
                              '& .MuiChip-label': { px: 0.5 },
                              '& .MuiChip-icon': { fontSize: '0.8rem' }
                            }} 
                          />
                          
                          {log.isLive && (
                            <Chip 
                              label={intl.formatMessage({ id: 'agent.logs.live', defaultMessage: 'Live' })} 
                              size="small" 
                              color="success" 
                              variant="filled" 
                              sx={{ 
                                fontSize: '0.6rem', 
                                height: 16, 
                                fontWeight: 'bold',
                                '& .MuiChip-label': { px: 0.5 }
                              }} 
                            />
                          )}
                          
                          {log.agent_role && (
                            <Chip 
                              label={getTranslatedAgentRole(log.agent_role) || log.agent_role} 
                              size="small" 
                              variant="outlined" 
                              color="secondary"
                              sx={{ 
                                fontSize: '0.6rem', 
                                height: 18,
                                maxWidth: '100%',
                                '& .MuiChip-label': { 
                                  px: 0.5,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }} 
                            />
                          )}
                        </Stack>
                      </Box>
                      
                      <Box sx={{ flexGrow: 1, p: 1.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ 
                            wordBreak: 'break-word',
                            lineHeight: 1.5,
                            fontSize: '0.875rem',
                            color: 'text.primary'
                          }}
                        >
                          {log.message}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      ) : (
        <Paper 
          sx={{ 
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: 1,
            borderColor: 'divider'
          }}
        >
          <Stack alignItems="center" spacing={3} sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
            {(isTaskRunning || isTaskActive) ? (
              <>
                <Box
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CircularProgress 
                    size={64} 
                    thickness={4} 
                    sx={{ color: 'primary.main' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Timeline sx={{ fontSize: 28, color: 'primary.main' }} />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="h6" color="text.primary" fontWeight="600" gutterBottom>
                    {intl.formatMessage({ id: 'agent.logs.initializing', defaultMessage: 'Initializing Agent...' })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {intl.formatMessage({ id: 'agent.logs.waitingForActivity', defaultMessage: 'Waiting for agent activity...' })}
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.text.disabled, 0.1),
                    color: 'text.disabled'
                  }}
                >
                  <Analytics sx={{ fontSize: 64 }} />
                </Box>
                <Box>
                  <Typography variant="h6" color="text.secondary" fontWeight="600" gutterBottom>
                    {intl.formatMessage({ id: 'agent.logs.noActivity', defaultMessage: 'No Execution Activity' })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {intl.formatMessage({ id: 'agent.logs.startTaskPrompt', defaultMessage: 'Start an agent task to view execution logs' })}
                  </Typography>
                  
                  {currentExecution && (
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        mt: 2, 
                        bgcolor: alpha(theme.palette.background.default, 0.5),
                        borderRadius: 2
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                        {intl.formatMessage({ id: 'agent.logs.viewingHistorical', defaultMessage: 'Viewing historical execution' })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 500, textAlign: 'center' }}>
                        {intl.formatMessage({ id: 'agent.logs.executionDate', defaultMessage: 'Execution Date: {date}' }, { 
                          date: new Date(currentExecution.created_at || Date.now()).toLocaleString() 
                        })}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </>
            )}
          </Stack>
        </Paper>
      )}

      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem 
          selected={selectedLogLevel === 'all'}
          onClick={() => {
            setSelectedLogLevel('all');
            setFilterMenuAnchor(null);
          }}
        >
          <ListItemText primary={intl.formatMessage({ id: 'agent.logs.filter.all', defaultMessage: 'All Logs' })} />
        </MenuItem>
        <Divider />
        {(['error', 'warning', 'info', 'agent_execution', 'tool_request', 'tool_result', 'synthesis', 'status_update'] as LogLevel[]).map(level => {
          const props = getLogTypeProps(level);
          return (
            <MenuItem 
              key={level}
              selected={selectedLogLevel === level}
              onClick={() => {
                setSelectedLogLevel(level);
                setFilterMenuAnchor(null);
              }}
            >
              <ListItemIcon>
                {props.icon}
              </ListItemIcon>
              <ListItemText primary={props.label} />
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}; 
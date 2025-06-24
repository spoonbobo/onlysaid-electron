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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Badge,
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
  ExpandMore,
  ExpandLess,
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

interface LangGraphLog {
  id: string;
  message: string;
  timestamp: string;
  type: 'info' | 'status_update' | 'agent_execution' | 'tool_request' | 'tool_result' | 'warning' | 'error' | 'synthesis';
  isLive: boolean;
  agentRole?: string;
  toolName?: string;
  executionId?: string;
}

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

export const LogsPanel: React.FC<LogsPanelProps> = ({
  currentExecution,
  isTaskRunning,
  isTaskActive,
  isFullscreen
}) => {
  const intl = useIntl();
  const theme = useTheme();
  
  const { addLog, loadLogsByExecution, getFormattedLogs } = useLogStore();
  
  const [logs, setLogs] = useState<LangGraphLog[]>([]);
  const [streamUpdates, setStreamUpdates] = useState<string[]>([]);
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

  const persistLiveLog = useCallback(async (log: LangGraphLog) => {
    if (!executionId) {
      console.warn('[LogsPanel] Cannot persist log - no execution ID');
      return;
    }

    try {
      await addLog(
        executionId,
        log.type as any,
        log.message,
        undefined,
        undefined,
        undefined,
        {
          isLive: log.isLive,
          agentRole: log.agentRole,
          toolName: log.toolName,
          originalTimestamp: log.timestamp
        }
      );
      console.log('[LogsPanel] ✅ Persisted live log to database:', log.message.substring(0, 50));
    } catch (error) {
      console.error('[LogsPanel] ❌ Failed to persist live log:', error);
    }
  }, [executionId, addLog]);

  useEffect(() => {
    console.log('[LogsPanel] Setting up LangGraph stream listeners...');
    
    const handleStreamUpdate = (event: any, ...args: unknown[]) => {
      const data = args[0] as { update: string };
      console.log('[LogsPanel] 📡 Received stream update:', data.update.substring(0, 100) + '...');
      
      setStreamUpdates(prev => [...prev, data.update]);
      
      const streamLog: LangGraphLog = {
        id: `stream-${Date.now()}-${Math.random()}`,
        message: data.update,
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        isLive: true,
        executionId
      };
      persistLiveLog(streamLog);
    };

    const handleAgentUpdated = (event: any, ...args: unknown[]) => {
      const data = args[0] as { agentCard: any; status: string; currentTask?: string; executionId?: string };
      console.log('[LogsPanel] 🤖 Agent updated:', data);
      
      const logEntry: LangGraphLog = {
        id: `agent-${Date.now()}-${Math.random()}`,
        message: `Agent ${data.agentCard.name || data.agentCard.role} status: ${data.status}${data.currentTask ? ` (${data.currentTask})` : ''}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'agent_execution',
        isLive: true,
        agentRole: data.agentCard.role,
        executionId: data.executionId || executionId
      };
      
      setLogs(prev => [...prev, logEntry]);
      
      persistLiveLog(logEntry);
    };

    const handleExecutionUpdated = (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; status: string; progress: any };
      console.log('[LogsPanel] ⚡ Execution updated:', data);
      
      const logEntry: LangGraphLog = {
        id: `execution-${Date.now()}-${Math.random()}`,
        message: `Execution phase: ${data.progress?.phase || data.status}${data.progress?.analysis ? ` - ${data.progress.analysis}` : ''}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'status_update',
        isLive: true,
        executionId: data.executionId
      };
      
      setLogs(prev => [...prev, logEntry]);
      
      persistLiveLog(logEntry);
    };

    const handleResultSynthesized = (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; result: string; agentCards: any[] };
      console.log('[LogsPanel] 🔮 Result synthesized:', data);
      
      const logEntry: LangGraphLog = {
        id: `synthesis-${Date.now()}-${Math.random()}`,
        message: `Synthesis completed with ${data.agentCards?.length || 0} agent contributions`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'synthesis',
        isLive: true,
        executionId: data.executionId
      };
      
      setLogs(prev => [...prev, logEntry]);
      
      persistLiveLog(logEntry);
    };

    const unsubscribeStream = window.electron?.ipcRenderer?.on?.('agent:stream_update', handleStreamUpdate);
    const unsubscribeAgent = window.electron?.ipcRenderer?.on?.('agent:agent_updated', handleAgentUpdated);
    const unsubscribeExecution = window.electron?.ipcRenderer?.on?.('agent:execution_updated', handleExecutionUpdated);
    const unsubscribeSynthesis = window.electron?.ipcRenderer?.on?.('agent:result_synthesized', handleResultSynthesized);

    return () => {
      console.log('[LogsPanel] Cleaning up LangGraph listeners');
      unsubscribeStream?.();
      unsubscribeAgent?.();
      unsubscribeExecution?.();
      unsubscribeSynthesis?.();
    };
  }, [executionId, persistLiveLog]);

  const historicalLogs: LangGraphLog[] = useMemo(() => {
    if (!currentExecution) return [];

    const logs: LangGraphLog[] = [];
    const baseTimestamp = currentExecution.created_at || new Date().toISOString();
    const execId = currentExecution.id || currentExecution.executionId;

    logs.push({
      id: `start-${execId}`,
      message: `Agent execution started (ID: ${execId || 'unknown'})`,
      timestamp: new Date(baseTimestamp).toLocaleTimeString(),
      type: 'info',
      isLive: false,
      executionId: execId
    });

    if (currentExecution.currentPhase) {
      logs.push({
        id: `phase-${execId}`,
        message: `Current phase: ${currentExecution.currentPhase}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'status_update',
        isLive: false,
        executionId: execId
      });
    }

    if (currentExecution.activeAgentCards) {
      Object.values(currentExecution.activeAgentCards).forEach((agentCard: any, index) => {
        logs.push({
          id: `agent-card-${index}`,
          message: `Agent ${agentCard.name || agentCard.role} (${agentCard.status || 'active'})`,
          timestamp: new Date(Date.now() + index * 1000).toLocaleTimeString(),
          type: 'agent_execution',
          isLive: false,
          agentRole: agentCard.role,
          executionId: execId
        });
      });
    }

    if (currentExecution.errors?.length) {
      currentExecution.errors.forEach((error, index) => {
        logs.push({
          id: `error-${index}`,
          message: error,
          timestamp: new Date(Date.now() + 2000 + index * 1000).toLocaleTimeString(),
          type: 'error',
          isLive: false,
          executionId: execId
        });
      });
    }

    return logs;
  }, [currentExecution]);

  const databaseLogs: LangGraphLog[] = useMemo(() => {
    if (!executionId) return [];
    
    const formattedLogs = getFormattedLogs(executionId);
    return formattedLogs.map(log => ({
      id: log.id,
      message: log.message,
      timestamp: log.timestamp,
      type: log.log_type as any,
      isLive: false,
      agentRole: log.agent_role,
      toolName: log.tool_name,
      executionId: log.execution_id
    }));
  }, [executionId, getFormattedLogs]);

  const liveStreamLogs: LangGraphLog[] = useMemo(() => {
    return streamUpdates.map((update, index) => ({
      id: `stream-${index}`,
      message: update,
      timestamp: new Date().toLocaleTimeString(),
      type: 'info' as const,
      isLive: true,
      executionId
    }));
  }, [streamUpdates, executionId]);

  const filteredLogs = useMemo(() => {
    let allLogs = [...databaseLogs, ...historicalLogs, ...logs, ...liveStreamLogs];
    
    allLogs = allLogs.filter((log, index, self) => 
      index === self.findIndex(l => l.message === log.message && l.timestamp === log.timestamp)
    );
    
    if (selectedLogLevel !== 'all') {
      allLogs = allLogs.filter(log => log.type === selectedLogLevel);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allLogs = allLogs.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.agentRole?.toLowerCase().includes(query) ||
        log.toolName?.toLowerCase().includes(query)
      );
    }
    
    return allLogs.sort((a, b) => {
      if (a.isLive && !b.isLive) return 1;
      if (!a.isLive && b.isLive) return -1;
      return a.timestamp.localeCompare(b.timestamp);
    });
  }, [databaseLogs, historicalLogs, logs, liveStreamLogs, selectedLogLevel, searchQuery]);

  const logTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      counts[log.type] = (counts[log.type] || 0) + 1;
    });
    return counts;
  }, [filteredLogs]);

  const handleRefresh = useCallback(() => {
    setLogs([]);
    setStreamUpdates([]);
    if (executionId) {
      loadLogsByExecution(executionId);
    }
  }, [executionId, loadLogsByExecution]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleExportLogs = useCallback(() => {
    const logData = filteredLogs.map(log => ({
      timestamp: log.timestamp,
      type: log.type,
      message: log.message,
      agentRole: log.agentRole,
      toolName: log.toolName,
      isLive: log.isLive,
      executionId: log.executionId
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
                        { id: 'agent.logs.summary', defaultMessage: '{total} logs ({database} database, {historical} historical, {live} live)' }, 
                        { 
                          total: filteredLogs.length,
                          database: databaseLogs.length,
                          historical: historicalLogs.filter(log => selectedLogLevel === 'all' || log.type === selectedLogLevel).length, 
                          live: (logs.length + liveStreamLogs.length) 
                        }
                      )}
                    </Typography>
                  </Box>
                </Stack>
                
                <Stack direction="row" spacing={1}>
                  <Tooltip title={intl.formatMessage({ id: 'agent.logs.export', defaultMessage: 'Export Logs' })}>
                    <IconButton size="small" onClick={handleExportLogs} disabled={filteredLogs.length === 0}>
                      <Download fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title={intl.formatMessage({ id: 'agent.logs.refresh', defaultMessage: 'Refresh Logs' })}>
                    <IconButton size="small" onClick={handleRefresh}>
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title={autoScroll ? 'Disable Auto-scroll' : 'Enable Auto-scroll'}>
                    <IconButton 
                      size="small" 
                      onClick={() => setAutoScroll(!autoScroll)}
                      color={autoScroll ? 'primary' : 'default'}
                    >
                      {autoScroll ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                    </IconButton>
                  </Tooltip>
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
              {(() => {
                const historicalLogs = filteredLogs.filter(log => !log.isLive);
                if (historicalLogs.length === 0) return null;
                
                return (
                  <Box>
                    <Divider sx={{ my: 2 }}>
                      <Chip
                        label={`${intl.formatMessage({ id: 'agent.logs.historicalLogs', defaultMessage: 'Historical Logs' })} (${historicalLogs.length})`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ 
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          cursor: 'default'
                        }}
                      />
                    </Divider>
                    
                    <Stack spacing={1}>
                      {historicalLogs.map((log) => {
                        const logTypeProps = getLogTypeProps(log.type);
                        
                        return (
                          <Paper
                            key={log.id}
                            variant="outlined"
                            sx={{ 
                              p: 0,
                              backgroundColor: 'background.paper',
                              borderColor: 'divider',
                              borderRadius: 2,
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.action.hover, 0.04),
                                borderColor: alpha(theme.palette.action.hover, 0.2)
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
                                  
                                  {log.agentRole && (
                                    <Chip 
                                      label={getTranslatedAgentRole(log.agentRole) || log.agentRole} 
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
                );
              })()}

              {(() => {
                const liveLogs = filteredLogs.filter(log => log.isLive);
                if (liveLogs.length === 0) return null;
                
                return (
                  <Box>
                    <Divider sx={{ my: 2 }}>
                      <Chip
                        label={`${intl.formatMessage({ id: 'agent.logs.liveUpdates', defaultMessage: 'Live Updates' })} (${liveLogs.length})`}
                        size="small"
                        color="success"
                        variant="filled"
                        sx={{ 
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          cursor: 'default'
                        }}
                      />
                    </Divider>
                    
                    <Stack spacing={1}>
                      {liveLogs.map((log) => {
                        const logTypeProps = getLogTypeProps(log.type);
                        
                        return (
                          <Paper
                            key={log.id}
                            variant="outlined"
                            sx={{ 
                              p: 0,
                              backgroundColor: alpha(theme.palette.success.main, 0.03),
                              borderColor: alpha(theme.palette.success.main, 0.2),
                              borderRadius: 2,
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.success.main, 0.08),
                                borderColor: alpha(theme.palette.success.main, 0.3)
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
                                  
                                  {log.agentRole && (
                                    <Chip 
                                      label={getTranslatedAgentRole(log.agentRole) || log.agentRole} 
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
                );
              })()}
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
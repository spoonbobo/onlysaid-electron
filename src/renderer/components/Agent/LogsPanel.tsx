import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import { BugReport, Analytics, Timeline } from '@mui/icons-material';
import { useIntl } from 'react-intl';

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
  // LangGraph execution data
  currentExecution: {
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

export const LogsPanel: React.FC<LogsPanelProps> = ({
  currentExecution,
  isTaskRunning,
  isTaskActive,
  isFullscreen
}) => {
  const intl = useIntl();
  const [logs, setLogs] = useState<LangGraphLog[]>([]);
  const [streamUpdates, setStreamUpdates] = useState<string[]>([]);

  // Listen for LangGraph stream updates
  useEffect(() => {
    console.log('[LogsPanel] Setting up LangGraph stream listeners...');
    
    const handleStreamUpdate = (event: any, ...args: unknown[]) => {
      const data = args[0] as { update: string };
      console.log('[LogsPanel] 📡 Received stream update:', data.update.substring(0, 100) + '...');
      
      setStreamUpdates(prev => [...prev, data.update]);
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
        executionId: data.executionId
      };
      
      setLogs(prev => [...prev, logEntry]);
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
    };

    // Set up listeners
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
  }, []);

  // Process execution data into historical logs
  const historicalLogs: LangGraphLog[] = React.useMemo(() => {
    if (!currentExecution) return [];

    const logs: LangGraphLog[] = [];
    const baseTimestamp = currentExecution.created_at || new Date().toISOString();

    // Add execution start log
    logs.push({
      id: `start-${currentExecution.executionId}`,
      message: `Agent execution started (ID: ${currentExecution.executionId})`,
      timestamp: new Date(baseTimestamp).toLocaleTimeString(),
      type: 'info',
      isLive: false,
      executionId: currentExecution.executionId
    });

    // Add current phase log
    if (currentExecution.currentPhase) {
      logs.push({
        id: `phase-${currentExecution.executionId}`,
        message: `Current phase: ${currentExecution.currentPhase}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'status_update',
        isLive: false,
        executionId: currentExecution.executionId
      });
    }

    // Add agent logs
    if (currentExecution.activeAgentCards) {
      Object.values(currentExecution.activeAgentCards).forEach((agentCard: any, index) => {
        logs.push({
          id: `agent-card-${index}`,
          message: `Agent ${agentCard.name || agentCard.role} (${agentCard.status || 'active'})`,
          timestamp: new Date(Date.now() + index * 1000).toLocaleTimeString(),
          type: 'agent_execution',
          isLive: false,
          agentRole: agentCard.role,
          executionId: currentExecution.executionId
        });
      });
    }

    // Add error logs
    if (currentExecution.errors?.length) {
      currentExecution.errors.forEach((error, index) => {
        logs.push({
          id: `error-${index}`,
          message: error,
          timestamp: new Date(Date.now() + 2000 + index * 1000).toLocaleTimeString(),
          type: 'error',
          isLive: false,
          executionId: currentExecution.executionId
        });
      });
    }

    return logs;
  }, [currentExecution]);

  // Process stream updates into live logs
  const liveStreamLogs: LangGraphLog[] = React.useMemo(() => {
    return streamUpdates.map((update, index) => ({
      id: `stream-${index}`,
      message: update,
      timestamp: new Date().toLocaleTimeString(),
      type: 'info' as const,
      isLive: true
    }));
  }, [streamUpdates]);

  // Combine all logs
  const allLogs = [...historicalLogs, ...logs, ...liveStreamLogs]
    .sort((a, b) => {
      // Sort live logs after historical logs, but maintain chronological order within each group
      if (a.isLive && !b.isLive) return 1;
      if (!a.isLive && b.isLive) return -1;
      return a.timestamp.localeCompare(b.timestamp);
    });

  // Get log type counts for chips
  const logTypeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allLogs.forEach(log => {
      counts[log.type] = (counts[log.type] || 0) + 1;
    });
    return counts;
  }, [allLogs]);

  return (
    <Box
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {allLogs.length > 0 ? (
        <Stack spacing={2} sx={{ height: '100%', overflow: 'hidden' }}>
          {/* Header */}
          <Paper 
            elevation={1} 
            sx={{ 
              p: 2, 
              flexShrink: 0
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Timeline color="primary" />
                <Typography variant="subtitle2">
                  {intl.formatMessage({ id: 'agent.logs.total' }, { count: allLogs.length })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({historicalLogs.length} historical, {logs.length + liveStreamLogs.length} live)
                </Typography>
              </Stack>
              
              {/* Log type chips */}
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {Object.entries(logTypeCounts).map(([logType, count]) => {
                  if (count === 0) return null;
                  
                  const getChipProps = (type: string) => {
                    switch (type) {
                      case 'error':
                        return { color: 'error' as const, icon: '❌' };
                      case 'warning':
                        return { color: 'warning' as const, icon: '⚠️' };
                      case 'tool_request':
                        return { color: 'info' as const, icon: '🔧' };
                      case 'tool_result':
                        return { color: 'success' as const, icon: '✅' };
                      case 'agent_execution':
                        return { color: 'secondary' as const, icon: '🤖' };
                      case 'synthesis':
                        return { color: 'primary' as const, icon: '🔮' };
                      case 'status_update':
                        return { color: 'default' as const, icon: '📊' };
                      default:
                        return { color: 'default' as const, icon: 'ℹ️' };
                    }
                  };
                  
                  const chipProps = getChipProps(logType);
                  
                  return (
                    <Chip
                      key={logType}
                      label={`${chipProps.icon} ${logType} (${count})`}
                      size="small"
                      variant="outlined"
                      color={chipProps.color}
                    />
                  );
                })}
              </Stack>
            </Stack>
          </Paper>
          
          {/* Scrollable logs container */}
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              maxHeight: isFullscreen ? 'calc(100vh - 350px)' : '400px',
            }}
          >
            <Stack spacing={1}>
              {allLogs.map((log, index) => {
                const isFirst = index === 0;
                const isNewSection = index > 0 && allLogs[index - 1].isLive !== log.isLive;
                
                return (
                  <Box key={log.id}>
                    {/* Section divider */}
                    {(isFirst || isNewSection) && (
                      <Box sx={{ my: 1 }}>
                        <Divider>
                          <Typography variant="caption" color="text.secondary">
                            {log.isLive ? 'Live Updates' : 'Historical Logs'}
                          </Typography>
                        </Divider>
                      </Box>
                    )}
                    
                    <Paper
                      variant="outlined"
                      sx={{ 
                        p: 2,
                        backgroundColor: log.isLive ? 'action.hover' : 'background.paper'
                      }}
                    >
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 120 }}>
                          <Typography variant="caption" color="text.secondary">
                            {log.timestamp}
                          </Typography>
                          {log.isLive && (
                            <Chip label="LIVE" size="small" color="success" variant="filled" />
                          )}
                          {log.agentRole && (
                            <Chip label={log.agentRole} size="small" variant="outlined" />
                          )}
                        </Stack>
                        <Typography
                          variant="body2"
                          sx={{ 
                            wordBreak: 'break-word',
                            flexGrow: 1
                          }}
                        >
                          {log.message}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      ) : (
        <Paper sx={{ 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Stack alignItems="center" spacing={3} sx={{ p: 4 }}>
            {(isTaskRunning || isTaskActive) ? (
              <>
                <CircularProgress />
                <Typography variant="h6" color="text.secondary">
                  {intl.formatMessage({ id: 'agent.status.initializing' })}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {intl.formatMessage({ id: 'agent.logs.waitingForActivity' })}
                </Typography>
              </>
            ) : (
              <>
                <Analytics sx={{ fontSize: 48, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary">
                  {intl.formatMessage({ id: 'agent.noRecentActivity' })}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {intl.formatMessage({ id: 'agent.logs.waitingForActivity' })}
                </Typography>
                {currentExecution && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      {intl.formatMessage({ id: 'agent.logs.viewingHistorical' })}
                      <br />
                      {intl.formatMessage({ id: 'agent.logs.executionDate' }, { 
                        date: new Date(currentExecution.created_at || Date.now()).toLocaleString() 
                      })}
                    </Typography>
                  </Paper>
                )}
              </>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}; 
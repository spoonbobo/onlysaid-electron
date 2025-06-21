import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material';
import { BugReport, Analytics } from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { ExecutionGraph } from '@/renderer/stores/Agent/AgentTaskStore';

interface LogsPanelProps {
  currentGraph: ExecutionGraph | null;
  currentTaskUpdates: string[];
  isTaskRunning: boolean;
  isTaskActive: boolean;
  currentTaskStatus: string;
  currentExecution: any;
  statusInfo: any;
  isFullscreen: boolean;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({
  currentGraph,
  currentTaskUpdates,
  isTaskRunning,
  isTaskActive,
  currentTaskStatus,
  currentExecution,
  statusInfo,
  isFullscreen
}) => {
  const theme = useTheme();
  const intl = useIntl();

  // Format logs logic
  const historicalLogs = currentGraph?.logs || [];
  const liveUpdates = currentTaskUpdates || [];

  const formattedHistoricalLogs = historicalLogs.map(log => {
    const timestamp = new Date(log.created_at).toLocaleTimeString();
    let formattedMessage = log.message;
    
    if (log.agent_role) {
      formattedMessage = `[${log.agent_role}] ${formattedMessage}`;
    }
    
    if (log.tool_name && log.log_type === 'tool_request') {
      formattedMessage = `🔧 ${formattedMessage} (${log.tool_name})`;
    } else if (log.tool_name && log.log_type === 'tool_result') {
      formattedMessage = `✅ ${formattedMessage} (${log.tool_name})`;
    } else if (log.log_type === 'error') {
      formattedMessage = `❌ ${formattedMessage}`;
    } else if (log.log_type === 'warning') {
      formattedMessage = `⚠️ ${formattedMessage}`;
    } else if (log.log_type === 'status_update') {
      formattedMessage = `📊 ${formattedMessage}`;
    } else if (log.log_type === 'info') {
      formattedMessage = `ℹ️ ${formattedMessage}`;
    }
    
    return {
      id: log.id,
      message: formattedMessage,
      timestamp,
      type: log.log_type,
      isHistorical: true
    };
  });
  
  const formattedLiveUpdates = liveUpdates.map((update, index) => ({
    id: `live-${index}`,
    message: update,
    timestamp: new Date().toLocaleTimeString(),
    type: 'info' as const,
    isHistorical: false
  }));
  
  const allLogs = [...formattedHistoricalLogs, ...formattedLiveUpdates]
    .sort((a, b) => {
      if (a.isHistorical && !b.isHistorical) return -1;
      if (!a.isHistorical && b.isHistorical) return 1;
      return a.timestamp.localeCompare(b.timestamp);
    });

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
          {/* Simplified logs header */}
          <Paper 
            elevation={1} 
            sx={{ 
              p: 2, 
              flexShrink: 0
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <BugReport color="primary" />
                <Typography variant="subtitle2">
                  {intl.formatMessage({ id: 'osswarm.logs.total' }, { count: allLogs.length })}
                </Typography>
                {historicalLogs.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    ({historicalLogs.length} {intl.formatMessage({ id: 'osswarm.logs.historical' })}, {liveUpdates.length} {intl.formatMessage({ id: 'osswarm.logs.live' })})
                  </Typography>
                )}
              </Stack>
              
              {/* Simplified log type filter chips */}
              {historicalLogs.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {['info', 'status_update', 'tool_request', 'tool_result', 'warning', 'error'].map(logType => {
                    const count = historicalLogs.filter(log => log.log_type === logType).length;
                    if (count === 0) return null;
                    
                    return (
                      <Chip
                        key={logType}
                        label={`${logType} (${count})`}
                        size="small"
                        variant="outlined"
                        color={
                          logType === 'error' ? 'error' :
                          logType === 'warning' ? 'warning' :
                          logType === 'tool_request' || logType === 'tool_result' ? 'info' :
                          'default'
                        }
                      />
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>
          
          {/* Simplified scrollable logs container */}
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              maxHeight: isFullscreen ? 'calc(100vh - 350px)' : '400px',
            }}
          >
            <Stack spacing={1}>
              {allLogs.map((log, index) => (
                <Paper
                  key={log.id}
                  variant="outlined"
                  sx={{ p: 2 }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        {log.timestamp}
                      </Typography>
                      {log.isHistorical && (
                        <Chip label="HIST" size="small" />
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
              ))}
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
                  {currentTaskStatus === 'initializing' 
                    ? intl.formatMessage({ id: 'osswarm.status.initializing' })
                    : intl.formatMessage({ id: 'osswarm.status.coordinating' })
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {intl.formatMessage({ id: 'osswarm.logs.waitingForActivity' })}
                </Typography>
              </>
            ) : (
              <>
                <Analytics sx={{ fontSize: 48, color: 'text.disabled' }} />
                <Typography variant="h6" color="text.secondary">
                  {statusInfo.text}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  {intl.formatMessage({ id: 'osswarm.noRecentActivity' })}
                </Typography>
                {currentExecution && currentExecution.status !== 'running' && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      {intl.formatMessage({ id: 'osswarm.logs.viewingHistorical' })}
                      <br />
                      {intl.formatMessage({ id: 'osswarm.logs.executionDate' }, { 
                        date: new Date(currentExecution.created_at).toLocaleString() 
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
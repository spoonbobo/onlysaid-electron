import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Stack,
  Card,
  CardContent,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Box,
  useTheme,
  alpha
} from '@mui/material';
import {
  History,
  Close,
  Refresh,
  DeleteForever,
  Warning,
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { toast } from '@/utils/toast';
import { OSSwarmExecution } from '@/renderer/stores/Agent/task/types';

interface TaskHistoryProps {
  open: boolean;
  onClose: () => void;
  executions: OSSwarmExecution[];
  onSelectExecution: (executionId: string) => void;
  onDeleteExecution: (executionId: string) => Promise<void>;
  onForceDeleteExecution?: (executionId: string) => Promise<void>;
  onRefreshHistory?: () => Promise<void>;
  onNukeAll?: () => Promise<void>;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({
  open,
  onClose,
  executions,
  onSelectExecution,
  onDeleteExecution,
  onForceDeleteExecution,
  onRefreshHistory,
  onNukeAll
}) => {
  const theme = useTheme();
  const intl = useIntl();
  
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const formatExecutionForDisplay = (execution: OSSwarmExecution) => {
    const date = new Date(execution.created_at);
    const timeAgo = getTimeAgo(date);
    const startTime = new Date(execution.created_at).getTime();
    const endTime = execution.completed_at ? new Date(execution.completed_at).getTime() : null;
    const duration = endTime ? 
      Math.round((endTime - startTime) / 1000) : 
      Math.round((Date.now() - startTime) / 1000);
    
    return {
      ...execution,
      displayTime: timeAgo,
      displayDuration: formatDuration(duration),
      displayDescription: execution.task_description.length > 50 
        ? execution.task_description.substring(0, 47) + '...'
        : execution.task_description
    };
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return intl.formatMessage({ id: 'time.justNow' });
    if (diffMins < 60) return intl.formatMessage({ id: 'time.minutesAgo' }, { minutes: diffMins });
    if (diffHours < 24) return intl.formatMessage({ id: 'time.hoursAgo' }, { hours: diffHours });
    if (diffDays < 7) return intl.formatMessage({ id: 'time.daysAgo' }, { days: diffDays });
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ fontSize: 16 }} />;
      case 'failed':
        return <ErrorIcon sx={{ fontSize: 16 }} />;
      case 'running':
        return <PlayArrow sx={{ fontSize: 16 }} />;
      case 'pending':
        return <Warning sx={{ fontSize: 16 }} />;
      default:
        return <History sx={{ fontSize: 16 }} />;
    }
  };

  const handleDeleteExecution = async (executionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      setDeleteError(null);
      setDeletingId(executionId);
      await onDeleteExecution(executionId);
      toast.success('Execution deleted successfully');
    } catch (error: any) {
      console.error('Error deleting execution:', error);
      setDeleteError(error.message || 'Failed to delete execution');
      toast.error('Failed to delete execution');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    if (!onRefreshHistory) return;
    
    try {
      setIsRefreshing(true);
      await onRefreshHistory();
    } catch (error: any) {
      console.error('Error refreshing history:', error);
      toast.error('Failed to refresh history');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleForceDeleteExecution = async (executionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!onForceDeleteExecution) return;
    
    try {
      setDeleteError(null);
      setDeletingId(executionId);
      await onForceDeleteExecution(executionId);
      toast.success('Execution force deleted');
    } catch (error: any) {
      console.error('Error force deleting execution:', error);
      setDeleteError(error.message || 'Failed to force delete execution');
      toast.error('Force delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleNukeAll = async () => {
    if (!onNukeAll) return;
    
    const confirmed = window.confirm('Are you sure you want to delete ALL execution history? This cannot be undone.');
    if (!confirmed) return;
    
    try {
      setDeleteError(null);
      await onNukeAll();
      toast.success('All executions deleted');
    } catch (error: any) {
      console.error('Error nuking all executions:', error);
      setDeleteError(error.message || 'Failed to delete all executions');
      toast.error('Nuke failed');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{ zIndex: 2100 }}
      PaperProps={{
        sx: { 
          minHeight: 600,
          borderRadius: 3,
          bgcolor: 'background.paper'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                flexShrink: 0
              }}
            >
              <History sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h5" fontWeight={600}>
              {intl.formatMessage({ id: 'agent.executionHistory' })}
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={1}>
            {onNukeAll && executions.length > 0 && (
              <Tooltip title={intl.formatMessage({ id: 'agent.deleteExecution' })}>
                <Button
                  onClick={handleNukeAll}
                  color="error"
                  variant="outlined"
                  size="small"
                  startIcon={<DeleteForever />}
                  sx={{ 
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 500,
                    px: 2
                  }}
                >
                  Delete All
                </Button>
              </Tooltip>
            )}

            {onRefreshHistory && (
              <Tooltip title={intl.formatMessage({ id: 'common.refresh' })}>
                <IconButton 
                  onClick={handleRefresh} 
                  disabled={isRefreshing}
                  size="small"
                  sx={{ borderRadius: 1.5 }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}
            
            <IconButton onClick={onClose} size="small" sx={{ borderRadius: 1.5 }}>
              <Close />
            </IconButton>
          </Stack>
        </Stack>
        
        {deleteError && (
          <Stack 
            direction="row" 
            alignItems="center" 
            spacing={1} 
            sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: alpha(theme.palette.error.main, 0.1), 
              borderRadius: 2,
              border: 1,
              borderColor: alpha(theme.palette.error.main, 0.3)
            }}
          >
            <Warning color="error" />
            <Typography variant="body2" color="error.main">
              {deleteError}
            </Typography>
          </Stack>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ 
        p: 3, 
        pt: 2,
        overflow: 'visible'
      }}>
        {executions.length > 0 ? (
          <Stack spacing={1.5} sx={{ py: 1 }}>
            {executions.map((execution, index) => {
              const formatted = formatExecutionForDisplay(execution);
              const isDeleting = deletingId === execution.id;
              
              return (
                <Card
                  key={execution.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: theme.shadows[4],
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => onSelectExecution(execution.id)}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Tooltip title={execution.task_description} placement="top">
                              <Typography 
                                variant="subtitle1" 
                                fontWeight={600} 
                                sx={{ 
                                  flexGrow: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: 'text.primary',
                                  lineHeight: 1.3,
                                  maxWidth: '100%'
                                }}
                              >
                                {formatted.displayDescription}
                              </Typography>
                            </Tooltip>
                
                            <Chip
                              icon={getStatusIcon(execution.status)}
                              label={execution.status.toUpperCase()}
                              size="small"
                              sx={{ 
                                fontWeight: 600, 
                                borderRadius: 1.5,
                                minWidth: 100,
                                fontSize: '0.75rem',
                                height: 24,
                                '& .MuiChip-label': {
                                  px: 1.5
                                }
                              }}
                              color={
                                execution.status === 'completed' ? 'success' :
                                execution.status === 'failed' ? 'error' :
                                execution.status === 'running' ? 'primary' :
                                execution.status === 'pending' ? 'warning' :
                                'default'
                              }
                              variant={execution.status === 'failed' ? 'filled' : 'outlined'}
                            />
                          </Stack>
                          
                          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              {formatted.displayTime}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Duration: {formatted.displayDuration}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {execution.total_agents} {intl.formatMessage({ id: 'agent.agents' })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {execution.total_tool_executions} {intl.formatMessage({ id: 'agent.tools' })}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                      
                      <Stack 
                        direction="row" 
                        spacing={1.5}
                        alignItems="center"
                        sx={{ 
                          flexShrink: 0,
                          ml: 2
                        }}
                      >
                        <Button
                          onClick={(e) => handleDeleteExecution(execution.id, e)}
                          color="error"
                          variant="outlined"
                          size="small"
                          disabled={isDeleting}
                          sx={{ 
                            textTransform: 'none',
                            minWidth: 75,
                            height: 32,
                            borderRadius: 1.5,
                            fontWeight: 500,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.error.main, 0.1)
                            }
                          }}
                        >
                          {isDeleting ? '...' : 'Delete'}
                        </Button>
                        
                        {onForceDeleteExecution && (
                          <Button
                            onClick={(e) => handleForceDeleteExecution(execution.id, e)}
                            color="error"
                            variant="text"
                            size="small"
                            disabled={isDeleting}
                            sx={{ 
                              textTransform: 'none',
                              minWidth: 85,
                              height: 32,
                              borderRadius: 1.5,
                              fontWeight: 500,
                              '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.1)
                              }
                            }}
                          >
                            Force Delete
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        ) : (
          <Card sx={{ 
            bgcolor: alpha(theme.palette.grey[50], 0.5),
            borderRadius: 3,
            border: 2,
            borderColor: alpha(theme.palette.grey[300], 0.3),
            borderStyle: 'dashed'
          }}>
            <CardContent>
              <Stack alignItems="center" spacing={3} sx={{ py: 6 }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.grey[400], 0.1),
                    border: 2,
                    borderColor: alpha(theme.palette.grey[400], 0.2),
                    borderStyle: 'dashed'
                  }}
                >
                  <History sx={{ fontSize: 32, color: 'text.disabled' }} />
                </Box>
                <Typography variant="h6" color="text.secondary" fontWeight={500}>
                  {intl.formatMessage({ id: 'agent.noExecutionHistory' })}
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 350 }}>
                  {intl.formatMessage({ id: 'agent.executionHistoryDescription' })}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TaskHistory;

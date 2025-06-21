import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Paper,
  Card,
  CardContent,
  Button,
  IconButton,
  ButtonGroup,
  Tooltip,
  Chip,
  Box,
  useTheme,
  alpha
} from '@mui/material';
import {
  History,
  Delete,
  Visibility,
  Close,
  Refresh,
  CleaningServices,
  Warning,
  DeleteForever
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { OSSwarmExecution } from '@/renderer/stores/Agent/AgentTaskStore';
import { toast } from '@/utils/toast';

interface TaskHistoryProps {
  open: boolean;
  onClose: () => void;
  executions: OSSwarmExecution[];
  onSelectExecution: (executionId: string) => void;
  onDeleteExecution: (executionId: string) => void;
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

  const formatExecutionForDisplay = (execution: OSSwarmExecution) => {
    const date = new Date(execution.created_at);
    const timeAgo = getTimeAgo(date);
    
    return {
      ...execution,
      displayTime: timeAgo,
      displayDescription: execution.task_description.length > 60 
        ? execution.task_description.substring(0, 57) + '...'
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

  const handleDeleteExecution = async (executionId: string) => {
    try {
      setDeleteError(null);
      await onDeleteExecution(executionId);
      
      if (onRefreshHistory) {
        await onRefreshHistory();
      }
      
      toast.success('Execution deleted successfully');
    } catch (error: any) {
      console.error('Error deleting execution:', error);
      setDeleteError(error.message || 'Failed to delete execution');
      toast.error('Failed to delete execution. Try force delete.');
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

  const handleForceDeleteExecution = async (executionId: string) => {
    if (!onForceDeleteExecution) return;
    
    try {
      setDeleteError(null);
      await onForceDeleteExecution(executionId);
      toast.success('Execution deleted');
    } catch (error: any) {
      console.error('Error force deleting execution:', error);
      setDeleteError(error.message || 'Failed to delete execution');
      toast.error('Delete failed');
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
              {intl.formatMessage({ id: 'osswarm.executionHistory' })}
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={1}>
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
      
      <DialogContent sx={{ p: 3 }}>
        {executions.length > 0 ? (
          <Stack spacing={2}>
            {executions.map((execution) => {
              const formatted = formatExecutionForDisplay(execution);
              return (
                <Card
                  key={execution.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: theme.shadows[6],
                      borderColor: 'primary.main',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack spacing={1.5}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography 
                              variant="subtitle1" 
                              fontWeight={600} 
                              sx={{ 
                                flexGrow: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {formatted.displayDescription}
                            </Typography>
                            <Chip
                              label={execution.status.toUpperCase()}
                              size="small"
                              sx={{ 
                                fontWeight: 600, 
                                borderRadius: 2,
                                minWidth: 90,
                                textAlign: 'center'
                              }}
                              color={
                                execution.status === 'completed' ? 'success' :
                                execution.status === 'failed' ? 'error' :
                                execution.status === 'running' ? 'primary' :
                                'default'
                              }
                            />
                          </Stack>
                          
                          <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              📅 {formatted.displayTime}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              🤖 {execution.total_agents} {intl.formatMessage({ id: 'osswarm.agents' })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              📋 {execution.total_tasks} {intl.formatMessage({ id: 'osswarm.tasks' })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              🔧 {execution.total_tool_executions} {intl.formatMessage({ id: 'osswarm.tools' })}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                      
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        alignItems="center"
                        sx={{ flexShrink: 0 }}
                      >
                        <Tooltip title={intl.formatMessage({ id: 'osswarm.viewExecution' })}>
                          <IconButton
                            onClick={() => onSelectExecution(execution.id)}
                            color="primary"
                            size="medium"
                            sx={{ 
                              borderRadius: 2,
                              width: 40,
                              height: 40,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2)
                              }
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Button
                          onClick={() => handleDeleteExecution(execution.id)}
                          color="error"
                          variant="outlined"
                          size="small"
                          sx={{ 
                            textTransform: 'none',
                            minWidth: 80,
                            height: 32,
                            borderRadius: 2,
                            fontWeight: 500
                          }}
                        >
                          Delete
                        </Button>
                        
                        <Button
                          onClick={() => handleForceDeleteExecution(execution.id)}
                          color="error"
                          variant="text"
                          size="small"
                          sx={{ 
                            textTransform: 'none',
                            minWidth: 90,
                            height: 32,
                            borderRadius: 2,
                            fontWeight: 500,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.error.main, 0.1)
                            }
                          }}
                        >
                          Force Delete
                        </Button>
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
              <Stack alignItems="center" spacing={3} sx={{ py: 8 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
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
                  <History sx={{ fontSize: 40, color: 'text.disabled' }} />
                </Box>
                <Typography variant="h5" color="text.secondary" fontWeight={500}>
                  {intl.formatMessage({ id: 'osswarm.noExecutionHistory' })}
                </Typography>
                <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 400 }}>
                  {intl.formatMessage({ id: 'osswarm.executionHistoryDescription' })}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1, bgcolor: alpha(theme.palette.grey[50], 0.3) }}>
        <Stack direction="row" spacing={2} sx={{ width: '100%' }} alignItems="center">
          {onNukeAll && (
            <Button
              onClick={handleNukeAll}
              color="error"
              variant="outlined"
              startIcon={<DeleteForever />}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                height: 40
              }}
            >
              Delete All
            </Button>
          )}
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Button 
            onClick={onClose}
            variant="contained"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 4,
              height: 40,
              minWidth: 100
            }}
          >
            {intl.formatMessage({ id: 'common.close' })}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default TaskHistory;

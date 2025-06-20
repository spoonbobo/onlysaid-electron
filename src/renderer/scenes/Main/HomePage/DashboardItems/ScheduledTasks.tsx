import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemIcon, Checkbox, IconButton, Button, Chip, Menu, MenuItem, Tabs, Tab, Alert, CircularProgress } from "@mui/material";
import { useIntl } from "react-intl";
import { useState, useEffect } from "react";
import { Add, CheckCircle, RadioButtonUnchecked, Event, MoreVert, Notifications, AccountTree, OpenInNew, PlayArrow, Pause, Schedule } from "@mui/icons-material";
import { useUserTokenStore } from "@/renderer/stores/User/UserToken";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
}

interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  lastExecution?: Date;
  nextExecution?: Date;
  tags?: string[];
}

function ScheduledTasks() {
  const intl = useIntl();
  const { n8nConnected, n8nApiUrl, n8nApiKey } = useUserTokenStore();
  
  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [n8nWorkflows, setN8nWorkflows] = useState<N8nWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [viewMode, setViewMode] = useState<'today' | 'upcoming' | 'all'>('today');
  const [activeTab, setActiveTab] = useState(0); // 0: Tasks, 1: N8n Workflows

  // Load N8n workflows when connected
  useEffect(() => {
    if (n8nConnected && activeTab === 1) {
      loadN8nWorkflows();
    }
  }, [n8nConnected, activeTab]);

  const loadN8nWorkflows = async () => {
    if (!n8nConnected || !n8nApiUrl || !n8nApiKey) return;

    setLoadingWorkflows(true);
    setWorkflowError(null);

    try {
      // Pass the required parameters
      const result = await (window as any).electron?.n8nApi?.getWorkflows({
        apiUrl: n8nApiUrl,
        apiKey: n8nApiKey
      });
      
      if (result?.success) {
        setN8nWorkflows(result.workflows || []);
      } else {
        setWorkflowError(result?.error || 'Failed to load workflows');
      }
    } catch (error) {
      console.error('Error loading N8n workflows:', error);
      setWorkflowError('Failed to connect to N8n');
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const handleTaskToggle = (taskId: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  };

  const handleAddTask = () => {
    console.log('Add new task');
  };

  const handleOpenN8n = () => {
    if (n8nApiUrl) {
      // Remove /api/v1 from URL for web interface
      const webUrl = n8nApiUrl.replace('/api/v1', '');
      (window as any).electron?.shell?.openExternal(webUrl);
    }
  };

  const handleWorkflowToggle = async (workflowId: string, currentState: boolean) => {
    if (!n8nApiUrl || !n8nApiKey) return;

    try {
      const result = await (window as any).electron?.n8nApi?.toggleWorkflow({
        apiUrl: n8nApiUrl,
        apiKey: n8nApiKey,
        workflowId,
        active: !currentState
      });
      
      if (result?.success) {
        setN8nWorkflows(prev => 
          prev.map(workflow => 
            workflow.id === workflowId 
              ? { ...workflow, active: !currentState }
              : workflow
          )
        );
      }
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  const handleViewMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleViewMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleViewModeChange = (mode: 'today' | 'upcoming' | 'all') => {
    setViewMode(mode);
    handleViewMenuClose();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getFilteredTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch (viewMode) {
      case 'today':
        return tasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() === today.getTime();
        });
      case 'upcoming':
        return tasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate);
          return taskDate > today;
        });
      case 'all':
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();
  const completedCount = filteredTasks.filter(task => task.completed).length;

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'today': return intl.formatMessage({ id: 'tasks.today', defaultMessage: 'Today' });
      case 'upcoming': return intl.formatMessage({ id: 'tasks.upcoming', defaultMessage: 'Upcoming' });
      case 'all': return intl.formatMessage({ id: 'tasks.all', defaultMessage: 'All Tasks' });
    }
  };

  const formatExecutionTime = (date?: Date) => {
    if (!date) return null;
    return new Intl.DateTimeFormat('en', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const TasksTabContent = () => (
    <>
      {/* Tasks Summary */}
      {filteredTasks.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {intl.formatMessage(
              { 
                id: 'tasks.summary', 
                defaultMessage: '{completed} of {total} tasks completed' 
              },
              { 
                completed: completedCount,
                total: filteredTasks.length
              }
            )}
          </Typography>
        </Box>
      )}

      {/* Tasks List */}
      <Box sx={{ 
        height: 200, 
        overflow: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default'
      }}>
        {filteredTasks.length === 0 ? (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: 3,
            textAlign: 'center'
          }}>
            <Event sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 1, color: 'text.secondary' }}>
              {intl.formatMessage({ 
                id: 'tasks.noTasks', 
                defaultMessage: 'No tasks scheduled' 
              })}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              {intl.formatMessage({ 
                id: 'tasks.emptyStateDescription', 
                defaultMessage: 'Stay organized with tasks and reminders' 
              })}
            </Typography>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<Add />}
              onClick={handleAddTask}
            >
              {intl.formatMessage({ 
                id: 'tasks.addFirst', 
                defaultMessage: 'Add your first task' 
              })}
            </Button>
          </Box>
        ) : (
          <List dense sx={{ p: 1 }}>
            {filteredTasks.map((task) => (
              <ListItem 
                key={task.id}
                sx={{ 
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: task.completed ? 'action.hover' : 'background.paper',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleTaskToggle(task.id)}
                    color={task.completed ? 'success' : 'default'}
                  >
                    {task.completed ? <CheckCircle /> : <RadioButtonUnchecked />}
                  </IconButton>
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Typography 
                      variant="body2"
                      sx={{
                        textDecoration: task.completed ? 'line-through' : 'none',
                        color: task.completed ? 'text.secondary' : 'text.primary'
                      }}
                    >
                      {task.title}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {task.dueDate && (
                        <Chip
                          label={formatExecutionTime(task.dueDate)}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                      {task.priority && (
                        <Chip
                          label={task.priority}
                          size="small"
                          color={getPriorityColor(task.priority) as any}
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                    </Box>
                  }
                  disableTypography
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </>
  );

  const N8nTabContent = () => (
    <>
      {/* N8n Connection Status */}
      {!n8nConnected ? (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button 
              size="small" 
              onClick={() => window.location.hash = '#/settings/userAPIKeys'}
            >
              {intl.formatMessage({ 
                id: 'n8n.connectN8n', 
                defaultMessage: 'Connect N8n' 
              })}
            </Button>
          }
        >
          {intl.formatMessage({ 
            id: 'n8n.connectInstanceMessage', 
            defaultMessage: 'Connect your N8n instance to view and manage scheduled workflows' 
          })}
        </Alert>
      ) : (
        <>
          {/* N8n Actions */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNew />}
              onClick={handleOpenN8n}
            >
              {intl.formatMessage({ 
                id: 'n8n.openN8n', 
                defaultMessage: 'Open N8n' 
              })}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AccountTree />}
              onClick={loadN8nWorkflows}
              disabled={loadingWorkflows}
            >
              {loadingWorkflows 
                ? intl.formatMessage({ 
                    id: 'n8n.loading', 
                    defaultMessage: 'Loading...' 
                  })
                : intl.formatMessage({ 
                    id: 'n8n.refresh', 
                    defaultMessage: 'Refresh' 
                  })
              }
            </Button>
          </Box>

          {/* Workflows List */}
          <Box sx={{ 
            height: 200, 
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.default'
          }}>
            {loadingWorkflows ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress size={24} />
              </Box>
            ) : workflowError ? (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="error">
                  {workflowError}
                </Typography>
                <Button size="small" onClick={loadN8nWorkflows} sx={{ mt: 1 }}>
                  {intl.formatMessage({ 
                    id: 'n8n.retry', 
                    defaultMessage: 'Retry' 
                  })}
                </Button>
              </Box>
            ) : n8nWorkflows.length === 0 ? (
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                p: 3,
                textAlign: 'center'
              }}>
                <AccountTree sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" sx={{ mb: 1, color: 'text.secondary' }}>
                  {intl.formatMessage({ 
                    id: 'n8n.noWorkflowsFound', 
                    defaultMessage: 'No workflows found' 
                  })}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                  {intl.formatMessage({ 
                    id: 'n8n.createWorkflowsMessage', 
                    defaultMessage: 'Create workflows in N8n to see them here' 
                  })}
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<OpenInNew />}
                  onClick={handleOpenN8n}
                >
                  {intl.formatMessage({ 
                    id: 'n8n.openN8n', 
                    defaultMessage: 'Open N8n' 
                  })}
                </Button>
              </Box>
            ) : (
              <List dense sx={{ p: 1 }}>
                {n8nWorkflows.map((workflow) => (
                  <ListItem 
                    key={workflow.id}
                    sx={{ 
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleWorkflowToggle(workflow.id, workflow.active)}
                        color={workflow.active ? 'success' : 'default'}
                      >
                        {workflow.active ? <PlayArrow /> : <Pause />}
                      </IconButton>
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {workflow.name}
                          </Typography>
                          <Chip
                            label={workflow.active 
                              ? intl.formatMessage({ 
                                  id: 'n8n.active', 
                                  defaultMessage: 'Active' 
                                })
                              : intl.formatMessage({ 
                                  id: 'n8n.inactive', 
                                  defaultMessage: 'Inactive' 
                                })
                            }
                            size="small"
                            color={workflow.active ? 'success' : 'default'}
                            sx={{ fontSize: '0.7rem', height: 18 }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          {workflow.lastExecution && (
                            <Chip
                              label={intl.formatMessage(
                                { 
                                  id: 'n8n.lastExecution', 
                                  defaultMessage: 'Last: {time}' 
                                },
                                { time: formatExecutionTime(workflow.lastExecution) }
                              )}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.65rem', height: 18 }}
                            />
                          )}
                          {workflow.nextExecution && (
                            <Chip
                              label={intl.formatMessage(
                                { 
                                  id: 'n8n.nextExecution', 
                                  defaultMessage: 'Next: {time}' 
                                },
                                { time: formatExecutionTime(workflow.nextExecution) }
                              )}
                              size="small"
                              variant="outlined"
                              color="primary"
                              icon={<Schedule sx={{ fontSize: '0.8rem !important' }} />}
                              sx={{ fontSize: '0.65rem', height: 18 }}
                            />
                          )}
                        </Box>
                      }
                      disableTypography
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </>
      )}
    </>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography 
          variant="h6" 
          component="h2" 
          sx={{ 
            color: 'text.primary',
            fontWeight: 'medium'
          }}
        >
          {intl.formatMessage({ 
            id: 'homepage.scheduledTasks', 
            defaultMessage: 'Scheduled Tasks & Automation' 
          })}
        </Typography>
        
        <Box>
          {activeTab === 0 && (
            <>
              <Chip 
                label={getViewModeLabel()}
                size="small"
                variant="outlined"
                onClick={handleViewMenuClick}
                sx={{ mr: 1 }}
              />
              <IconButton onClick={handleAddTask} size="small" color="primary">
                <Add />
              </IconButton>
            </>
          )}
          
          <IconButton onClick={handleViewMenuClick} size="small">
            <MoreVert />
          </IconButton>
          
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleViewMenuClose}
          >
            {activeTab === 0 && [
              <MenuItem key="today" onClick={() => handleViewModeChange('today')}>
                {intl.formatMessage({ id: 'tasks.today', defaultMessage: 'Today' })}
              </MenuItem>,
              <MenuItem key="upcoming" onClick={() => handleViewModeChange('upcoming')}>
                {intl.formatMessage({ id: 'tasks.upcoming', defaultMessage: 'Upcoming' })}
              </MenuItem>,
              <MenuItem key="all" onClick={() => handleViewModeChange('all')}>
                {intl.formatMessage({ id: 'tasks.all', defaultMessage: 'All Tasks' })}
              </MenuItem>
            ]}
          </Menu>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab 
          label="Manual Tasks" 
          icon={<Event />} 
          iconPosition="start"
          sx={{ minHeight: 36, textTransform: 'none' }}
        />
        <Tab 
          label="N8n Workflows" 
          icon={<AccountTree />} 
          iconPosition="start"
          sx={{ minHeight: 36, textTransform: 'none' }}
        />
      </Tabs>

      {/* Tab Content */}
      {activeTab === 0 ? <TasksTabContent /> : <N8nTabContent />}
    </Box>
  );
}

export default ScheduledTasks;

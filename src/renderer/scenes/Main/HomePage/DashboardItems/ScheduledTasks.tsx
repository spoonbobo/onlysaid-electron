import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemIcon, Checkbox, IconButton, Button, Chip, Menu, MenuItem } from "@mui/material";
import { useIntl } from "react-intl";
import { useState } from "react";
import { Add, CheckCircle, RadioButtonUnchecked, Event, MoreVert, Notifications } from "@mui/icons-material";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
}

function ScheduledTasks() {
  const intl = useIntl();
  
  // Mock tasks data - replace with real store later
  const [tasks, setTasks] = useState<Task[]>([
    // Empty for now to show the empty state
  ]);
  
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [viewMode, setViewMode] = useState<'today' | 'upcoming' | 'all'>('today');

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
    // This would open a task creation dialog
    console.log('Add new task');
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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
              defaultMessage: 'Scheduled Tasks & Reminders' 
            })}
          </Typography>
          
          <Chip 
            label={getViewModeLabel()}
            size="small"
            variant="outlined"
            onClick={handleViewMenuClick}
            sx={{ ml: 1 }}
          />
        </Box>
        
        <Box>
          <IconButton onClick={handleAddTask} size="small" color="primary">
            <Add />
          </IconButton>
          
          <IconButton onClick={handleViewMenuClick} size="small">
            <MoreVert />
          </IconButton>
          
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleViewMenuClose}
          >
            <MenuItem onClick={() => handleViewModeChange('today')}>
              {intl.formatMessage({ id: 'tasks.today', defaultMessage: 'Today' })}
            </MenuItem>
            <MenuItem onClick={() => handleViewModeChange('upcoming')}>
              {intl.formatMessage({ id: 'tasks.upcoming', defaultMessage: 'Upcoming' })}
            </MenuItem>
            <MenuItem onClick={() => handleViewModeChange('all')}>
              {intl.formatMessage({ id: 'tasks.all', defaultMessage: 'All Tasks' })}
            </MenuItem>
          </Menu>
        </Box>
      </Box>

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
        height: 240, 
        overflow: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.default'
      }}>
        {filteredTasks.length === 0 ? (
          /* Empty State */
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
          /* Tasks List */
          <List dense sx={{ p: 1 }}>
            {filteredTasks.map((task) => (
              <ListItem 
                key={task.id}
                sx={{ 
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: task.completed ? 'action.hover' : 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
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
                          label={task.dueDate.toLocaleDateString()}
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
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}

export default ScheduledTasks;

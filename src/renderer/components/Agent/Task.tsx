import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  Stack,
  LinearProgress,
  Collapse,
  IconButton,
  Tooltip,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  useTheme
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Task as TaskIcon,
  Person,
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Assignment,
  Psychology,
  Timeline,
  Speed,
  Info as InfoIcon,
  Refresh
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { alpha } from '@mui/material/styles';
import { 
  useTaskManagementStore, 
  useExecutionStore,
  useAgentManagementStore 
} from '@/renderer/stores/Agent/task';
import { OSSwarmTask, DecomposedSubtask } from '@/renderer/stores/Agent/task/types';

interface TaskPanelProps {
  currentExecution: any;
  isTaskRunning: boolean;
  isTaskActive: boolean;
  isFullscreen: boolean;
}

interface TaskCardProps {
  task: OSSwarmTask;
  agentName?: string;
  isSubtask?: boolean;
  onExpandSubtasks?: () => void;
  hasSubtasks?: boolean;
  subtasksExpanded?: boolean;
}

interface DecomposedTaskCardProps {
  subtask: DecomposedSubtask;
  assignedTask?: OSSwarmTask;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  agentName, 
  isSubtask = false, 
  onExpandSubtasks,
  hasSubtasks = false,
  subtasksExpanded = false
}) => {
  const theme = useTheme();
  const intl = useIntl();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return intl.formatMessage({ id: 'common.completed' });
      case 'failed':
        return intl.formatMessage({ id: 'task.failed' });
      case 'running':
        return intl.formatMessage({ id: 'task.running' });
      case 'pending':
        return intl.formatMessage({ id: 'task.pending' });
      default:
        return status;
    }
  };

  const getComplexityLabel = (complexity?: string) => {
    switch (complexity) {
      case 'high':
        return intl.formatMessage({ id: 'task.complexity.high' });
      case 'medium':
        return intl.formatMessage({ id: 'task.complexity.medium' });
      case 'low':
        return intl.formatMessage({ id: 'task.complexity.low' });
      default:
        return complexity || '';
    }
  };

  const formatDateTime = (value: string | number | Date) => {
    const date = new Date(value);
    const datePart = intl.formatDate(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timePart = intl.formatTime(date, { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.palette.success.main;
      case 'failed': return theme.palette.error.main;
      case 'running': return theme.palette.primary.main;
      case 'pending': return theme.palette.grey[500];
      default: return theme.palette.grey[400];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle sx={{ color: theme.palette.success.main }} />;
      case 'failed': return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      case 'running': return <PlayArrow sx={{ color: theme.palette.primary.main }} />;
      case 'pending': return <Schedule sx={{ color: theme.palette.grey[500] }} />;
      default: return <InfoIcon sx={{ color: theme.palette.grey[400] }} />;
    }
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'high': return theme.palette.error.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  const parseJsonField = (field?: string) => {
    if (!field) return [];
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  };

  const requiredSkills = parseJsonField(task.required_skills);
  const suggestedAgentTypes = parseJsonField(task.suggested_agent_types);

  return (
    <Card 
      sx={{ 
        mb: 1,
        ml: isSubtask ? 2 : 0,
        borderLeft: isSubtask ? `3px solid ${getStatusColor(task.status)}` : 'none',
        backgroundColor: isSubtask 
          ? alpha(theme.palette.background.paper, 0.7)
          : theme.palette.background.paper
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          {/* Status Icon */}
          <Box sx={{ mt: 0.5 }}>
            {getStatusIcon(task.status)}
          </Box>

          {/* Main Content */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Header Row */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {intl.formatMessage({ id: isSubtask ? 'task.subtask' : 'task.task' })} #{task.priority || 1}
                </Typography>
                
                {task.estimated_complexity && (
                  <Chip 
                    size="small" 
                    label={getComplexityLabel(task.estimated_complexity)}
                    sx={{ 
                      backgroundColor: alpha(getComplexityColor(task.estimated_complexity), 0.1),
                      color: getComplexityColor(task.estimated_complexity),
                      fontWeight: 500
                    }}
                  />
                )}

                <Chip 
                  size="small" 
                  label={getStatusLabel(task.status)}
                  sx={{ 
                    backgroundColor: alpha(getStatusColor(task.status), 0.1),
                    color: getStatusColor(task.status),
                    fontWeight: 500
                  }}
                />
              </Box>

              {hasSubtasks && (
                <IconButton size="small" onClick={onExpandSubtasks}>
                  {subtasksExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
            </Box>

            {/* Task Description */}
            <Typography variant="body2" sx={{ mb: 1, color: 'text.primary' }}>
              {task.task_description}
            </Typography>

            {/* Agent Assignment */}
            {agentName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {intl.formatMessage({ id: 'task.assignedTo' })} <strong>{agentName}</strong>
                </Typography>
              </Box>
            )}

            {/* Skills and Agent Types */}
            {(requiredSkills.length > 0 || suggestedAgentTypes.length > 0) && (
              <Box sx={{ mb: 1 }}>
                {requiredSkills.length > 0 && (
                  <Box sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Psychology sx={{ fontSize: 14 }} />
                      {intl.formatMessage({ id: 'task.requiredSkills' })}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {requiredSkills.map((skill: string, index: number) => (
                        <Chip 
                          key={index}
                          size="small" 
                          label={skill}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                {suggestedAgentTypes.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Assignment sx={{ fontSize: 14 }} />
                      {intl.formatMessage({ id: 'task.suggestedAgents' })}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {suggestedAgentTypes.map((agentType: string, index: number) => (
                        <Chip 
                          key={index}
                          size="small" 
                          label={agentType}
                          variant="outlined"
                          color="primary"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            )}

            {/* Timing Information */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                {intl.formatMessage({ id: 'task.created' })} {formatDateTime(task.created_at)}
              </Typography>
              
              {task.started_at && (
                <Typography variant="caption" color="text.secondary">
                  {intl.formatMessage({ id: 'task.started' })} {formatDateTime(task.started_at)}
                </Typography>
              )}
              
              {task.completed_at && (
                <Typography variant="caption" color="text.secondary">
                  {intl.formatMessage({ id: 'task.completed' })} {formatDateTime(task.completed_at)}
                </Typography>
              )}
            </Box>

            {/* Assignment Reason */}
            {task.assignment_reason && (
              <Box sx={{ mt: 1, p: 1, backgroundColor: alpha(theme.palette.info.main, 0.05), borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                  {intl.formatMessage({ id: 'task.assignmentReason' })} {task.assignment_reason}
                </Typography>
              </Box>
            )}

            {/* Result */}
            {task.result && (
              <Box sx={{ mt: 1, p: 1, backgroundColor: alpha(theme.palette.success.main, 0.05), borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                  {intl.formatMessage({ id: 'task.result' })}
                </Typography>
                <Typography variant="caption" color="text.primary">
                  {task.result}
                </Typography>
              </Box>
            )}

            {/* Error */}
            {task.error && (
              <Box sx={{ mt: 1, p: 1, backgroundColor: alpha(theme.palette.error.main, 0.05), borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
                  {intl.formatMessage({ id: 'task.error' })}
                </Typography>
                <Typography variant="caption" color="error.main">
                  {task.error}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const DecomposedTaskCard: React.FC<DecomposedTaskCardProps> = ({ subtask, assignedTask }) => {
  const theme = useTheme();
  const intl = useIntl();

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'high': return theme.palette.error.main;
      case 'medium': return theme.palette.warning.main;
      case 'low': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  };

  return (
    <Card sx={{ mb: 1, border: `1px dashed ${theme.palette.divider}` }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Timeline sx={{ color: theme.palette.primary.main, mt: 0.5 }} />
          
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {subtask.id}
              </Typography>
              
              <Chip 
                size="small" 
                label={subtask.estimatedComplexity}
                sx={{ 
                  backgroundColor: alpha(getComplexityColor(subtask.estimatedComplexity), 0.1),
                  color: getComplexityColor(subtask.estimatedComplexity),
                  fontWeight: 500
                }}
              />

              <Chip 
                size="small" 
                label={`${intl.formatMessage({ id: 'task.priority' })} ${subtask.priority}`}
                variant="outlined"
              />

              {assignedTask && (
                <Chip 
                  size="small" 
                  label={intl.formatMessage({ id: 'task.assigned' })}
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>

            <Typography variant="body2" sx={{ mb: 1 }}>
              {subtask.description}
            </Typography>

            {subtask.requiredSkills.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {intl.formatMessage({ id: 'task.requiredSkills' })}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {subtask.requiredSkills.map((skill, index) => (
                    <Chip 
                      key={index}
                      size="small" 
                      label={skill}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {subtask.suggestedAgentTypes.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {intl.formatMessage({ id: 'task.suggestedAgentTypes' })}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {subtask.suggestedAgentTypes.map((agentType, index) => (
                    <Chip 
                      key={index}
                      size="small" 
                      label={agentType}
                      variant="outlined"
                      color="primary"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {subtask.coordinationNotes && (
              <Box sx={{ mt: 1, p: 1, backgroundColor: alpha(theme.palette.info.main, 0.05), borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                  {intl.formatMessage({ id: 'task.coordinationNotes' })} {subtask.coordinationNotes}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export const TaskPanel: React.FC<TaskPanelProps> = ({
  currentExecution,
  isTaskRunning,
  isTaskActive,
  isFullscreen
}) => {
  const theme = useTheme();
  const intl = useIntl();
  
  const { 
    tasks, 
    decomposedTasks, 
    isLoading, 
    error,
    loadTasksByExecution,
    getTaskHierarchy
  } = useTaskManagementStore();
  
  const { agents } = useAgentManagementStore();
  
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showDecomposed, setShowDecomposed] = useState(true);

  // Load tasks when execution changes
  useEffect(() => {
    if (currentExecution?.id) {
      loadTasksByExecution(currentExecution.id);
    }
  }, [currentExecution?.id, loadTasksByExecution]);

  // Get task hierarchy and agent mapping
  const { parents: parentTasks, children: childTasks } = useMemo(() => {
    if (!currentExecution?.id) return { parents: [], children: {} };
    return getTaskHierarchy(currentExecution.id);
  }, [tasks, currentExecution?.id, getTaskHierarchy]);

  const agentMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach(agent => {
      map[agent.id] = agent.role;
    });
    return map;
  }, [agents]);

  const handleToggleSubtasks = (parentId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const running = tasks.filter(t => t.status === 'running').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    
    return { total, completed, failed, running, pending };
  };

  const stats = getTaskStats();

  if (!currentExecution) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}>
        <Typography variant="body2" color="text.secondary">
          {intl.formatMessage({ id: 'agent.tasks.no_execution' })}
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}>
        <Stack alignItems="center" spacing={2}>
          <LinearProgress sx={{ width: 200 }} />
          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage({ id: 'task.loadingTasks' })}
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
        justifyContent: 'center',
        p: 2
      }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: 0, // ✅ Critical for proper flex behavior
      overflow: 'hidden'
    }}>
      {/* ✅ FIXED: Header with stats - properly constrained */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider', 
        flexShrink: 0, // ✅ Prevent header from shrinking
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TaskIcon />
            {intl.formatMessage({ id: 'task.management' })}
          </Typography>
          
          <IconButton 
            size="small" 
            onClick={() => currentExecution?.id && loadTasksByExecution(currentExecution.id)}
            disabled={isLoading}
          >
            <Refresh />
          </IconButton>
        </Box>

        {/* Stats Row */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip 
            size="small" 
            label={`${intl.formatMessage({ id: 'task.total' })} ${stats.total}`}
            variant="outlined"
          />
          <Chip 
            size="small" 
            label={`${intl.formatMessage({ id: 'task.running' })} ${stats.running}`}
            sx={{ 
              backgroundColor: stats.running > 0 ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
              color: stats.running > 0 ? theme.palette.primary.main : 'text.secondary'
            }}
          />
          <Chip 
            size="small" 
            label={`${intl.formatMessage({ id: 'common.completed' })} ${stats.completed}`}
            sx={{ 
              backgroundColor: stats.completed > 0 ? alpha(theme.palette.success.main, 0.1) : 'transparent',
              color: stats.completed > 0 ? theme.palette.success.main : 'text.secondary'
            }}
          />
          <Chip 
            size="small" 
            label={`${intl.formatMessage({ id: 'task.failed' })} ${stats.failed}`}
            sx={{ 
              backgroundColor: stats.failed > 0 ? alpha(theme.palette.error.main, 0.1) : 'transparent',
              color: stats.failed > 0 ? theme.palette.error.main : 'text.secondary'
            }}
          />
          <Chip 
            size="small" 
            label={`${intl.formatMessage({ id: 'task.pending' })} ${stats.pending}`}
            sx={{ 
              backgroundColor: stats.pending > 0 ? alpha(theme.palette.warning.main, 0.1) : 'transparent',
              color: stats.pending > 0 ? theme.palette.warning.main : 'text.secondary'
            }}
          />
        </Stack>

        {/* Progress bar */}
        {stats.total > 0 && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={(stats.completed / stats.total) * 100}
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {Math.round((stats.completed / stats.total) * 100)}% {intl.formatMessage({ id: 'task.complete' })} 
              ({stats.completed}/{stats.total} {intl.formatMessage({ id: 'task.tasks' })})
            </Typography>
          </Box>
        )}
      </Box>

      {/* ✅ FIXED: Content with proper scrolling container */}
      <Box sx={{ 
        flexGrow: 1, 
        minHeight: 0, // ✅ Critical for proper scrolling
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ 
          flexGrow: 1,
          overflow: 'auto', // ✅ Enable scrolling
          p: 2,
          // ✅ Enhanced scrollbar styling
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: alpha(theme.palette.divider, 0.1),
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(theme.palette.text.secondary, 0.3),
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: alpha(theme.palette.text.secondary, 0.5),
            },
          },
        }}>
          {/* Decomposed Tasks Section */}
          {decomposedTasks.length > 0 && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {intl.formatMessage({ id: 'task.decomposedSubtasks' })}
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => setShowDecomposed(!showDecomposed)}
                  endIcon={showDecomposed ? <ExpandLess /> : <ExpandMore />}
                >
                  {intl.formatMessage({ id: showDecomposed ? 'task.hide' : 'task.show' })}
                </Button>
              </Box>
              
              <Collapse in={showDecomposed}>
                <Box sx={{ mb: 3 }}>
                  {decomposedTasks.map((subtask) => {
                    const assignedTask = tasks.find(t => t.subtask_id === subtask.id);
                    return (
                      <DecomposedTaskCard 
                        key={subtask.id}
                        subtask={subtask}
                        assignedTask={assignedTask}
                      />
                    );
                  })}
                </Box>
              </Collapse>
              
              <Divider sx={{ mb: 2 }} />
            </>
          )}

          {/* Assigned Tasks Section */}
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {intl.formatMessage({ id: 'task.assignedTasks' })}
          </Typography>

          {tasks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <TaskIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {intl.formatMessage({ id: 'task.noTasksFound' })}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Parent Tasks */}
              {parentTasks.map((task) => {
                const hasSubtasks = childTasks[task.id]?.length > 0;
                const isExpanded = expandedTasks.has(task.id);
                
                return (
                  <Box key={task.id}>
                    <TaskCard
                      task={task}
                      agentName={agentMap[task.agent_id]}
                      hasSubtasks={hasSubtasks}
                      subtasksExpanded={isExpanded}
                      onExpandSubtasks={() => handleToggleSubtasks(task.id)}
                    />
                    
                    {hasSubtasks && (
                      <Collapse in={isExpanded}>
                        <Box sx={{ ml: 2, mb: 1 }}>
                          {childTasks[task.id].map((subtask) => (
                            <TaskCard
                              key={subtask.id}
                              task={subtask}
                              agentName={agentMap[subtask.agent_id]}
                              isSubtask
                            />
                          ))}
                        </Box>
                      </Collapse>
                    )}
                  </Box>
                );
              })}

              {/* Orphaned Tasks (tasks without parent) */}
              {tasks.filter(t => !t.parent_task_id && !parentTasks.find(p => p.id === t.id)).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  agentName={agentMap[task.agent_id]}
                />
              ))}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TaskPanel;

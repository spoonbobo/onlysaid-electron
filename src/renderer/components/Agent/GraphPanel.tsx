import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  useTheme,
  alpha
} from '@mui/material';
import { Timeline, History } from '@mui/icons-material';
import { useIntl } from 'react-intl';
import ExecutionGraphComponent from './ExecutionGraph';
import { 
  ExecutionGraph, 
  useExecutionStore, 
  useExecutionGraphStore,
  useAgentManagementStore,
  useTaskManagementStore
} from '@/renderer/stores/Agent/task';

interface GraphPanelProps {
  currentGraph: ExecutionGraph | null;
  hasExecutionGraph: boolean;
  isTaskRunning: boolean;
  isTaskActive: boolean;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onShowHistory: () => void;
}

export const GraphPanel: React.FC<GraphPanelProps> = ({
  currentGraph,
  hasExecutionGraph,
  isTaskRunning,
  isTaskActive,
  isFullscreen,
  onFullscreenToggle,
  onShowHistory
}) => {
  const theme = useTheme();
  const intl = useIntl();
  const [liveGraph, setLiveGraph] = useState<ExecutionGraph | null>(currentGraph);

  // Store hooks
  const { currentExecution } = useExecutionStore();
  const { refreshCurrentExecutionGraph } = useExecutionGraphStore();
  const { updateAgentStatus } = useAgentManagementStore();
  const { updateTaskStatus } = useTaskManagementStore();

  // ✅ Set up real-time graph updates
  useEffect(() => {
    if (!currentGraph) {
      setLiveGraph(null);
      return;
    }

    // Start with current graph
    setLiveGraph(currentGraph);

    // Set up real-time listeners for agent, task, and tool updates
    const handleAgentUpdate = (data: any) => {
      console.log('[GraphPanel] Agent update received:', data);
      setLiveGraph(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          agents: prev.agents.map(agent => {
            // ✅ FIX: Better agent matching logic
            const isMatch = agent.id === data.agentCard?.id || 
                           agent.agent_id === data.agentCard?.id ||
                           agent.id === data.executionId ||
                           (data.agentCard?.role && agent.role === data.agentCard.role);
            
            if (isMatch) {
              console.log('[GraphPanel] ✅ Updating agent in graph:', {
                agentId: agent.id,
                oldStatus: agent.status,
                newStatus: data.status,
                currentTask: data.currentTask
              });

              // ✅ ADD: Persist the live update to database
              updateAgentStatus(agent.id, data.status, data.currentTask).catch(error => {
                console.error('[GraphPanel] Failed to persist agent status update:', error);
              });
              
              return { 
                ...agent, 
                status: data.status || agent.status,
                current_task: data.currentTask || agent.current_task
              };
            }
            return agent;
          })
        };
      });
    };

    const handleExecutionUpdate = (data: any) => {
      console.log('[GraphPanel] Execution update received:', data);
      setLiveGraph(prev => {
        if (!prev || prev.execution.id !== data.executionId) return prev;
        
        return {
          ...prev,
          execution: {
            ...prev.execution,
            status: data.status || prev.execution.status
          }
        };
      });
    };

    const handleTaskUpdate = (data: any) => {
      console.log('[GraphPanel] Task update received:', data);
      setLiveGraph(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          tasks: prev.tasks.map(task => {
            if (task.id === data.taskId) {
              // ✅ ADD: Persist the live update to database
              updateTaskStatus(task.id, data.status, data.result, data.error).catch(error => {
                console.error('[GraphPanel] Failed to persist task status update:', error);
              });

              return { 
                ...task, 
                status: data.status || task.status,
                result: data.result || task.result,
                error: data.error || task.error
              };
            }
            return task;
          })
        };
      });
    };

    // ✅ Register IPC listeners for real-time updates
    const unsubscribeAgentUpdate = window.electron?.ipcRenderer?.on?.('agent:agent_updated', (event, data) => {
      handleAgentUpdate(data);
    });

    const unsubscribeExecutionUpdate = window.electron?.ipcRenderer?.on?.('agent:execution_updated', (event, data) => {
      handleExecutionUpdate(data);
    });

    const unsubscribeTaskUpdate = window.electron?.ipcRenderer?.on?.('agent:task_updated', (event, data) => {
      handleTaskUpdate(data);
    });

    // ✅ Set up periodic refresh for live data
    let refreshInterval: NodeJS.Timeout | null = null;
    if (isTaskRunning || isTaskActive) {
      refreshInterval = setInterval(() => {
        if (currentExecution?.id) {
          // ✅ FIX: Only refresh database data, don't overwrite live graph
          console.log('[GraphPanel] Periodic refresh - fetching fresh database data...');
          refreshCurrentExecutionGraph();
          // Don't immediately update liveGraph here - let the useEffect handle it
        }
      }, 5000); // ✅ Increase interval to 5 seconds to reduce conflicts
    }

    return () => {
      unsubscribeAgentUpdate?.();
      unsubscribeExecutionUpdate?.();
      unsubscribeTaskUpdate?.();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [currentGraph, isTaskRunning, isTaskActive, currentExecution, refreshCurrentExecutionGraph, updateAgentStatus, updateTaskStatus]);

  // ✅ Update live graph when currentGraph changes, but preserve live agent statuses
  useEffect(() => {
    if (!currentGraph) {
      setLiveGraph(null);
      return;
    }

    // ✅ FIX: Merge database data with live updates instead of overwriting
    setLiveGraph(prev => {
      if (!prev) {
        console.log('[GraphPanel] Setting initial graph from database');
        return currentGraph;
      }

      // ✅ Preserve live agent statuses when merging database updates
      const mergedGraph = {
        ...currentGraph,
        agents: currentGraph.agents.map(dbAgent => {
          // Find corresponding live agent
          const liveAgent = prev.agents.find(live => 
            live.id === dbAgent.id || 
            live.agent_id === dbAgent.agent_id ||
            live.role === dbAgent.role
          );

          // If live agent has a more recent status update, keep it
          if (liveAgent && ['busy', 'running', 'executing', 'completed'].includes(liveAgent.status || '')) {
            console.log('[GraphPanel] Preserving live agent status:', {
              agentId: liveAgent.id,
              liveStatus: liveAgent.status,
              dbStatus: dbAgent.status
            });
            return {
              ...dbAgent,
              status: liveAgent.status,
              current_task: liveAgent.current_task || dbAgent.current_task
            };
          }

          return dbAgent;
        })
      };

      console.log('[GraphPanel] Merged database update with live data');
      return mergedGraph;
    });
  }, [currentGraph]);

  const handleRefresh = useCallback(() => {
    if (currentExecution?.id) {
      console.log('[GraphPanel] Refreshing execution graph for:', currentExecution.id);
      refreshCurrentExecutionGraph();
    } else {
      console.warn('[GraphPanel] No current execution to refresh');
    }
  }, [currentExecution, refreshCurrentExecutionGraph]);

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {hasExecutionGraph ? (
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex',
          minHeight: 0,
          position: 'relative'
        }}>
          <ExecutionGraphComponent
            graph={liveGraph}
            isLive={isTaskRunning || isTaskActive}
            fullscreen={isFullscreen}
            onFullscreenToggle={onFullscreenToggle}
            onRefresh={handleRefresh}
          />
        </Box>
      ) : (
        <Card sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          flexGrow: 1,
          bgcolor: alpha(theme.palette.grey[50], 0.5),
          borderRadius: 3
        }}>
          <CardContent>
            <Stack alignItems="center" spacing={3} sx={{ py: 6 }}>
              <Timeline sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography variant="h5" color="text.secondary" fontWeight={500}>
                {intl.formatMessage({ id: 'agent.graph.noExecutionGraph' })}
              </Typography>
              <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 400 }}>
                {intl.formatMessage({ id: 'agent.graph.startOrSelectFromHistory' })}
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<History />}
                onClick={onShowHistory}
                sx={{ 
                  mt: 2,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5
                }}
              >
                {intl.formatMessage({ id: 'agent.viewHistory' })}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}; 
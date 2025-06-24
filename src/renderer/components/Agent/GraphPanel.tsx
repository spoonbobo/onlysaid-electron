import React, { useCallback, useEffect, useState, useMemo } from 'react';
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
  useRealtimeStore
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
  const { handleAgentUpdate, handleTaskUpdate, handleExecutionUpdate, handleToolExecutionUpdate } = useRealtimeStore();

  // ✅ FIXED: Real-time updates similar to LogsPanel approach
  useEffect(() => {
    if (!currentGraph) {
      setLiveGraph(null);
      return;
    }

    // Start with current graph
    setLiveGraph(currentGraph);

    console.log('[GraphPanel] Setting up real-time listeners for execution:', currentGraph.execution.id);

    // ✅ FIXED: Direct real-time update handlers (similar to LogsPanel)
    const handleAgentUpdateLocal = (data: any) => {
      console.log('[GraphPanel] 🤖 Real-time agent update received:', {
        agentCard: data.agentCard,
        status: data.status,
        executionId: data.executionId
      });
      
      // ✅ FIXED: Better agent ID extraction from agentCard
      let agentId = data.agentId;
      if (!agentId && data.agentCard) {
        // Try to match by role first, then by id/name
        const matchingAgent = currentGraph.agents.find(agent => 
          agent.role === data.agentCard.role ||
          agent.agent_id === data.agentCard.id ||
          agent.id === data.agentCard.id ||
          agent.role === data.agentCard.name
        );
        agentId = matchingAgent?.id;
        
        console.log('[GraphPanel] 🔍 Agent ID lookup:', {
          searchRole: data.agentCard.role,
          searchId: data.agentCard.id,
          searchName: data.agentCard.name,
          foundAgentId: agentId,
          availableAgents: currentGraph.agents.map(a => ({ id: a.id, role: a.role, agent_id: a.agent_id }))
        });
      }
      
      if (!agentId) {
        console.warn('[GraphPanel] ❌ Could not determine agent ID from update:', data);
        return;
      }
      
      // ✅ Update centralized store first
      handleAgentUpdate({
        executionId: data.executionId || currentGraph.execution.id,
        agentId: agentId,
        status: data.status,
        currentTask: data.currentTask
      });

      // ✅ FIXED: Update live graph immediately (like LogsPanel accumulates logs)
      setLiveGraph(prev => {
        if (!prev || prev.execution.id !== (data.executionId || currentGraph.execution.id)) {
          return prev;
        }
        
        console.log('[GraphPanel] 🔄 Updating live graph state...');
        const updatedGraph = {
          ...prev,
          agents: prev.agents.map(agent => {
            // ✅ IMPROVED: Use the resolved agent ID for matching
            if (agent.id === agentId) {
              console.log('[GraphPanel] ✅ Updating agent in live graph:', {
                agentId: agent.id,
                agentRole: agent.role,
                oldStatus: agent.status,
                newStatus: data.status,
                currentTask: data.currentTask
              });
              
              return { 
                ...agent, 
                status: data.status || agent.status,
                current_task: data.currentTask || agent.current_task,
                // ✅ Add timestamp to track update freshness
                last_updated: new Date().toISOString()
              };
            }
            return agent;
          })
        };
        
        return updatedGraph;
      });
    };

    const handleExecutionUpdateLocal = (data: any) => {
      console.log('[GraphPanel] ⚡ Real-time execution update received:', data);
      
      // ✅ Update centralized store first
      handleExecutionUpdate({
        executionId: data.executionId,
        status: data.status,
        result: data.result,
        error: data.error
      });

      // ✅ FIXED: Update live graph immediately
      setLiveGraph(prev => {
        if (!prev || prev.execution.id !== data.executionId) {
          return prev;
        }
        
        return {
          ...prev,
          execution: {
            ...prev.execution,
            status: data.status || prev.execution.status,
            result: data.result || prev.execution.result,
            error: data.error || prev.execution.error,
            // ✅ Add completion timestamp
            completed_at: (data.status === 'completed' || data.status === 'failed') 
              ? new Date().toISOString() 
              : prev.execution.completed_at
          }
        };
      });
    };

    const handleTaskUpdateLocal = (data: any) => {
      console.log('[GraphPanel] 📋 Real-time task update received:', data);
      
      // ✅ Update centralized store first
      handleTaskUpdate({
        executionId: data.executionId || currentGraph.execution.id,
        taskId: data.taskId,
        status: data.status,
        result: data.result,
        error: data.error
      });

      // ✅ FIXED: Update live graph immediately
      setLiveGraph(prev => {
        if (!prev || prev.execution.id !== (data.executionId || currentGraph.execution.id)) {
          return prev;
        }
        
        return {
          ...prev,
          tasks: prev.tasks.map(task => {
            if (task.id === data.taskId) {
              return { 
                ...task, 
                status: data.status || task.status,
                result: data.result || task.result,
                error: data.error || task.error,
                completed_at: (data.status === 'completed' || data.status === 'failed') 
                  ? new Date().toISOString() 
                  : task.completed_at
              };
            }
            return task;
          })
        };
      });
    };

    const handleToolExecutionUpdateLocal = (data: any) => {
      console.log('[GraphPanel] 🔧 Real-time tool execution update received:', data);
      
      // ✅ Update centralized store first
      handleToolExecutionUpdate({
        executionId: data.executionId || currentGraph.execution.id,
        toolExecutionId: data.toolExecutionId,
        status: data.status,
        result: data.result,
        error: data.error,
        executionTime: data.executionTime
      });

      // ✅ FIXED: Update live graph immediately
      setLiveGraph(prev => {
        if (!prev || prev.execution.id !== (data.executionId || currentGraph.execution.id)) {
          return prev;
        }
        
        return {
          ...prev,
          toolExecutions: prev.toolExecutions.map(toolExec => {
            if (toolExec.id === data.toolExecutionId) {
              return { 
                ...toolExec, 
                status: data.status || toolExec.status,
                result: data.result || toolExec.result,
                error: data.error || toolExec.error,
                execution_time: data.executionTime || toolExec.execution_time,
                completed_at: (data.status === 'completed' || data.status === 'failed') 
                  ? new Date().toISOString() 
                  : toolExec.completed_at
              };
            }
            return toolExec;
          })
        };
      });
    };

    // ✅ Register IPC listeners for real-time updates
    const unsubscribeAgentUpdate = window.electron?.ipcRenderer?.on?.('agent:agent_updated', (event, data) => {
      handleAgentUpdateLocal(data);
    });

    const unsubscribeExecutionUpdate = window.electron?.ipcRenderer?.on?.('agent:execution_updated', (event, data) => {
      handleExecutionUpdateLocal(data);
    });

    const unsubscribeTaskUpdate = window.electron?.ipcRenderer?.on?.('agent:task_updated', (event, data) => {
      handleTaskUpdateLocal(data);
    });

    const unsubscribeToolUpdate = window.electron?.ipcRenderer?.on?.('agent:tool_execution_updated', (event, data) => {
      handleToolExecutionUpdateLocal(data);
    });

    // ✅ FIXED: COMPLETELY DISABLE auto-refresh during active execution
    // Only allow manual refresh
    let refreshInterval: NodeJS.Timeout | null = null;

    return () => {
      console.log('[GraphPanel] Cleaning up real-time listeners');
      unsubscribeAgentUpdate?.();
      unsubscribeExecutionUpdate?.();
      unsubscribeTaskUpdate?.();
      unsubscribeToolUpdate?.();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [currentGraph, handleAgentUpdate, handleTaskUpdate, handleExecutionUpdate, handleToolExecutionUpdate]);

  // ✅ FIXED: Only sync with database on initial load, not during live updates
  useEffect(() => {
    if (!currentGraph) {
      setLiveGraph(null);
      return;
    }

    // ✅ FIXED: Only set initial graph, don't overwrite during live updates
    setLiveGraph(prev => {
      if (!prev) {
        console.log('[GraphPanel] Setting initial graph from database');
        return currentGraph;
      }

      // ✅ FIXED: Only merge if execution has changed (viewing different execution)
      if (prev.execution.id !== currentGraph.execution.id) {
        console.log('[GraphPanel] Execution changed, loading new graph:', {
          oldId: prev.execution.id,
          newId: currentGraph.execution.id
        });
        return currentGraph;
      }

      // ✅ FIXED: During live execution, keep live graph and ignore database updates
      if (isTaskRunning || isTaskActive) {
        console.log('[GraphPanel] 🔒 Execution is active - preserving live graph state');
        return prev;
      }

      // ✅ Only merge completed executions from database
      console.log('[GraphPanel] Merging completed execution data from database');
      return currentGraph;
    });
  }, [currentGraph, isTaskRunning, isTaskActive]);

  // ✅ Manual refresh only
  const handleRefresh = useCallback(() => {
    if (currentExecution?.id) {
      console.log('[GraphPanel] 🔄 Manual refresh - fetching execution graph for:', currentExecution.id);
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
            // ✅ Add debug prop to help with troubleshooting
            debug={process.env.NODE_ENV === 'development'}
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
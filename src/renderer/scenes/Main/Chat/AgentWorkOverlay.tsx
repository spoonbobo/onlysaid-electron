import { Box, CircularProgress, Typography, Tabs, Tab, IconButton, Collapse, Button, Alert } from "@mui/material";
import { useEffect, useState } from "react";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useStreamStore } from "@/renderer/stores/Stream/StreamStore";
import { useAgentTaskStore } from "@/renderer/stores/Agent/AgentTaskStore";
import { ExpandLess, ExpandMore, Timeline, List, Stop, Close, Warning } from "@mui/icons-material";
import ExecutionGraphComponent from "@/renderer/components/OSSwarm/ExecutionGraph";

interface AgentWorkOverlayProps {
  visible?: boolean;
}

export default function AgentWorkOverlay({ visible }: AgentWorkOverlayProps) {
  const { isProcessingResponse } = useAgentStore();
  const { aiMode } = useLLMConfigurationStore();
  const { 
    osswarmUpdates, 
    activeOSSwarmTasks, 
    osswarmTaskStatus,
    abortOSSwarmTask, 
    forceStopOSSwarmTask,
    clearOSSwarmUpdates 
  } = useStreamStore();
  const { 
    currentGraph, 
    getCurrentExecutionGraph, 
    currentExecution,
    loadExecutionHistory,
    loadExecutionGraph
  } = useAgentTaskStore();
  
  const [shouldShow, setShouldShow] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAborting, setIsAborting] = useState(false);

  // Get current OSSwarm state
  const currentTaskUpdates = osswarmUpdates['current'] || [];
  const currentTaskStatus = osswarmTaskStatus['current'] || 'idle';
  const isTaskActive = activeOSSwarmTasks['current'] || false;

  // ✅ Enhanced logic for determining when to show overlay
  const isAgentModeActive = aiMode === "agent" && isProcessingResponse;
  const hasOSSwarmUpdates = currentTaskUpdates.length > 0;
  const hasExecutionGraph = currentGraph !== null;
  
  // Check execution status
  const isExecutionRunning = currentGraph?.execution?.status === 'running';
  const isExecutionCompleted = currentGraph?.execution?.status === 'completed' || currentGraph?.execution?.status === 'failed';
  
  // Check task status
  const isTaskRunning = ['initializing', 'running', 'completing'].includes(currentTaskStatus);
  const isTaskCompleted = ['completed', 'failed', 'aborted'].includes(currentTaskStatus);

  // ✅ Load execution history on mount
  useEffect(() => {
    loadExecutionHistory(10);
  }, [loadExecutionHistory]);

  // ✅ Robust logic for showing/hiding overlay
  useEffect(() => {
    const shouldShowOverlay = visible || 
                             isAgentModeActive || 
                             isTaskActive || 
                             isTaskRunning || 
                             isExecutionRunning ||
                             (hasOSSwarmUpdates && !isTaskCompleted) ||
                             (hasExecutionGraph && !isExecutionCompleted);
    
    if (shouldShowOverlay) {
      setShouldShow(true);
    } else if ((isTaskCompleted || isExecutionCompleted) && !isTaskActive && !isAgentModeActive) {
      // Hide after completion with delay based on status
      const delay = currentTaskStatus === 'failed' ? 10000 : 5000; // Show errors longer
      const timer = setTimeout(() => setShouldShow(false), delay);
      return () => clearTimeout(timer);
    } else {
      // Normal hiding with short delay
      const timer = setTimeout(() => setShouldShow(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [
    visible, 
    isAgentModeActive, 
    isTaskActive, 
    isTaskRunning,
    isExecutionRunning, 
    hasOSSwarmUpdates,
    hasExecutionGraph,
    isTaskCompleted, 
    isExecutionCompleted,
    currentTaskStatus
  ]);

  // ✅ Handle abort with loading state
  const handleAbort = async () => {
    setIsAborting(true);
    try {
      await abortOSSwarmTask('current');
    } catch (error) {
      console.error('[AgentWorkOverlay] Error aborting task:', error);
    } finally {
      setIsAborting(false);
    }
  };

  // ✅ Handle force stop
  const handleForceStop = () => {
    forceStopOSSwarmTask('current');
  };

  // ✅ Handle manual close
  const handleClose = () => {
    clearOSSwarmUpdates('current');
    setShouldShow(false);
  };

  // ✅ Enhanced IPC listeners
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron) {
      const handleExecutionUpdated = async (event: any, data: { executionId: string; status: string; result?: string; error?: string }) => {
        console.log('[AgentWorkOverlay] Execution updated:', data);
        
        const currentExecution = useAgentTaskStore.getState().currentExecution;
        if (currentExecution && currentExecution.id === data.executionId) {
          try {
            await loadExecutionGraph(data.executionId);
          } catch (error) {
            console.error('[AgentWorkOverlay] Error refreshing graph:', error);
          }
        }
      };

      const handleExecutionCreated = async (event: any, data: { executionId: string; taskDescription: string; chatId?: string; workspaceId?: string }) => {
        console.log('[AgentWorkOverlay] Execution created notification:', data);
        
        try {
          await loadExecutionGraph(data.executionId);
          console.log('[AgentWorkOverlay] Graph loaded for execution:', data.executionId);
        } catch (error) {
          console.error('[AgentWorkOverlay] Error loading graph:', error);
        }
      };

      const handleAgentCreated = async (event: any, data: { executionId: string; agentId: string; role: string }) => {
        console.log('[AgentWorkOverlay] Agent created notification:', data);
        
        const currentExecution = useAgentTaskStore.getState().currentExecution;
        if (currentExecution && currentExecution.id === data.executionId) {
          try {
            await loadExecutionGraph(data.executionId);
          } catch (error) {
            console.error('[AgentWorkOverlay] Error refreshing graph:', error);
          }
        }
      };

      const handleAgentUpdated = async (event: any, data: { executionId: string; agentId: string; status: string }) => {
        console.log('[AgentWorkOverlay] Agent updated notification:', data);
        
        const currentExecution = useAgentTaskStore.getState().currentExecution;
        if (currentExecution && currentExecution.id === data.executionId) {
          try {
            await loadExecutionGraph(data.executionId);
          } catch (error) {
            console.error('[AgentWorkOverlay] Error refreshing graph:', error);
          }
        }
      };

      const cleanup1 = (window.electron.ipcRenderer as any).on('osswarm:execution_created', handleExecutionCreated);
      const cleanup2 = (window.electron.ipcRenderer as any).on('osswarm:agent_created', handleAgentCreated);
      const cleanup3 = (window.electron.ipcRenderer as any).on('osswarm:agent_updated', handleAgentUpdated);
      const cleanup4 = (window.electron.ipcRenderer as any).on('osswarm:execution_updated', handleExecutionUpdated);

      return () => {
        cleanup1();
        cleanup2();
        cleanup3();
        cleanup4();
      };
    }
  }, []);

  if (!shouldShow) {
    return null;
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // ✅ Get status display info
  const getStatusInfo = () => {
    if (currentTaskStatus === 'failed' || currentGraph?.execution?.status === 'failed') {
      return { text: 'Failed', color: 'error.main', bgColor: 'error.main' };
    }
    if (currentTaskStatus === 'aborted') {
      return { text: 'Aborted', color: 'warning.main', bgColor: 'warning.main' };
    }
    if (currentTaskStatus === 'completed' || currentGraph?.execution?.status === 'completed') {
      return { text: 'Completed', color: 'success.main', bgColor: 'success.main' };
    }
    if (currentTaskStatus === 'completing') {
      return { text: 'Completing', color: 'info.main', bgColor: 'info.main' };
    }
    if (currentTaskStatus === 'running' || isTaskActive) {
      return { text: 'Running', color: 'primary.main', bgColor: 'primary.main' };
    }
    if (currentTaskStatus === 'initializing') {
      return { text: 'Initializing', color: 'primary.main', bgColor: 'primary.main' };
    }
    return { text: 'OSSwarm Active', color: 'primary.main', bgColor: 'primary.main' };
  };

  const statusInfo = getStatusInfo();

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        bgcolor: 'background.paper',
        boxShadow: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: statusInfo.color,
        minWidth: isMinimized ? 300 : 600,
        maxWidth: isMinimized ? 400 : 900,
        maxHeight: isMinimized ? 100 : 700,
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: isMinimized ? 'none' : '1px solid',
          borderColor: 'divider',
          bgcolor: statusInfo.bgColor,
          color: 'primary.contrastText',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {(isTaskRunning || isTaskActive) && !isTaskCompleted && (
            <CircularProgress size={16} sx={{ color: 'inherit' }} />
          )}
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>
            {statusInfo.text}
          </Typography>
          
          {/* ✅ Enhanced action buttons */}
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
            {(isTaskActive || isTaskRunning) && !isAborting && (
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={<Stop />}
                onClick={handleAbort}
                sx={{ 
                  minWidth: 'auto',
                  fontSize: '0.7rem',
                  py: 0.5,
                  px: 1
                }}
              >
                Abort
              </Button>
            )}
            
            {isAborting && (
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<Warning />}
                onClick={handleForceStop}
                sx={{ 
                  minWidth: 'auto',
                  fontSize: '0.7rem',
                  py: 0.5,
                  px: 1
                }}
              >
                Force Stop
              </Button>
            )}
            
            {(isTaskCompleted || (!isTaskActive && !isTaskRunning)) && (
              <IconButton
                size="small"
                onClick={handleClose}
                sx={{ color: 'inherit', p: 0.5 }}
              >
                <Close fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
        
        <IconButton
          size="small"
          onClick={() => setIsMinimized(!isMinimized)}
          sx={{ color: 'inherit' }}
        >
          {isMinimized ? <ExpandMore /> : <ExpandLess />}
        </IconButton>
      </Box>

      <Collapse in={!isMinimized}>
        {/* ✅ Status alert for errors */}
        {currentTaskStatus === 'failed' && (
          <Alert severity="error" sx={{ m: 1 }}>
            OSSwarm execution failed. Check the logs for details.
          </Alert>
        )}
        
        {currentTaskStatus === 'aborted' && (
          <Alert severity="warning" sx={{ m: 1 }}>
            OSSwarm execution was aborted.
          </Alert>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ minHeight: 40 }}
          >
            <Tab 
              icon={<List />} 
              label="Logs" 
              sx={{ minHeight: 40, fontSize: '0.8rem' }}
            />
            <Tab 
              icon={<Timeline />} 
              label="Graph" 
              sx={{ minHeight: 40, fontSize: '0.8rem' }}
              disabled={!hasExecutionGraph}
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ height: 400, overflow: 'hidden' }}>
          {/* Logs Tab */}
          {currentTab === 0 && (
            <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              {currentTaskUpdates.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {currentTaskUpdates.map((update, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 1,
                        borderLeft: '3px solid',
                        borderColor: update.includes('Error') || update.includes('failed') ? 'error.main' :
                                   update.includes('completed') || update.includes('success') ? 'success.main' :
                                   update.includes('approved') ? 'info.main' :
                                   update.includes('aborted') ? 'warning.main' :
                                   'primary.light',
                        bgcolor: update.includes('Error') || update.includes('failed') ? 'error.light' :
                                update.includes('completed') || update.includes('success') ? 'success.light' :
                                update.includes('approved') ? 'info.light' :
                                update.includes('aborted') ? 'warning.light' :
                                'grey.50',
                        borderRadius: 1,
                        mb: 0.5,
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateX(2px)',
                          boxShadow: 1,
                        }
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ 
                          fontSize: '0.75rem',
                          color: 'text.primary',
                          display: 'block',
                          lineHeight: 1.3,
                          fontFamily: 'monospace',
                        }}
                      >
                        <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                          [{new Date().toLocaleTimeString()}]
                        </Box>
                        {' '}
                        {update}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  flexDirection: 'column',
                  gap: 1,
                  color: 'text.secondary'
                }}>
                  {(isTaskRunning || isTaskActive) ? (
                    <>
                      <CircularProgress size={24} />
                      <Typography variant="caption" sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                        {currentTaskStatus === 'initializing' ? "OSSwarm initializing..." : "Agent coordinating swarm..."}
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2">
                        {statusInfo.text}
                      </Typography>
                      <Typography variant="caption">
                        No recent activity
                      </Typography>
                    </>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Graph Tab - remains the same */}
          {currentTab === 1 && (
            <Box sx={{ 
              p: 1, 
              height: '100%', 
              overflow: 'hidden',
              pointerEvents: 'auto'
            }}>
              {hasExecutionGraph ? (
                <ExecutionGraphComponent
                  graph={currentGraph}
                  isLive={isTaskRunning || isTaskActive}
                  width={560}
                  height={360}
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  flexDirection: 'column',
                  gap: 1,
                  color: 'text.secondary'
                }}>
                  <Timeline sx={{ fontSize: 48, opacity: 0.3 }} />
                  <Typography variant="body2">
                    No execution graph available
                  </Typography>
                  <Typography variant="caption">
                    Start an OSSwarm execution to see the live graph
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Footer Stats - enhanced with status */}
        {hasExecutionGraph && currentGraph && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              p: 1,
              bgcolor: 'grey.50',
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Agents
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {currentGraph.agents.length}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Tasks
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {currentGraph.tasks.length}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Tools
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {currentGraph.toolExecutions.length}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight="medium"
                sx={{ 
                  color: currentGraph.execution.status === 'completed' ? 'success.main' :
                         currentGraph.execution.status === 'failed' ? 'error.main' :
                         currentGraph.execution.status === 'running' ? 'info.main' :
                         'text.secondary'
                }}
              >
                {currentGraph.execution.status}
              </Typography>
            </Box>
          </Box>
        )}
      </Collapse>
    </Box>
  );
}

import { 
  Box, 
  CircularProgress, 
  Typography, 
  Tabs, 
  Tab, 
  Collapse, 
  Alert, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Chip, 
  Stack, 
  ButtonGroup, 
  Tooltip, 
  Paper, 
  Card, 
  CardContent, 
  useTheme,
  Button,
  IconButton
} from "@mui/material";
import { useEffect, useState, useRef } from "react";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useStreamStore } from "@/renderer/stores/Stream/StreamStore";
import { useAgentTaskStore } from "@/renderer/stores/Agent/AgentTaskStore";
import { 
  Timeline, 
  List as ListIcon, 
  Warning, 
  Delete, 
  PlayArrow,
  Analytics,
  CheckCircle,
  Error as ErrorIcon,
  Info as InfoIcon
} from "@mui/icons-material";
import { useIntl } from "react-intl";
import { alpha } from "@mui/material/styles";
import { toast } from "@/utils/toast";

// Import sub-components
import { StatusHeader } from './StatusHeader';
import { LogsPanel } from './LogsPanel';
import { GraphPanel } from './GraphPanel';
import { StatsFooter } from './StatsFooter';
import TaskHistory from '../Dialog/Agent/TaskHistory';

interface AgentWorkOverlayProps {
  visible?: boolean;
  onClose?: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  respectParentBounds?: boolean;
  fullscreenMargin?: number;
}

export default function AgentWorkOverlay({ 
  visible, 
  onClose, 
  containerRef,
  respectParentBounds = false,
  fullscreenMargin = 16
}: AgentWorkOverlayProps) {
  const theme = useTheme();
  const intl = useIntl();
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Store hooks
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
    currentExecution,
    executions,
    loadExecutionHistory,
    setCurrentExecution,
    deleteExecution,
    forceDeleteExecution,
    nukeAllExecutions
  } = useAgentTaskStore();
  
  // Local state
  const [shouldShow, setShouldShow] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<string | null>(null);
  const [parentBounds, setParentBounds] = useState<DOMRect | null>(null);

  // Get current OSSwarm state
  const currentTaskUpdates = osswarmUpdates['current'] || [];
  const currentTaskStatus = osswarmTaskStatus['current'] || 'idle';
  const isTaskActive = activeOSSwarmTasks['current'] || false;

  // Enhanced logic for determining when to show overlay
  const isAgentModeActive = aiMode === "agent" && isProcessingResponse;
  const hasOSSwarmUpdates = currentTaskUpdates.length > 0;
  const hasExecutionGraph = currentGraph !== null;
  
  // Check execution status
  const isExecutionRunning = currentGraph?.execution?.status === 'running';
  const isExecutionCompleted = currentGraph?.execution?.status === 'completed' || currentGraph?.execution?.status === 'failed';
  
  // Check task status
  const isTaskRunning = ['initializing', 'running', 'completing'].includes(currentTaskStatus);
  const isTaskCompleted = ['completed', 'failed', 'aborted'].includes(currentTaskStatus);

  // Calculate parent container bounds when fullscreen and respectParentBounds is enabled
  useEffect(() => {
    if (respectParentBounds && containerRef?.current) {
      const updateBounds = () => {
        const bounds = containerRef.current?.getBoundingClientRect();
        setParentBounds(bounds || null);
      };

      updateBounds();
      
      const handleResize = () => updateBounds();
      window.addEventListener('resize', handleResize);
      
      return () => window.removeEventListener('resize', handleResize);
    } else if (!respectParentBounds) {
      setParentBounds(null);
    }
  }, [respectParentBounds, containerRef]);

  // Load execution history on mount
  useEffect(() => {
    loadExecutionHistory(20);
  }, [loadExecutionHistory]);

  // Updated logic - prioritize manual visibility control
  useEffect(() => {
    if (visible !== undefined) {
      setShouldShow(visible);
      return;
    }

    const shouldShowOverlay = isAgentModeActive || 
                             isTaskActive || 
                             isTaskRunning || 
                             isExecutionRunning ||
                             (hasOSSwarmUpdates && !isTaskCompleted) ||
                             (hasExecutionGraph && !isExecutionCompleted);
    
    if (shouldShowOverlay) {
      setShouldShow(true);
    } else if ((isTaskCompleted || isExecutionCompleted) && !isTaskActive && !isAgentModeActive) {
      const delay = currentTaskStatus === 'failed' ? 10000 : 5000;
      const timer = setTimeout(() => setShouldShow(false), delay);
      return () => clearTimeout(timer);
    } else {
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

  // Handler functions
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

  const handleForceStop = () => {
    forceStopOSSwarmTask('current');
  };

  const handleClose = () => {
    clearOSSwarmUpdates('current');
    setShouldShow(false);
    onClose?.();
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleHistorySelect = async (executionId: string) => {
    try {
      await setCurrentExecution(executionId);
      setShowHistoryDialog(false);
      setCurrentTab(1);
    } catch (error) {
      console.error('[AgentWorkOverlay] Error loading historical execution:', error);
    }
  };

  const handleDeleteExecution = async (executionId: string) => {
    try {
      await deleteExecution(executionId);
      setDeleteConfirmDialog(null);
      
      // ✅ Force refresh the history immediately
      await loadExecutionHistory(20);
      
      toast.success('Execution deleted successfully');
    } catch (error) {
      console.error('[AgentWorkOverlay] Error deleting execution:', error);
      toast.error('Failed to delete execution');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Enhanced status info with better MUI theme integration
  const getStatusInfo = () => {
    if (currentTaskStatus === 'failed' || currentGraph?.execution?.status === 'failed') {
      return { 
        text: intl.formatMessage({ id: 'osswarm.status.failed' }), 
        color: theme.palette.error.main,
        bgcolor: theme.palette.error.main,
        icon: <ErrorIcon />,
        severity: 'error' as const
      };
    }
    if (currentTaskStatus === 'aborted') {
      return { 
        text: intl.formatMessage({ id: 'osswarm.status.aborted' }), 
        color: theme.palette.warning.main,
        bgcolor: theme.palette.warning.main,
        icon: <Warning />,
        severity: 'warning' as const
      };
    }
    if (currentTaskStatus === 'completed' || currentGraph?.execution?.status === 'completed') {
      return { 
        text: intl.formatMessage({ id: 'osswarm.status.completed' }), 
        color: theme.palette.success.main,
        bgcolor: theme.palette.success.main,
        icon: <CheckCircle />,
        severity: 'success' as const
      };
    }
    if (currentTaskStatus === 'completing') {
      return { 
        text: intl.formatMessage({ id: 'osswarm.status.completing' }), 
        color: theme.palette.info.main,
        bgcolor: theme.palette.info.main,
        icon: <InfoIcon />,
        severity: 'info' as const
      };
    }
    if (currentTaskStatus === 'running' || isTaskActive) {
      return { 
        text: intl.formatMessage({ id: 'osswarm.status.running' }), 
        color: theme.palette.primary.main,
        bgcolor: theme.palette.primary.main,
        icon: <PlayArrow />,
        severity: 'info' as const
      };
    }
    if (currentTaskStatus === 'initializing') {
      return { 
        text: intl.formatMessage({ id: 'osswarm.status.initializing' }), 
        color: theme.palette.primary.main,
        bgcolor: theme.palette.primary.main,
        icon: <CircularProgress size={16} sx={{ color: 'inherit' }} />,
        severity: 'info' as const
      };
    }
    return { 
      text: intl.formatMessage({ id: 'osswarm.monitor.title' }), 
      color: theme.palette.primary.main,
      bgcolor: theme.palette.primary.main,
      icon: <Analytics />,
      severity: 'info' as const
    };
  };

  const statusInfo = getStatusInfo();

  // Calculate positioning for fullscreen mode
  const getFullscreenStyles = () => {
    if (!isFullscreen) return {};

    if (respectParentBounds && parentBounds) {
      return {
        position: 'fixed' as const,
        top: parentBounds.top + fullscreenMargin,
        left: parentBounds.left + fullscreenMargin,
        right: window.innerWidth - parentBounds.right + fullscreenMargin,
        bottom: window.innerHeight - parentBounds.bottom + fullscreenMargin,
        width: parentBounds.width - (fullscreenMargin * 2),
        height: parentBounds.height - (fullscreenMargin * 2),
        maxWidth: 'none',
        maxHeight: 'none',
        minWidth: 'auto',
        minHeight: 'auto'
      };
    }

    return {
      position: 'fixed' as const,
      top: 0,
      right: 0,
      left: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      minWidth: '100vw',
      minHeight: '100vh'
    };
  };

  // ✅ Simplified force delete handler
  const handleForceDeleteExecution = async (executionId: string) => {
    try {
      await forceDeleteExecution(executionId);
      toast.success('Execution deleted');
    } catch (error) {
      console.error('Force delete failed:', error);
      toast.error('Delete failed');
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {/* Main overlay container - removed animations */}
      <Paper
        ref={overlayRef}
        elevation={isFullscreen ? 0 : 12}
        sx={{
          ...(isFullscreen ? getFullscreenStyles() : {
            position: 'absolute',
            top: 16,
            right: 16,
            minWidth: isMinimized ? 320 : 650,
            maxWidth: isMinimized ? 400 : 950,
            minHeight: 'auto',
            maxHeight: isMinimized ? 80 : '85vh',
          }),
          zIndex: isFullscreen ? 2000 : 1000,
          borderRadius: isFullscreen ? (respectParentBounds ? 2 : 0) : 3,
          border: isFullscreen ? (respectParentBounds ? 2 : 'none') : 2,
          borderColor: statusInfo.color,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isFullscreen ? (respectParentBounds ? theme.shadows[8] : 'none') : theme.shadows[12],
          bgcolor: 'background.paper',
          background: isFullscreen 
            ? 'background.paper'
            : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(statusInfo.color, 0.02)} 100%)`,
        }}
      >
        {/* Status Header Component */}
        <StatusHeader
          statusInfo={statusInfo}
          isTaskRunning={isTaskRunning}
          isTaskActive={isTaskActive}
          isTaskCompleted={isTaskCompleted}
          isAborting={isAborting}
          isFullscreen={isFullscreen}
          isMinimized={isMinimized}
          onShowHistory={() => setShowHistoryDialog(true)}
          onAbort={handleAbort}
          onForceStop={handleForceStop}
          onFullscreenToggle={handleFullscreenToggle}
          onMinimizeToggle={() => setIsMinimized(!isMinimized)}
          onClose={handleClose}
        />

        {/* Collapsible content - removed animations */}
        {!isMinimized && (
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Status alerts - removed animations */}
            {(currentTaskStatus === 'failed' || currentTaskStatus === 'aborted') && (
              <Box sx={{ p: 2, pb: 0 }}>
                <Stack spacing={1}>
                  {currentTaskStatus === 'failed' && (
                    <Alert 
                      severity="error" 
                      variant="filled"
                      sx={{ borderRadius: 2 }}
                      icon={<ErrorIcon />}
                    >
                      {intl.formatMessage({ id: 'osswarm.error.executionFailed' })}
                    </Alert>
                  )}
                  
                  {currentTaskStatus === 'aborted' && (
                    <Alert 
                      severity="warning" 
                      variant="filled"
                      sx={{ borderRadius: 2 }}
                      icon={<Warning />}
                    >
                      {intl.formatMessage({ id: 'osswarm.warning.executionAborted' })}
                    </Alert>
                  )}
                </Stack>
              </Box>
            )}

            {/* Enhanced MUI Tabs */}
            <Paper 
              square 
              elevation={0} 
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                flexShrink: 0
              }}
            >
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{ 
                  minHeight: 56,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.9rem',
                    minHeight: 56
                  }
                }}
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab 
                  icon={<ListIcon />} 
                  label={intl.formatMessage({ id: 'osswarm.tabs.logs' })}
                  iconPosition="start"
                />
                <Tab 
                  icon={<Timeline />} 
                  label={intl.formatMessage({ id: 'osswarm.tabs.graph' })}
                  iconPosition="start"
                  disabled={!hasExecutionGraph}
                />
              </Tabs>
            </Paper>

            {/* Tab content container */}
            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'hidden', 
              display: 'flex', 
              flexDirection: 'column',
              minHeight: 0,
              p: 2
            }}>
              {currentTab === 0 && (
                <LogsPanel
                  currentGraph={currentGraph}
                  currentTaskUpdates={currentTaskUpdates}
                  isTaskRunning={isTaskRunning}
                  isTaskActive={isTaskActive}
                  currentTaskStatus={currentTaskStatus}
                  currentExecution={currentExecution}
                  statusInfo={statusInfo}
                  isFullscreen={isFullscreen}
                />
              )}

              {currentTab === 1 && (
                <GraphPanel
                  currentGraph={currentGraph}
                  hasExecutionGraph={hasExecutionGraph}
                  isTaskRunning={isTaskRunning}
                  isTaskActive={isTaskActive}
                  isFullscreen={isFullscreen}
                  onFullscreenToggle={handleFullscreenToggle}
                  onShowHistory={() => setShowHistoryDialog(true)}
                />
              )}
            </Box>

            {/* Stats Footer */}
            {hasExecutionGraph && currentGraph && (
              <StatsFooter
                currentGraph={currentGraph}
                isFullscreen={isFullscreen}
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Task History Dialog */}
      <TaskHistory
        open={showHistoryDialog}
        onClose={() => setShowHistoryDialog(false)}
        executions={executions}
        onSelectExecution={handleHistorySelect}
        onDeleteExecution={(executionId) => setDeleteConfirmDialog(executionId)}
        onForceDeleteExecution={handleForceDeleteExecution}
        onRefreshHistory={() => loadExecutionHistory(20)}
        onNukeAll={async () => {
          await nukeAllExecutions();
          toast.success('All executions deleted');
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog !== null}
        onClose={() => setDeleteConfirmDialog(null)}
        maxWidth="sm"
        sx={{ zIndex: 2100 }}
        PaperProps={{
          sx: { 
            borderRadius: 3,
            bgcolor: 'background.paper'
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Paper sx={{ p: 1, borderRadius: 2, bgcolor: 'error.light' }}>
              <Delete sx={{ color: 'error.contrastText' }} />
            </Paper>
            <Typography variant="h6" fontWeight={600}>
              {intl.formatMessage({ id: 'osswarm.deleteExecution' })}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pb: 2 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'osswarm.deleteExecutionConfirmation' })}
            </Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage({ id: 'osswarm.deleteExecutionWarning' })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setDeleteConfirmDialog(null)}
            variant="outlined"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
          <Button
            onClick={() => deleteConfirmDialog && handleDeleteExecution(deleteConfirmDialog)}
            color="error"
            variant="contained"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            {intl.formatMessage({ id: 'common.delete' })}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
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
import { useEffect, useState, useRef, useMemo } from "react";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
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
  Info as InfoIcon,
  Person
} from "@mui/icons-material";
import { useIntl } from "react-intl";
import { alpha } from "@mui/material/styles";
import { toast } from "@/utils/toast";
import { useHistoryStore } from '@/renderer/stores/Agent/task/HistoryStore';   // top of file

// Import sub-components
import { StatusHeader } from './StatusHeader';
import { LogsPanel } from './LogsPanel';
import { GraphPanel } from './GraphPanel';
import { StatsFooter } from './StatsFooter';
import TaskHistory from '../Dialog/Agent/TaskHistory';
import AgentCards from './AgentCards';
import { AgentCard as IAgentCard } from '@/../../types/Agent/AgentCard';

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
  const { 
    isProcessingResponse,
    agentTaskUpdates, 
    activeAgentTasks, 
    agentTaskStatus,
    abortAgentTask, 
    forceStopAgentTask,
    clearAgentTaskUpdates 
  } = useAgentStore();
  
  const { aiMode } = useLLMConfigurationStore();
  
  const { 
    currentGraph, 
    currentExecution,
    executions,
    loadExecutionHistory,
    setCurrentExecution,
    deleteExecution,
    forceDeleteExecution,
    nukeAllExecutions,
    getAgentCards,
    getAgentCardsByExecution
  } = useAgentTaskStore();
  
  // Local state
  const [shouldShow, setShouldShow] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAborting, setIsAborting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [parentBounds, setParentBounds] = useState<DOMRect | null>(null);
  
  // ✅ Add agent cards state
  const [showAgentCards, setShowAgentCards] = useState(false);
  const [agentViewMode, setAgentViewMode] = useState<'grid' | 'list'>('grid');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [agentStatusFilter, setAgentStatusFilter] = useState('all');
  const [agentRoleFilter, setAgentRoleFilter] = useState('all');

  // Get current Agent Task state
  const currentTaskUpdates = agentTaskUpdates['current'] || [];
  const currentTaskStatus = agentTaskStatus['current'] || 'idle';
  const isTaskActive = activeAgentTasks['current'] || false;

  // Enhanced logic for determining when to show overlay
  const isAgentModeActive = aiMode === "agent" && isProcessingResponse;
  const hasAgentTaskUpdates = currentTaskUpdates.length > 0;
  const hasExecutionGraph = currentGraph !== null;
  
  // Check execution status
  const isExecutionRunning = currentGraph?.execution?.status === 'running';
  const isExecutionCompleted = currentGraph?.execution?.status === 'completed' || currentGraph?.execution?.status === 'failed';
  
  // Check task status
  const isTaskRunning = ['initializing', 'running', 'completing'].includes(currentTaskStatus);
  const isTaskCompleted = ['completed', 'failed', 'aborted'].includes(currentTaskStatus);

  // ✅ Memoize agent cards
  const agentCards = useMemo(() => {
    if (currentGraph?.execution?.id) {
      return getAgentCardsByExecution(currentGraph.execution.id);
    }
    return getAgentCards();
  }, [currentGraph, getAgentCards, getAgentCardsByExecution]);

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
                             (hasAgentTaskUpdates && !isTaskCompleted) ||
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
    hasAgentTaskUpdates,
    hasExecutionGraph,
    isTaskCompleted, 
    isExecutionCompleted,
    currentTaskStatus
  ]);

  // Handler functions
  const handleAbort = async () => {
    setIsAborting(true);
    try {
      await abortAgentTask('current');
    } catch (error) {
      console.error('[AgentWorkOverlay] Error aborting task:', error);
    } finally {
      setIsAborting(false);
    }
  };

  const handleForceStop = () => {
    forceStopAgentTask('current');
  };

  const handleClose = () => {
    clearAgentTaskUpdates('current');
    setShouldShow(false);
    onClose?.();
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
  };

  // ✅ Enhanced history select with error handling
  const handleHistorySelect = async (executionId: string) => {
    try {
      await setCurrentExecution(executionId);
      setShowHistoryDialog(false);
      setCurrentTab(1);
    } catch (error) {
      console.error('[AgentWorkOverlay] Error loading historical execution:', error);
      
      // ✅ If execution not found, refresh history and show error
      if (error instanceof Error && error.message?.includes('Execution not found')) {
        toast.error('Execution no longer exists. Refreshing history...');
        await loadExecutionHistory(20);
      } else {
        toast.error('Failed to load execution');
      }
    }
  };

  // ✅ Simplified delete handler - let the stores handle state management
  const handleDeleteExecution = async (executionId: string) => {
    try {
      console.log('[AgentWorkOverlay] Deleting execution:', executionId);
      await deleteExecution(executionId);
      toast.success('Execution deleted successfully');
    } catch (error) {
      console.error('[AgentWorkOverlay] Error deleting execution:', error);
      toast.error('Failed to delete execution');
      
      // ✅ Only refresh on error to sync state
      await loadExecutionHistory(20);
    }
  };

  // ✅ Simplified force delete handler
  const handleForceDeleteExecution = async (executionId: string) => {
    try {
      console.log('[AgentWorkOverlay] Force deleting execution:', executionId);
      await forceDeleteExecution(executionId);
      toast.success('Execution deleted');
    } catch (error) {
      console.error('Force delete failed:', error);
      toast.error('Delete failed');
      
      // ✅ Only refresh on error to sync state
      await loadExecutionHistory(20);
    }
  };

  // ✅ Simplified nuke handler
  const handleNukeAll = async () => {
    try {
      console.log('[AgentWorkOverlay] Nuking all executions');
      await nukeAllExecutions();
      toast.success('All executions deleted');
    } catch (error) {
      console.error('Nuke all failed:', error);
      toast.error('Failed to delete all executions');
      
      // ✅ Only refresh on error to sync state
      await loadExecutionHistory(20);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    
    // ✅ Show agent cards when switching to agents tab
    if (newValue === 2) { // Assuming agents tab is index 2
      setShowAgentCards(true);
    }
  };

  // ✅ Add agent card handlers
  const handleAgentSelect = (agentCard: IAgentCard) => {
    console.log('[AgentWorkOverlay] Agent selected:', agentCard);
    // Could navigate to agent details or show agent-specific info
  };

  const handleAgentAction = (action: string, agentCard: IAgentCard) => {
    console.log('[AgentWorkOverlay] Agent action:', action, agentCard);
    
    switch (action) {
      case 'pause':
        // Implement pause agent logic
        break;
      case 'start':
        // Implement start agent logic
        break;
      case 'menu':
        // Show agent context menu
        break;
      default:
        console.warn('Unknown agent action:', action);
    }
  };

  const handleRefreshAgents = () => {
    // Refresh agent data
    loadExecutionHistory(20);
  };

  // Enhanced status info with better MUI theme integration
  const getStatusInfo = () => {
    if (currentTaskStatus === 'failed' || currentGraph?.execution?.status === 'failed') {
      return { 
        text: intl.formatMessage({ id: 'agent.status.failed' }), 
        color: theme.palette.error.main,
        bgcolor: theme.palette.error.main,
        icon: <ErrorIcon />,
        severity: 'error' as const
      };
    }
    if (currentTaskStatus === 'aborted') {
      return { 
        text: intl.formatMessage({ id: 'agent.status.aborted' }), 
        color: theme.palette.warning.main,
        bgcolor: theme.palette.warning.main,
        icon: <Warning />,
        severity: 'warning' as const
      };
    }
    if (currentTaskStatus === 'completed' || currentGraph?.execution?.status === 'completed') {
      return { 
        text: intl.formatMessage({ id: 'agent.status.completed' }), 
        color: theme.palette.success.main,
        bgcolor: theme.palette.success.main,
        icon: <CheckCircle />,
        severity: 'success' as const
      };
    }
    if (currentTaskStatus === 'completing') {
      return { 
        text: intl.formatMessage({ id: 'agent.status.completing' }), 
        color: theme.palette.info.main,
        bgcolor: theme.palette.info.main,
        icon: <InfoIcon />,
        severity: 'info' as const
      };
    }
    if (currentTaskStatus === 'running' || isTaskActive) {
      return { 
        text: intl.formatMessage({ id: 'agent.status.running' }), 
        color: theme.palette.primary.main,
        bgcolor: theme.palette.primary.main,
        icon: <PlayArrow />,
        severity: 'info' as const
      };
    }
    if (currentTaskStatus === 'initializing') {
      return { 
        text: intl.formatMessage({ id: 'agent.status.initializing' }), 
        color: theme.palette.primary.main,
        bgcolor: theme.palette.primary.main,
        icon: <CircularProgress size={16} sx={{ color: 'inherit' }} />,
        severity: 'info' as const
      };
    }
    return { 
      text: intl.formatMessage({ id: 'agent.monitor.title' }), 
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
            minWidth: isMinimized ? 280 : 650,
            maxWidth: isMinimized ? 500 : 950,
            width: isMinimized ? 'auto' : undefined,
            minHeight: isMinimized ? 'auto' : undefined,
            maxHeight: isMinimized ? 'auto' : '85vh',
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
          background: 'background.paper',
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

        {/* Collapsible content */}
        {!isMinimized && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
            bgcolor: 'background.paper'
          }}>
            {/* ✅ Updated Tabs with Agents tab */}
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
                  label={intl.formatMessage({ id: 'agent.tabs.logs' })}
                  iconPosition="start"
                />
                <Tab 
                  icon={<Timeline />} 
                  label={intl.formatMessage({ id: 'agent.tabs.graph' })}
                  iconPosition="start"
                  disabled={!hasExecutionGraph}
                />
                {/* ✅ Add Agents tab */}
                <Tab 
                  icon={<Person />} 
                  label={intl.formatMessage({ id: 'agent.tabs.agents' })}
                  iconPosition="start"
                />
              </Tabs>
            </Paper>

            {/* Tab content container */}
            <Box 
              sx={{ 
                flexGrow: 1, 
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper'
              }}
            >
              {/* Logs Panel */}
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

              {/* Graph Panel */}
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

              {/* ✅ Agents Panel */}
              {currentTab === 2 && (
                <Box sx={{ 
                  flexGrow: 1, 
                  overflow: 'auto',
                  bgcolor: alpha(theme.palette.background.default, 0.3)
                }}>
                  <AgentCards
                    agents={agentCards}
                    loading={isTaskActive || isTaskRunning}
                    viewMode={agentViewMode}
                    onViewModeChange={setAgentViewMode}
                    onAgentSelect={handleAgentSelect}
                    onAgentAction={handleAgentAction}
                    onRefresh={handleRefreshAgents}
                    searchQuery={agentSearchQuery}
                    onSearchChange={setAgentSearchQuery}
                    statusFilter={agentStatusFilter}
                    onStatusFilterChange={setAgentStatusFilter}
                    roleFilter={agentRoleFilter}
                    onRoleFilterChange={setAgentRoleFilter}
                  />
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Stats Footer Component */}
        {currentGraph && (
          <StatsFooter
            currentGraph={currentGraph}
            isFullscreen={isFullscreen}
          />
        )}
      </Paper>

      {/* ✅ TaskHistory Dialog with correct handlers */}
      <TaskHistory
        open={showHistoryDialog}
        onClose={() => setShowHistoryDialog(false)}
        executions={executions}
        onSelectExecution={handleHistorySelect}
        onDeleteExecution={handleDeleteExecution}
        onForceDeleteExecution={handleForceDeleteExecution}
        onRefreshHistory={() => loadExecutionHistory(20)}
        onNukeAll={handleNukeAll}
      />
    </>
  );
}
import { useState, useEffect } from 'react';
import { 
  IconButton, 
  Tooltip
} from '@mui/material';
import { 
  Timeline, 
  TimelineOutlined
} from '@mui/icons-material';
import { useAgentStore } from '@/renderer/stores/Agent/AgentStore';
import { useExecutionStore, useExecutionGraphStore } from '@/renderer/stores/Agent/task';

interface AgentTaskToggleProps {
  disabled?: boolean;
  onToggle?: (show: boolean) => void;
  isOverlayVisible?: boolean;
}

export default function AgentTaskToggle({ 
  disabled = false, 
  onToggle,
  isOverlayVisible = false
}: AgentTaskToggleProps) {
  const [isActive, setIsActive] = useState(false);
  
  const { 
    activeAgentTasks, 
    agentTaskStatus,
    agentTaskUpdates 
  } = useAgentStore();
  
  const { currentExecution } = useExecutionStore();
  const { currentGraph } = useExecutionGraphStore();

  useEffect(() => {
    setIsActive(isOverlayVisible);
  }, [isOverlayVisible]);

  // ✅ Add debugging to see actual values
  useEffect(() => {
    console.log('[AgentTaskToggle] Store state debug:', {
      activeAgentTasks,
      agentTaskStatus,
      agentTaskUpdates,
      currentExecution,
      currentGraph
    });
  }, [activeAgentTasks, agentTaskStatus, agentTaskUpdates, currentExecution, currentGraph]);

  // ✅ Fixed logic with proper null checks and debugging
  const hasActiveTask = activeAgentTasks && Object.keys(activeAgentTasks).length > 0 && Object.values(activeAgentTasks).some(active => active === true);
  const hasRunningTask = agentTaskStatus && Object.keys(agentTaskStatus).length > 0 && Object.values(agentTaskStatus).some(status => 
    status && ['initializing', 'running', 'completing'].includes(status)
  );
  const hasRecentUpdates = agentTaskUpdates && Object.keys(agentTaskUpdates).length > 0 && Object.values(agentTaskUpdates).some(updates => 
    Array.isArray(updates) && updates.length > 0
  );
  const hasCurrentExecution = currentExecution !== null;
  const hasGraph = currentGraph !== null;

  // Determine the current state
  const isRunning = hasActiveTask || hasRunningTask;
  const hasActivity = hasRecentUpdates || hasCurrentExecution || hasGraph;

  // ✅ Add debugging for calculated states
  useEffect(() => {
    console.log('[AgentTaskToggle] Calculated states:', {
      hasActiveTask,
      hasRunningTask,
      hasRecentUpdates,
      hasCurrentExecution,
      hasGraph,
      isRunning,
      hasActivity
    });
  }, [hasActiveTask, hasRunningTask, hasRecentUpdates, hasCurrentExecution, hasGraph, isRunning, hasActivity]);

  // Get status color
  const getStatusColor = () => {
    if (!agentTaskStatus || Object.keys(agentTaskStatus).length === 0) {
      return 'text.secondary';
    }
    
    const currentTaskStatus = agentTaskStatus['current'];
    
    if (currentTaskStatus === 'failed') return 'error.main';
    if (currentTaskStatus === 'completed') return 'success.main';
    if (isRunning) return 'primary.main';
    if (hasActivity) return 'info.main';
    return 'text.secondary';
  };

  const handleToggle = () => {
    const newActiveState = !isActive;
    setIsActive(newActiveState);
    onToggle?.(newActiveState);
  };

  return (
    <Tooltip 
      title={
        isRunning ? "Agent Task is running - Click to view" :
        hasActivity ? "Agent Task activity detected - Click to view" :
        isActive ? "Close Agent Task Monitor" :
        "Open Agent Task Monitor"
      }
      placement="top"
    >
      <IconButton
        size="small"
        onClick={handleToggle}
        disabled={disabled}
        sx={{
          color: isActive ? "primary.main" : getStatusColor(),
          "&:hover": {
            bgcolor: "transparent"
          },
          "&:disabled": {
            color: "text.disabled",
            opacity: 0.5
          }
        }}
      >
        {isActive ? (
          <Timeline fontSize="small" />
        ) : (
          <TimelineOutlined fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}

import { useState, useEffect, useMemo } from 'react';
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

const extractTimestampFromUpdate = (update: string): number | null => {
  const timestampMatch = update.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  if (timestampMatch) {
    return new Date(timestampMatch[1]).getTime();
  }
  return null;
};

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

  const hasActiveTask = useMemo(() => {
    if (!activeAgentTasks || Object.keys(activeAgentTasks).length === 0) return false;
    return Object.values(activeAgentTasks).some(active => active === true);
  }, [activeAgentTasks]);

  const hasRunningTask = useMemo(() => {
    if (!agentTaskStatus || Object.keys(agentTaskStatus).length === 0) return false;
    return Object.values(agentTaskStatus).some(status => 
      status && ['initializing', 'running', 'completing', 'awaiting_human'].includes(status)
    );
  }, [agentTaskStatus]);

  const hasRecentUpdates = useMemo(() => {
    if (!agentTaskUpdates || Object.keys(agentTaskUpdates).length === 0) return false;
    
    const thirtySecondsAgo = Date.now() - 30000;
    return Object.values(agentTaskUpdates).some(updates => 
      Array.isArray(updates) && updates.length > 0 && 
      updates.some(update => {
        const timestamp = extractTimestampFromUpdate(update);
        return timestamp ? timestamp > thirtySecondsAgo : false;
      })
    );
  }, [agentTaskUpdates]);

  const hasCurrentExecution = useMemo(() => {
    if (!currentExecution) return false;
    
    const isRunningExecution = ['pending', 'running'].includes(currentExecution.status);
    const isRecentExecution = currentExecution.created_at && 
      (Date.now() - new Date(currentExecution.created_at).getTime()) < 300000; // 5 minutes
    
    return isRunningExecution || isRecentExecution;
  }, [currentExecution]);

  const hasGraph = useMemo(() => {
    if (!currentGraph) return false;
    
    const isActiveGraph = currentGraph.execution && 
      !['completed', 'failed', 'aborted'].includes(currentGraph.execution.status);
    
    return isActiveGraph;
  }, [currentGraph]);

  const isRunning = hasActiveTask || hasRunningTask;
  const hasActivity = hasRecentUpdates || hasCurrentExecution || hasGraph;

  // Auto-cleanup stale state after completion
  useEffect(() => {
    const currentTaskStatus = agentTaskStatus['current'];
    
    if (currentTaskStatus === 'completed' || currentTaskStatus === 'failed') {
      const timer = setTimeout(() => {
        const agentStore = useAgentStore.getState();
        if (agentStore.clearAgentTaskState) {
          console.log('[AgentTaskToggle] Auto-clearing stale agent task state');
          agentStore.clearAgentTaskState('current');
        }
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [agentTaskStatus]);

  // Don't clear execution state when overlay is visible (user might be viewing history)
  useEffect(() => {
    if (currentExecution?.status === 'completed' && hasActivity && !isOverlayVisible) {
      const timer = setTimeout(() => {
        console.log('[AgentTaskToggle] Clearing stale execution state (overlay not visible)');
        const { clearCurrentExecution } = useExecutionStore.getState();
        clearCurrentExecution();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [currentExecution, hasActivity, isOverlayVisible]);

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

  const getTooltipMessage = () => {
    if (isRunning) {
      return "Agent Task is running - Click to view";
    }
    if (hasActivity) {
      if (hasRecentUpdates) return "Recent Agent Task activity - Click to view";
      if (hasCurrentExecution) return "Agent Task execution available - Click to view";
      if (hasGraph) return "Agent Task graph available - Click to view";
    }
    return isActive ? "Close Agent Task Monitor" : "Open Agent Task Monitor";
  };

  return (
    <Tooltip 
      title={getTooltipMessage()}
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

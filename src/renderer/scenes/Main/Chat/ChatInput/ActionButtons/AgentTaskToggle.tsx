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
import { useAgentTaskStore } from '@/renderer/stores/Agent/AgentTaskStore';

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
  
  const { 
    currentExecution,
    currentGraph 
  } = useAgentTaskStore();

  useEffect(() => {
    setIsActive(isOverlayVisible);
  }, [isOverlayVisible]);

  // Check if there's any Agent Task activity
  const hasActiveTask = Object.values(activeAgentTasks).some(active => active);
  const hasRunningTask = Object.values(agentTaskStatus).some(status => 
    ['initializing', 'running', 'completing'].includes(status)
  );
  const hasRecentUpdates = Object.values(agentTaskUpdates).some(updates => 
    updates && updates.length > 0
  );
  const hasCurrentExecution = currentExecution !== null;
  const hasGraph = currentGraph !== null;

  // Determine the current state
  const isRunning = hasActiveTask || hasRunningTask;
  const hasActivity = hasRecentUpdates || hasCurrentExecution || hasGraph;

  // Get status color
  const getStatusColor = () => {
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

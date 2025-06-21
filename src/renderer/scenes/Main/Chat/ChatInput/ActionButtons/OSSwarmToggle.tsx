import { useState, useEffect } from 'react';
import { 
  IconButton, 
  Tooltip
} from '@mui/material';
import { 
  Timeline, 
  TimelineOutlined
} from '@mui/icons-material';
import { useStreamStore } from '@/renderer/stores/Stream/StreamStore';
import { useAgentTaskStore } from '@/renderer/stores/Agent/AgentTaskStore';

interface OSSwarmToggleProps {
  disabled?: boolean;
  onToggle?: (show: boolean) => void;
  isOverlayVisible?: boolean;
}

export default function OSSwarmToggle({ 
  disabled = false, 
  onToggle,
  isOverlayVisible = false
}: OSSwarmToggleProps) {
  const [isActive, setIsActive] = useState(false);
  
  const { 
    activeOSSwarmTasks, 
    osswarmTaskStatus,
    osswarmUpdates 
  } = useStreamStore();
  
  const { 
    currentExecution,
    currentGraph 
  } = useAgentTaskStore();

  useEffect(() => {
    setIsActive(isOverlayVisible);
  }, [isOverlayVisible]);

  // Check if there's any OSSwarm activity
  const hasActiveTask = Object.values(activeOSSwarmTasks).some(active => active);
  const hasRunningTask = Object.values(osswarmTaskStatus).some(status => 
    ['initializing', 'running', 'completing'].includes(status)
  );
  const hasRecentUpdates = Object.values(osswarmUpdates).some(updates => 
    updates && updates.length > 0
  );
  const hasCurrentExecution = currentExecution !== null;
  const hasGraph = currentGraph !== null;

  // Determine the current state
  const isRunning = hasActiveTask || hasRunningTask;
  const hasActivity = hasRecentUpdates || hasCurrentExecution || hasGraph;

  // Get status color
  const getStatusColor = () => {
    const currentTaskStatus = osswarmTaskStatus['current'];
    
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
        isRunning ? "OSSwarm is running - Click to view" :
        hasActivity ? "OSSwarm activity detected - Click to view" :
        isActive ? "Close OSSwarm Monitor" :
        "Open OSSwarm Monitor"
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

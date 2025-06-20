import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { useStreamStore } from "@/renderer/stores/Stream/StreamStore";

interface AgentWorkOverlayProps {
  visible?: boolean;
}

export default function AgentWorkOverlay({ visible }: AgentWorkOverlayProps) {
  const { isProcessingResponse } = useAgentStore();
  const { aiMode } = useLLMConfigurationStore();
  const { osswarmUpdates } = useStreamStore();
  const [shouldShow, setShouldShow] = useState(false);

  // Get current OSSwarm updates
  const currentTaskUpdates = osswarmUpdates['current'] || [];

  // Determine if overlay should be shown
  const isAgentModeActive = aiMode === "agent" && isProcessingResponse;
  const hasOSSwarmUpdates = currentTaskUpdates.length > 0;

  useEffect(() => {
    if (visible || isAgentModeActive || hasOSSwarmUpdates) {
      setShouldShow(true);
    } else {
      // Add a small delay before hiding to avoid flicker
      const timer = setTimeout(() => setShouldShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [visible, isAgentModeActive, hasOSSwarmUpdates]);

  if (!shouldShow) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        bgcolor: 'background.paper',
        boxShadow: 3,
        padding: 2,
        borderRadius: 2,
        maxWidth: 350,
        maxHeight: 300,
        overflow: 'auto',
        border: '1px solid',
        borderColor: 'primary.main',
      }}
    >
      <Typography 
        variant="h6" 
        sx={{ 
          mb: 1, 
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <CircularProgress size={16} />
        {aiMode === "agent" ? "Agent Mode (OSSwarm)" : "OSSwarm Active"}
      </Typography>
      
      <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
        {currentTaskUpdates.length > 0 ? (
          currentTaskUpdates.map((update, index) => (
            <Typography
              key={index}
              variant="caption"
              sx={{ 
                display: 'block', 
                mb: 0.5, 
                fontSize: '0.75rem',
                color: 'text.secondary',
                borderLeft: '2px solid',
                borderColor: 'primary.light',
                pl: 1,
                py: 0.25,
              }}
            >
              {update}
            </Typography>
          ))
        ) : (
          <Typography
            variant="caption"
            sx={{ 
              display: 'block', 
              fontSize: '0.75rem',
              color: 'text.secondary',
              fontStyle: 'italic'
            }}
          >
            {isAgentModeActive ? "Agent coordinating swarm..." : "OSSwarm initializing..."}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

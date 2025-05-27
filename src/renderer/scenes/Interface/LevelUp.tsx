import { Box, LinearProgress, Tooltip, Typography } from "@mui/material";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useState, useRef } from "react";
import { FormattedMessage } from "react-intl";

// Assuming calculateExperienceForLevel is accessible or can be redefined here
const calculateExperienceForLevel = (level: number): number => {
  // Simple formula: each level requires 50 * current level points
  // For level 0, requirement is for level 1. For level N, requirement is for level N+1.
  return 50 * (level === 0 ? 1 : level + 1);
};

function LevelUp() {
  const agent = useAgentStore((state) => state.agent);
  const [showTooltip, setShowTooltip] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  // Early return after all hooks are called
  if (!agent) {
    return null;
  }

  const level = agent.level ?? 0;
  const experience = agent.xp ?? 0;

  // Calculate experience needed to reach the *next* level.
  // If agent is level 0, target is level 1. If agent is level L, target is level L+1.
  const experienceToNextLevel = calculateExperienceForLevel(level);
  const progressPercentage = experienceToNextLevel > 0 ? (experience / experienceToNextLevel) * 100 : 0;

  // Only apply minimum display if there's actual progress
  const displayPercentage = experience > 0 && experienceToNextLevel > 0 ? Math.max(progressPercentage, 2) : 0;

  return (
    <Box
      sx={{
        width: "100%",
        height: 8,
        position: "relative",
        cursor: "pointer",
        zIndex: 10,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onMouseMove={(e) => {
        if (boxRef.current) {
          const rect = boxRef.current.getBoundingClientRect();
          setMousePosition({
            x: e.clientX - rect.left,
            y: 0
          });
        }
      }}
      ref={boxRef}
    >
      <LinearProgress
        variant="determinate"
        value={displayPercentage}
        sx={{
          height: 8,
          borderRadius: 0,
          '& .MuiLinearProgress-bar': {
            bgcolor: 'primary.main',
            transition: 'transform 0.5s ease',
          }
        }}
      />

      {showTooltip && (
        <Tooltip
          open={true}
          title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }} display="block">
                <FormattedMessage id="agent.level" /> {level}
              </Typography>
              <Typography variant="caption" display="block">
                <FormattedMessage id="agent.progress" /> {Math.min(100, Math.round(progressPercentage))}%
              </Typography>
              <Typography variant="caption" display="block">
                <FormattedMessage id="agent.xp" /> {experience}/{experienceToNextLevel}
              </Typography>
            </Box>
          }
          placement="top"
          arrow
          followCursor
          slotProps={{
            popper: {
              sx: {
                zIndex: 10000,
                mt: -6
              }
            }
          }}
        >
          <Box sx={{ position: 'absolute', width: '100%', height: '100%', top: 0 }} />
        </Tooltip>
      )}
    </Box>
  );
}

export default LevelUp;

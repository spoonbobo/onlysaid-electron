import { Box, LinearProgress, Tooltip, Typography } from "@mui/material";
import { useUserLevelStore } from "@/stores/User/UserLevel";
import { useUserStore } from "@/stores/User/UserStore";
import { useState, useRef } from "react";
import { FormattedMessage } from "react-intl";

function LevelUp() {
  const { level, experience, experienceToNextLevel } = useUserLevelStore();
  const { user } = useUserStore();
  const [showTooltip, setShowTooltip] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  // Calculate progress percentage
  const progressPercentage = (experience / experienceToNextLevel) * 100;

  // Force a minimum display percentage to ensure visibility
  const displayPercentage = Math.max(progressPercentage, 2);

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
                <FormattedMessage id="agent.progress" /> {Math.round(progressPercentage)}%
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
              disablePortal: true,
              sx: {
                position: 'absolute',
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

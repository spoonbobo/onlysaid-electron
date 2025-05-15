import { useState } from "react";
import { Box, IconButton, Tooltip, useTheme, Typography } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useTopicStore } from "../../stores/Topic/TopicStore";
import HelpDialog from "../../components/Dialog/Help/HelpDialog";
import { getHelpContentByContextType } from "./Help";

function TopBar() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { selectedContext } = useTopicStore();
  const theme = useTheme();

  const handleOpenHelp = () => {
    setIsHelpOpen(true);
  };

  const handleCloseHelp = () => {
    setIsHelpOpen(false);
  };

  const { title, items } = getHelpContentByContextType(selectedContext?.type);

  // Format the context type for display
  const displayContextType = selectedContext?.type
    ? selectedContext.type.charAt(0).toUpperCase() + selectedContext.type.slice(1)
    : "General";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        height: 36,
        paddingRight: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: theme.palette.mode === 'light'
          ? 'rgba(244, 245, 248, 0.95)'
          : 'rgba(26, 26, 26, 0.95)',
      }}
    >
      {/* Left section - empty for now */}
      <Box sx={{ flex: 1 }} />

      {/* Middle section - context type */}
      <Box sx={{ display: "flex", justifyContent: "center", flex: 1 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: "text.secondary",
            textTransform: "uppercase",
            fontSize: "0.75rem",
            letterSpacing: "0.5px"
          }}
        >
          {displayContextType}
        </Typography>
      </Box>

      {/* Right section - buttons */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", flex: 1 }}>
        <Tooltip title="Notifications">
          <Box
            component="div"
            onClick={() => { }}
            sx={{
              mx: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <NotificationsIcon
              fontSize="small"
              sx={{ color: 'text.secondary' }}
            />
          </Box>
        </Tooltip>

        <Tooltip title="Help">
          <Box
            component="div"
            onClick={handleOpenHelp}
            sx={{
              mx: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <HelpIcon
              fontSize="small"
              sx={{ color: 'text.secondary' }}
            />
          </Box>
        </Tooltip>
      </Box>

      <HelpDialog
        open={isHelpOpen}
        onClose={handleCloseHelp}
        helpItems={items}
        title={title}
      />
    </Box>
  );
}

export default TopBar;

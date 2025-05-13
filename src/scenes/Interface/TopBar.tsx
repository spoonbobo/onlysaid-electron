import { Box, IconButton, Tooltip } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import NotificationsIcon from "@mui/icons-material/Notifications";

function TopBar() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        height: 36,
        paddingRight: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Tooltip title="Notifications">
        <IconButton
          size="small"
          disableRipple
          sx={{
            color: "text.secondary",
            padding: 0.5,
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "transparent"
            }
          }}
        >
          <NotificationsIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Tooltip title="Help">
        <IconButton
          size="small"
          disableRipple
          sx={{
            color: "text.secondary",
            padding: 0.5,
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "transparent"
            }
          }}
        >
          <HelpIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default TopBar;
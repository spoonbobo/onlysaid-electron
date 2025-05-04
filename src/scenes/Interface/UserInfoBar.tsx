import { Box, Avatar, Typography, IconButton } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useUserStore } from "@/stores/User/UserStore";
import { IUser } from "@/models/User/UserInfo";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { FormattedMessage } from "react-intl";
import { useUserLevelStore } from "@/stores/User/UserLevel";

export default function UserInfoBar() {
  const user: IUser | null = useUserStore((state) => state.user);
  const { level } = useUserLevelStore();
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);
  const updateActiveTabContext = useWindowStore((state) => state.updateActiveTabContext);

  const displayName = user?.username || "Guest";
  const status = user === null ? "offline" : "online";
  const avatar = user?.avatar || "";
  const isOffline = status === "offline";

  // Handle navigation to settings
  const handleNavigateToSettings = () => {
    // Create a properly typed settings context
    const settingsContext = {
      name: "settings",
      type: "settings" as const // Use const assertion to fix type issue
    };

    // Update both the selected context and the active tab context
    setSelectedContext(settingsContext);
    updateActiveTabContext(settingsContext);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1,
        borderTop: "1px solid #eee",
        bgcolor: "background.paper",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Avatar
          src={avatar}
          sx={{
            width: 32,
            height: 32,
            mr: 1,
            opacity: isOffline ? 0.5 : 1
          }}
        />
        <Box>
          <Typography
            variant="body2"
          >
            {displayName}
          </Typography>
          <Typography
            variant="caption"
            color={isOffline ? "text.disabled" : "success.main"}
          >
            <FormattedMessage id={`user.status.${status}`} />
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center" }}>
        {user && (
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.75rem",
              fontWeight: "medium",
              bgcolor: "primary.main",
              color: "white",
              borderRadius: "12px",
              px: 1,
              py: 0.25,
              mr: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FormattedMessage id="agent.level" /> {level}
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={handleNavigateToSettings}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

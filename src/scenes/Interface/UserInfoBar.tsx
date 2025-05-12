import { Box, Avatar, Typography, IconButton } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useUserStore } from "@/stores/User/UserStore";
import { IUser } from "@/../../types/User/User";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/stores/Topic/TopicStore";

export default function UserInfoBar() {
  const user: IUser | null = useUserStore((state) => state.user);
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);
  const displayName = user?.username || "Guest";
  const status = user === null ? "offline" : "online";
  const avatar = user?.avatar || "";
  const isOffline = status === "offline";
  const level = user?.level ?? 0;

  const handleNavigateToSettings = () => {
    const settingsContext = {
      name: "settings",
      type: "settings" as const
    };

    setSelectedContext(settingsContext);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1,
        borderTop: "1px solid",
        borderColor: "divider",
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
          slotProps={{
            img: {
              referrerPolicy: "no-referrer",
              crossOrigin: "anonymous"
            }
          }}
        />
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="body2">
              {displayName}
            </Typography>
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <FormattedMessage id="agent.level" /> {level}
              </Typography>
            )}
          </Box>
          <Typography
            variant="caption"
            color={isOffline ? "text.disabled" : "success.main"}
          >
            <FormattedMessage id={`user.status.${status}`} />
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center" }}>
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
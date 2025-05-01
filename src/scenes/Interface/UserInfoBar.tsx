import { Box, Avatar, Typography, IconButton } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useUserStore } from "../../stores/User/User";
import { IUser } from "../../models/User/UserInfo";
import { useTopicStore } from "../../stores/Topic/TopicStore";

export default function UserInfoBar() {
  const user: IUser | null = useUserStore((state) => state.user);
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);

  const displayName = user?.name || "Guest";
  const status = user === null ? "offline" : "online";
  const avatar = user?.avatar || "";
  const isOffline = status === "offline";

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
            {status}
          </Typography>
        </Box>
      </Box>

      <IconButton
        size="small"
        onClick={() => setSelectedContext({
          name: "settings",
          type: "settings"
        })}
      >
        <SettingsIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
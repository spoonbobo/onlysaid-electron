import { Box, Avatar, Typography, IconButton } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { IUser } from "@/../../types/User/User";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import AgentTaskToggle from "../Main/Chat/ChatInput/ActionButtons/AgentTaskToggle";

interface UserInfoBarProps {
  onAgentToggle?: (show: boolean) => void;
  agentOverlayVisible?: boolean;
}

export default function UserInfoBar({ onAgentToggle, agentOverlayVisible = false }: UserInfoBarProps) {
  const intl = useIntl();
  const user: IUser | null = useUserStore((state) => state.user);
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);

  const displayName = user?.username || intl.formatMessage({ id: "user.guest", defaultMessage: "Guest User" });
  const status = user === null ? "offline" : "online";
  const userAvatarSrc = user?.avatar || "";
  const isOffline = status === "offline";

  const avatarSize = 32;

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
        minHeight: avatarSize + 8,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Avatar
          src={userAvatarSrc}
          sx={{
            width: avatarSize,
            height: avatarSize,
            opacity: isOffline ? 0.5 : 1,
            mr: 1,
            border: `2px solid ${isOffline ? 'transparent' : 'background.paper'}`,
          }}
          slotProps={{
            img: {
              referrerPolicy: "no-referrer",
              crossOrigin: "anonymous"
            }
          }}
        />
        <Box>
          <Typography variant="body2">
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <AgentTaskToggle 
          onToggle={onAgentToggle}
          isOverlayVisible={agentOverlayVisible}
        />
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

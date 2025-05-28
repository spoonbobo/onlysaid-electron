import { Box, Avatar, Typography, IconButton, Badge } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { IUser } from "@/../../types/User/User";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useState } from "react";
import { getTotalNotificationCount } from "@/utils/notifications";
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import NotificationView from "@/renderer/components/Dialog/NotificationView";

export default function UserInfoBar() {
  const user: IUser | null = useUserStore((state) => state.user);
  const agent: IUser | null = useAgentStore((state) => state.agent);
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);
  const [showNotifications, setShowNotifications] = useState(false);

  // Subscribe to notification store to get live updates
  const totalNotificationCount = useNotificationStore((state) =>
    state.notifications.filter(n => !n.read).length
  );

  const displayName = user?.username || "Guest";
  const status = user === null ? "offline" : "online";
  const userAvatarSrc = user?.avatar || "";
  const isOffline = status === "offline";

  const agentAvatarSrc = agent?.avatar || "";
  const agentLevel = agent?.level ?? 0;
  const avatarSize = 32; // Define a common size
  const overlapOffset = avatarSize / 2; // Agent avatar shifted by half its width to the right

  const handleNavigateToSettings = () => {
    const settingsContext = {
      name: "settings",
      type: "settings" as const
    };
    setSelectedContext(settingsContext);
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          justifyContent: "space-between",
          minHeight: avatarSize + 8, // Adjusted minHeight slightly
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box
            sx={{
              position: 'relative',
              width: avatarSize + overlapOffset, // Container width to fit both partially
              height: avatarSize,
              mr: 1
            }}
          >
            {/* Agent Avatar and Badge - Rendered first to be in the background */}
            {agent && (
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.6rem',
                      bgcolor: 'primary.main',
                      color: 'white',
                      borderRadius: '6px',
                      px: 0.5,
                      py: 0.1,
                      minWidth: '12px',
                      height: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid white`,
                      position: 'relative', // Ensure badge content respects zIndex if needed over avatar border
                      zIndex: 3, // Badge on top of agent avatar
                    }}
                  >
                    {agentLevel}
                  </Typography>
                }
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: overlapOffset, // Position agent avatar to the right
                  zIndex: 1, // Agent avatar and its badge container behind user avatar
                }}
              >
                <Avatar
                  src={agentAvatarSrc}
                  sx={{
                    width: avatarSize,
                    height: avatarSize,
                  }}
                  slotProps={{
                    img: {
                      referrerPolicy: "no-referrer",
                      crossOrigin: "anonymous"
                    }
                  }}
                />
              </Badge>
            )}
            {/* User Avatar - Rendered last to be on top */}
            <Avatar
              src={userAvatarSrc}
              sx={{
                width: avatarSize,
                height: avatarSize,
                opacity: isOffline ? 0.5 : 1,
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 2,
                border: `2px solid ${isOffline ? 'transparent' : 'background.paper'}`,
              }}
              slotProps={{
                img: {
                  referrerPolicy: "no-referrer",
                  crossOrigin: "anonymous"
                }
              }}
            />
          </Box>
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
          <Badge
            badgeContent={totalNotificationCount}
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.6rem',
                height: 16,
                minWidth: 16
              }
            }}
          >
            <IconButton
              size="small"
              onClick={handleNotificationClick}
            >
              <NotificationsIcon fontSize="small" />
            </IconButton>
          </Badge>

          <IconButton
            size="small"
            onClick={handleNavigateToSettings}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <NotificationView
        open={showNotifications}
        onClose={handleCloseNotifications}
      />
    </>
  );
}

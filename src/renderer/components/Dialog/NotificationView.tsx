import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Chip,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Avatar,
  Tooltip
} from "@mui/material";
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Home as HomeIcon,
  Business as WorkspaceIcon,
  People as PeopleIcon,
  SmartToy as AgentIcon,
  Chat as ChatIcon,
  School as KnowledgeIcon,
  Notifications as NotificationIcon,
  Circle as CircleIcon
} from "@mui/icons-material";
import { FormattedMessage, useIntl } from "react-intl";
import { useState } from "react";
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import {
  getAllNotifications,
  markNotificationAsRead,
  markHomeAsRead,
  markWorkspaceAsRead,
  markHomeSectionAsRead,
  markWorkspaceSectionAsRead,
  clearAllNotifications
} from "@/utils/notifications";
import * as R from "ramda";
import { INotificationData } from "@/../../types/Notifications/notification";

interface NotificationViewProps {
  open: boolean;
  onClose: () => void;
}

interface NotificationItemProps {
  notification: INotificationData;
  onMarkAsRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Box sx={{
      py: 0.5,
      px: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minHeight: 32,
      borderBottom: '1px solid',
      borderColor: 'divider',
      '&:last-child': {
        borderBottom: 'none'
      }
    }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: notification.read ? 400 : 600,
              color: notification.read ? 'text.secondary' : 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}
          >
            {notification.title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              flexShrink: 0,
              fontSize: '0.7rem'
            }}
          >
            {formatTimestamp(notification.timestamp)}
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            fontSize: '0.75rem'
          }}
        >
          {notification.content}
        </Typography>
      </Box>
      {!notification.read && (
        <Box
          sx={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            flexShrink: 0
          }}
        />
      )}
    </Box>
  );
}

export default function NotificationView({ open, onClose }: NotificationViewProps) {
  const intl = useIntl();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const { workspaces } = useWorkspaceStore();

  // Get notifications from store with live updates
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Group notifications by type and level
  const homeNotifications = notifications.filter(n => !n.workspaceId);
  const workspaceNotifications = R.groupBy(
    (n: INotificationData) => n.workspaceId!,
    notifications.filter(n => n.workspaceId)
  );

  // Group home notifications by section
  const homeGrouped = R.groupBy(
    (n: INotificationData) => n.homeSection || 'general',
    homeNotifications
  );

  const handleExpandSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  const handleMarkAllHomeAsRead = () => {
    markHomeAsRead();
  };

  const handleMarkWorkspaceAsRead = (workspaceId: string) => {
    markWorkspaceAsRead(workspaceId);
  };

  const handleMarkHomeSectionAsRead = (section: string) => {
    markHomeSectionAsRead(section);
  };

  const handleMarkWorkspaceSectionAsRead = (workspaceId: string, section: string) => {
    markWorkspaceSectionAsRead(workspaceId, section);
  };

  const handleClearAll = () => {
    clearAllNotifications();
  };

  const getWorkspaceName = (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    return workspace?.name || `Workspace ${workspaceId.slice(0, 8)}...`;
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'friends': return <PeopleIcon fontSize="small" />;
      case 'agents': return <AgentIcon fontSize="small" />;
      case 'chatroom': return <ChatIcon fontSize="small" />;
      case 'members': return <PeopleIcon fontSize="small" />;
      case 'knowledgeBase': return <KnowledgeIcon fontSize="small" />;
      default: return <HomeIcon fontSize="small" />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          bgcolor: 'background.paper'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationIcon fontSize="small" />
          <Typography variant="h6" color="text.primary">
            <FormattedMessage id="notifications.title" defaultMessage="Notifications" />
          </Typography>
          {unreadCount > 0 && (
            <Typography variant="caption" sx={{
              bgcolor: 'error.main',
              color: 'error.contrastText',
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              fontSize: '0.7rem',
              fontWeight: 600
            }}>
              {unreadCount}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage id="notifications.empty" defaultMessage="No notifications yet" />
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Home Notifications */}
            {homeNotifications.length > 0 && (
              <Box sx={{ bgcolor: 'background.paper', mb: 1 }}>
                <Box sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HomeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="subtitle2" color="text.primary">
                        <FormattedMessage id="notifications.home" defaultMessage="Home" />
                      </Typography>
                      {homeNotifications.filter(n => !n.read).length > 0 && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'error.main',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}
                        >
                          {homeNotifications.filter(n => !n.read).length}
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'primary.main',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        '&:hover': {
                          color: 'primary.dark'
                        }
                      }}
                      onClick={handleMarkAllHomeAsRead}
                    >
                      <FormattedMessage id="notifications.markAllRead" defaultMessage="Mark all read" />
                    </Typography>
                  </Box>
                </Box>

                {Object.entries(homeGrouped).map(([section, sectionNotifications]) => (
                  <Box key={section}>
                    <Box sx={{
                      px: 2,
                      py: 0.75,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getSectionIcon(section)}
                        <Typography
                          variant="caption"
                          sx={{
                            flex: 1,
                            textTransform: 'uppercase',
                            fontSize: '0.65rem',
                            color: 'text.secondary',
                            letterSpacing: 0.5
                          }}
                        >
                          <FormattedMessage
                            id={`menu.home.${section}`}
                            defaultMessage={section.charAt(0).toUpperCase() + section.slice(1)}
                          />
                        </Typography>
                        {(sectionNotifications || []).filter(n => !n.read).length > 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.65rem',
                              color: 'error.main',
                              fontWeight: 600
                            }}
                          >
                            {(sectionNotifications || []).filter(n => !n.read).length}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ bgcolor: 'background.paper' }}>
                      {(sectionNotifications || []).map((notification: INotificationData) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={handleMarkAsRead}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Workspace Notifications */}
            {Object.entries(workspaceNotifications).map(([workspaceId, wsNotifications]) => {
              const workspaceGrouped = R.groupBy(
                (n: INotificationData) => n.workspaceSection || 'general',
                wsNotifications || []
              );

              return (
                <Box key={workspaceId} sx={{ bgcolor: 'background.paper', mb: 1 }}>
                  <Box sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WorkspaceIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="subtitle2" color="text.primary">
                          {getWorkspaceName(workspaceId)}
                        </Typography>
                        {(wsNotifications || []).filter(n => !n.read).length > 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'error.main',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}
                          >
                            {(wsNotifications || []).filter(n => !n.read).length}
                          </Typography>
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'primary.main',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                          '&:hover': {
                            color: 'primary.dark'
                          }
                        }}
                        onClick={() => handleMarkWorkspaceAsRead(workspaceId)}
                      >
                        <FormattedMessage id="notifications.markAllRead" defaultMessage="Mark all read" />
                      </Typography>
                    </Box>
                  </Box>

                  {Object.entries(workspaceGrouped).map(([section, sectionNotifications]) => (
                    <Box key={section}>
                      <Box sx={{
                        px: 2,
                        py: 0.75,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getSectionIcon(section)}
                          <Typography
                            variant="caption"
                            sx={{
                              flex: 1,
                              textTransform: 'uppercase',
                              fontSize: '0.65rem',
                              color: 'text.secondary',
                              letterSpacing: 0.5
                            }}
                          >
                            <FormattedMessage
                              id={`menu.workspace.${section}`}
                              defaultMessage={section.charAt(0).toUpperCase() + section.slice(1)}
                            />
                          </Typography>
                          {(sectionNotifications || []).filter(n => !n.read).length > 0 && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: '0.65rem',
                                color: 'error.main',
                                fontWeight: 600
                              }}
                            >
                              {(sectionNotifications || []).filter(n => !n.read).length}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ bgcolor: 'background.paper' }}>
                        {(sectionNotifications || []).map((notification: INotificationData) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{
        p: 1.5,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Typography
          variant="caption"
          sx={{
            color: 'error.main',
            cursor: 'pointer',
            '&:hover': {
              color: 'error.dark'
            }
          }}
          onClick={handleClearAll}
        >
          <FormattedMessage id="notifications.clearAll" defaultMessage="Clear All" />
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'primary.main',
            cursor: 'pointer',
            '&:hover': {
              color: 'primary.dark'
            }
          }}
          onClick={onClose}
        >
          <FormattedMessage id="common.close" defaultMessage="Close" />
        </Typography>
      </DialogActions>
    </Dialog>
  );
}

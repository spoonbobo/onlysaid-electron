import { Box, Typography, Card, CardContent, Chip, IconButton, Menu, MenuItem, Badge, Button, FormControl, InputLabel, Select, SelectChangeEvent } from "@mui/material";
import { useIntl } from "react-intl";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import { useEffect, useState, useMemo } from "react";
import Calendar from "@/renderer/components/Calendar";
import { MoreVert, Add, Group, Message } from "@mui/icons-material";
import AddWorkspaceDialog from "@/renderer/components/Dialog/Workspace/AddWorkspace";
import ScheduledTasks from "./ScheduledTasks";
import { useContextNotificationClearing } from '@/renderer/hooks/useContextNotificationClearing';

function WorkspaceContainer() {
  const intl = useIntl();
  const { workspaces, getWorkspace, isLoading } = useWorkspaceStore();
  const user = useUserStore(state => state.user);
  const { setSelectedContext } = useTopicStore();
  
  // Get notification data using direct selector pattern
  const allNotifications = useNotificationStore(state => state.notifications);
  const workspaceCounts = useNotificationStore(state => state.counts.workspaces);
  
  // Layout and UI state
  const [itemsPerRow, setItemsPerRow] = useState(2); // Default to 2 items per row
  const [showAddWorkspaceDialog, setShowAddWorkspaceDialog] = useState(false);

  useEffect(() => {
    if (user?.id) {
      getWorkspace(user.id);
    }
  }, [user?.id, getWorkspace]);

  const handleWorkspaceClick = (workspace: any) => {
    // ✅ Just set the context - let useContextNotificationClearing handle the clearing logic
    setSelectedContext({
      name: workspace.name,
      type: "workspace",
      id: workspace.id,
      section: "workspace:chatroom"
    });
  };

  const handleItemsPerRowChange = (event: SelectChangeEvent) => {
    setItemsPerRow(Number(event.target.value));
  };

  const handleAddWorkspace = () => {
    setShowAddWorkspaceDialog(true);
  };

  const handleWorkspaceAdded = async () => {
    if (user?.id) {
      await getWorkspace(user.id);
    }
  };

  // Calculate total slots and rows based on items per row
  const totalItemsIncludingAdd = workspaces.length + 1; // +1 for add button
  const totalRows = Math.ceil(totalItemsIncludingAdd / itemsPerRow);
  const showAddButton = true; // Always show add button

  // Memoize notification calculations to prevent re-computation on every render
  const workspaceNotifications = useMemo(() => {
    const notificationsByWorkspace: Record<string, any[]> = {};
    
    workspaces.forEach(workspace => {
      notificationsByWorkspace[workspace.id] = allNotifications.filter(notification => 
        notification.workspaceId === workspace.id && !notification.read
      );
    });
    
    return notificationsByWorkspace;
  }, [allNotifications, workspaces]);

  // Get workspace notifications (optimized)
  const getWorkspaceNotifications = (workspaceId: string) => {
    return workspaceNotifications[workspaceId] || [];
  };

  // Get workspace notification count (optimized)
  const getWorkspaceNotifCount = (workspaceId: string) => {
    return workspaceCounts[workspaceId] || 0;
  };

  // Format notification for display
  const formatNotificationForDisplay = (notification: any) => {
    // For message notifications, show a more user-friendly format
    if (notification.type === 'message') {
      return {
        message: notification.content,
        type: 'message',
        icon: <Message sx={{ fontSize: 12 }} />
      };
    }
    
    // For other notification types, use title + content
    return {
      message: notification.title + (notification.content ? `: ${notification.content}` : ''),
      type: notification.type,
      icon: null
    };
  };

  // Add this hook call
  useContextNotificationClearing();

  return (
    <Box sx={{ 
      display: 'flex', 
      gap: 3,
      mb: 4
    }}>
      {/* Left Side - Workspaces */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            {intl.formatMessage({ id: 'homepage.workspaces', defaultMessage: 'Workspaces' })}
          </Typography>
          
          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel id="items-per-row-label" size="small">
              {intl.formatMessage({ id: 'workspace.grid.itemsPerRow', defaultMessage: 'Items per row' })}
            </InputLabel>
            <Select
              labelId="items-per-row-label"
              value={itemsPerRow.toString()}
              onChange={handleItemsPerRowChange}
              label={intl.formatMessage({ id: 'workspace.grid.itemsPerRow', defaultMessage: 'Items per row' })}
              size="small"
            >
              <MenuItem value={1}>1</MenuItem>
              <MenuItem value={2}>2</MenuItem>
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={4}>4</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`, 
          gap: 2,
          minHeight: `${totalRows * 160 + (totalRows - 1) * 8}px` // Dynamic height based on rows
        }}>
          {/* Existing Workspaces */}
          {workspaces.map((workspace) => {
            const notifications = getWorkspaceNotifications(workspace.id);
            const notificationCount = getWorkspaceNotifCount(workspace.id);
            
            return (
              <Card 
                key={workspace.id}
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  },
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: 150,
                  position: 'relative'
                }}
                onClick={() => handleWorkspaceClick(workspace)}
              >
                <CardContent sx={{ 
                  p: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Workspace Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography 
                      variant="subtitle1" 
                      component="h3" 
                      sx={{ 
                        color: 'text.primary',
                        fontWeight: 'medium',
                        flexGrow: 1,
                        mr: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {workspace.name}
                    </Typography>
                    
                    {notificationCount > 0 && (
                      <Badge 
                        badgeContent={notificationCount} 
                        color="primary"
                        sx={{
                          '& .MuiBadge-badge': {
                            right: -3,
                            top: 2,
                            fontSize: '0.75rem',
                            minWidth: 16,
                            height: 16
                          }
                        }}
                      />
                    )}
                  </Box>
                  
                  {/* Notifications Area */}
                  <Box sx={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: 80
                  }}>
                    {notifications.length === 0 ? (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.secondary',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}
                      >
                        {intl.formatMessage({ 
                          id: 'workspace.noNotifications', 
                          defaultMessage: 'No notifications' 
                        })}
                      </Typography>
                    ) : (
                      <Box sx={{ maxHeight: 80, overflow: 'auto' }}>
                        {notifications.slice(0, 3).map((notification: any, index: number) => {
                          const displayData = formatNotificationForDisplay(notification);
                          return (
                            <Box 
                              key={notification.id || index}
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: 0.5, 
                                mb: 0.5 
                              }}
                            >
                              {displayData.icon}
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: displayData.type === 'message' ? 'primary.main' : 'text.secondary',
                                  lineHeight: 1.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {displayData.message}
                              </Typography>
                            </Box>
                          );
                        })}
                        {notifications.length > 3 && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'primary.main',
                              fontWeight: 'medium',
                              display: 'block',
                              textAlign: 'center',
                              mt: 0.5
                            }}
                          >
                            +{notifications.length - 3} {intl.formatMessage({ 
                              id: 'notifications.more', 
                              defaultMessage: 'more' 
                            })}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}

          {/* Add Workspace Button */}
          {showAddButton && (
            <Card 
              sx={{ 
                bgcolor: 'background.paper',
                border: '2px dashed',
                borderColor: 'divider',
                height: 150,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
              onClick={handleAddWorkspace}
            >
              <CardContent sx={{ 
                textAlign: 'center', 
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Add sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                <Typography 
                  variant="body2" 
                  sx={{ color: 'text.secondary', mb: 1 }}
                >
                  {intl.formatMessage({ 
                    id: 'workspace.addOrJoin', 
                    defaultMessage: 'Add or Join Workspace' 
                  })}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ color: 'text.secondary' }}
                >
                  {intl.formatMessage({ 
                    id: 'workspace.clickToStart', 
                    defaultMessage: 'Click to get started' 
                  })}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Right Side - Calendar and Scheduled Tasks */}
      <Box sx={{ 
        flex: '0 0 320px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {/* Calendar Section - Top Right */}
        <Card sx={{ 
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <CardContent sx={{ p: 2 }}>
            <Calendar showCalendarSelections={false} compact={true} />
          </CardContent>
        </Card>

        {/* Scheduled Tasks & Reminders Section - Bottom Right */}
        <Card sx={{ 
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          minHeight: 300
        }}>
          <CardContent sx={{ p: 3 }}>
            <ScheduledTasks />
          </CardContent>
        </Card>
      </Box>

      {/* Add Workspace Dialog */}
      <AddWorkspaceDialog
        open={showAddWorkspaceDialog}
        onClose={() => setShowAddWorkspaceDialog(false)}
        onWorkspaceAdded={handleWorkspaceAdded}
      />
    </Box>
  );
}

export default WorkspaceContainer;

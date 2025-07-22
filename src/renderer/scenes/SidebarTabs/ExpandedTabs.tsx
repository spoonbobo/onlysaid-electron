import { Box, Tooltip, IconButton, Menu, MenuItem, Avatar, Badge, Typography, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Divider, Fab, Zoom } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import AddTeamDialog from "@/renderer/components/Dialog/Workspace/AddWorkspace";
import ExitWorkspaceDialog from "@/renderer/components/Dialog/Workspace/ExitWorkspace";
import { getUserFromStore } from "@/utils/user";
import { IWorkspace } from "@/../../types/Workspace/Workspace";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useTopicStore, TopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import { useIntl } from "react-intl";
import { useWorkspaceIcons } from '@/renderer/hooks/useWorkspaceIcons';
import UserInfoBar from "../Interface/UserInfoBar";

interface ExpandedTabsProps {
  onCollapse: () => void;
  onAgentToggle?: (show: boolean) => void;
  agentOverlayVisible?: boolean;
}

function ExpandedTabs({ onCollapse, onAgentToggle, agentOverlayVisible = false }: ExpandedTabsProps) {
  const { selectedContext, contexts, setSelectedContext, removeContext, addContext } = useTopicStore();
  const { workspaces, getWorkspace, exitWorkspace, isLoading, setWorkspaceCreatedCallback } = useWorkspaceStore();
  const {
    hasHomeNotifications,
    hasWorkspaceNotifications
  } = useNotificationStore();
  const user = useUserStore(state => state.user);
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [workspaceLastSections, setWorkspaceLastSections] = useState<Record<string, string>>({});
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [contextForMenu, setContextForMenu] = useState<TopicContext | null>(null);
  const [workspaceToExit, setWorkspaceToExit] = useState<TopicContext | null>(null);
  const [pendingWorkspaceSelection, setPendingWorkspaceSelection] = useState<string | null>(null);
  const [dialogCreation, setDialogCreation] = useState(false);
  const intl = useIntl();
  const previousUserRef = useRef(user);
  const [showCollapseButton, setShowCollapseButton] = useState(false);
  
  // Memoize and stabilize workspaces reference to prevent unnecessary icon refetching
  const stableWorkspaces = useMemo(() => {
    return workspaces.map(w => ({
      id: w.id,
      name: w.name,
      image: w.image,
    }));
  }, [workspaces.map(w => `${w.id}-${w.name}-${w.image}`).join(',')]);
  
  const { workspaceIcons, getWorkspaceIcon } = useWorkspaceIcons(stableWorkspaces as IWorkspace[]);

  const homeContext = useMemo(() => {
    const foundContext = contexts.find(context => context.name === "home" && context.type === "home");
    return foundContext || { name: "home", type: "home" };
  }, [contexts]);

  useEffect(() => {
    const previousUser = previousUserRef.current;
    previousUserRef.current = user;

    if (previousUser && !user) {
      setSelectedContext(homeContext as TopicContext);
      const workspaceContexts = [...contexts].filter(ctx => ctx.type === "workspace");
      workspaceContexts.forEach(ctx => removeContext(ctx));
      useWorkspaceStore.setState({ workspaces: [] });
    }

    if (!previousUser && user && user.id) {
      getWorkspace(user.id);
    }
  }, [user, setSelectedContext, removeContext, contexts, getWorkspace]);

  useEffect(() => {
    const currentUser = getUserFromStore();
    if (currentUser?.id) {
      getWorkspace(currentUser.id);
    }
  }, [getWorkspace]);

  useEffect(() => {
    if (!user) return;

    workspaces.forEach(workspace => {
      const existingContext = contexts.find(
        context => context.type === "workspace" && context.id === workspace.id
      );

      if (!existingContext) {
        addContext({
          id: workspace.id,
          name: workspace.name?.toLowerCase() || 'unnamed workspace',
          type: "workspace"
        });
      }
    });
  }, [workspaces, contexts, addContext, user]);

  const WorkspaceContexts = user
    ? contexts.filter(context =>
      context.type === "workspace" &&
      !(context.name === "workspace" && context.type === "workspace")
    )
    : [];

  useEffect(() => {
    if (selectedContext?.type === "workspace" && selectedContext?.section) {
      setWorkspaceLastSections(prev => ({
        ...prev,
        [selectedContext.id || selectedContext.name]: selectedContext.section as string
      }));
    }
  }, [selectedContext]);

  // Same navigation logic as the compact tabs
  const handleNavigate = (context: TopicContext) => {
    const isSameContext = context.id && selectedContext?.id
      ? selectedContext.id === context.id
      : selectedContext?.name === context.name && selectedContext?.type === context.type;

    if (isSameContext) {
      return;
    }

    if (selectedContext) {
      const currentChatStore = useChatStore.getState();
      const currentContextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
      const currentActiveChatId = currentChatStore.getActiveChatIdForContext(currentContextId);
      
      if (selectedContext.type === "workspace" && selectedContext.id) {
        if (currentActiveChatId) {
          useTopicStore.getState().setWorkspaceSelectedChat(selectedContext.id, currentActiveChatId);
        }
      } else if (selectedContext.type === "home") {
        if (currentActiveChatId) {
          useTopicStore.getState().setSelectedTopic('agents', currentActiveChatId);
        }
      }
    }

    if (context.type !== selectedContext?.type) {
      const currentTopics = useTopicStore.getState().selectedTopics;
      Object.keys(currentTopics).forEach(section => {
        if (section === "knowledgeBaseMenu:selectedId") {
          useTopicStore.getState().clearSelectedTopic(section);
        }
      });
    }

    if (context.type === "workspace") {
      const contextKey = context.id || context.name;
      const lastWorkspaceSection = workspaceLastSections[contextKey];
      const sectionToUse = lastWorkspaceSection || context.section || "workspace:chatroom";

      setSelectedContext({
        ...context,
        section: sectionToUse
      });

      if (context.id) {
        setTimeout(() => {
          const savedChatId = useTopicStore.getState().getWorkspaceSelectedChat(context.id!);
          if (savedChatId) {
            const currentChats = useChatStore.getState().chats;
            const chatExists = currentChats.some(chat => chat.id === savedChatId);
            
            if (chatExists) {
              const newContextId = `${context.name}:${context.type}`;
              useTopicStore.getState().setSelectedTopic(sectionToUse, savedChatId);
              useChatStore.getState().setActiveChat(savedChatId, newContextId);
            } else {
              useTopicStore.getState().clearWorkspaceSelectedChat(context.id!);
            }
          }
        }, 200);
      }
    } else if (context.type === "home") {
      const lastHomeSection = useTopicStore.getState().lastSections['home'];

      setSelectedContext({
        ...context,
        section: lastHomeSection || 'homepage'
      });

      const currentUser = getUserFromStore();
      if (currentUser?.id) {
        useChatStore.getState().getChat(currentUser.id, 'agent');
        
        setTimeout(() => {
          const savedChatId = useTopicStore.getState().selectedTopics['agents'];
          if (savedChatId) {
            const currentChats = useChatStore.getState().chats;
            const chatExists = currentChats.some(chat => chat.id === savedChatId && chat.type === 'agent');
            if (chatExists) {
              const homeContextId = `${context.name}:${context.type}`;
              useChatStore.getState().setActiveChat(savedChatId, homeContextId);
            } else {
              useTopicStore.getState().clearSelectedTopic('agents');
            }
          }
        }, 100);
      }
    } else {
      setSelectedContext(context);
    }
  };

  const handleAddTeam = () => {
    setDialogCreation(true);
    setShowAddTeamDialog(true);
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>, context: TopicContext) => {
    event.preventDefault();
    setMenuAnchorEl(event.currentTarget);
    setContextForMenu(context);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setContextForMenu(null);
  };

  const handleExitWorkspaceClick = () => {
    setWorkspaceToExit(contextForMenu);
    setShowExitDialog(true);
    handleCloseMenu();
  };

  const handleConfirmExit = async () => {
    if (!workspaceToExit?.id) return;

    try {
      await exitWorkspace(workspaceToExit.id);
      removeContext(workspaceToExit);

      if (selectedContext?.id === workspaceToExit.id) {
        setSelectedContext(homeContext as TopicContext);
      }

      const currentUser = getUserFromStore();
      if (currentUser?.id) {
        await getWorkspace(currentUser.id);
      }
    } catch (error) {
      console.error("Error exiting workspace:", error);
    }
  };

  const isContextSelected = (context: TopicContext) => {
    if (context.id && selectedContext?.id) {
      return context.id === selectedContext.id;
    }
    return context.name === selectedContext?.name &&
      context.type === selectedContext?.type;
  };

  const handleTeamAdded = async (workspace?: IWorkspace) => {
    if (workspace && workspace.id) {
      const workspaceContext: TopicContext = {
        id: workspace.id,
        name: workspace.name?.toLowerCase() || 'unnamed workspace',
        type: "workspace",
        section: "workspace:chatroom"
      };
      setSelectedContext(workspaceContext);
    }

    const currentUser = getUserFromStore();
    if (currentUser?.id) {
      await getWorkspace(currentUser.id);
    }

    setShowAddTeamDialog(false);
    setDialogCreation(false);
  };

  useEffect(() => {
    if (pendingWorkspaceSelection && workspaces.length > 0) {
      const workspaceToSelect = workspaces.find(w => w.id === pendingWorkspaceSelection);
      if (workspaceToSelect) {
        const workspaceContext: TopicContext = {
          id: workspaceToSelect.id,
          name: (workspaceToSelect.name || 'Unnamed Workspace').toLowerCase(),
          type: "workspace",
          section: "workspace:chatroom"
        };
        setSelectedContext(workspaceContext);
        setPendingWorkspaceSelection(null);
      }
    }
  }, [workspaces, pendingWorkspaceSelection, setSelectedContext]);

  useEffect(() => {
    if (!dialogCreation) {
      setWorkspaceCreatedCallback(undefined);
    } else {
      setWorkspaceCreatedCallback(undefined);
    }

    return () => setWorkspaceCreatedCallback(undefined);
  }, [setWorkspaceCreatedCallback, dialogCreation]);

  const handleCalendarNavigate = () => {
    setSelectedContext({
      name: "calendar",
      type: "calendar",
      section: "calendar"
    });
  };

  const handleAdminNavigate = () => {
    setSelectedContext({
      name: "admin",
      type: "admin",
      section: "dashboard"
    });
  };

  const isAdmin = true;

  // Handle hover for collapse button
  const handleMouseEnter = useCallback(() => {
    setShowCollapseButton(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowCollapseButton(false);
  }, []);

  return (
    <>
      {/* Extended hover area for collapse button - larger trigger zone */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: -60, // Extend hover area beyond sidebar
          width: 120, // Much larger hover area
          height: "100%",
          zIndex: 999,
          pointerEvents: showCollapseButton ? "none" : "auto" // Disable when button is visible
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      <Box
        sx={{
          width: 280,
          height: "100%",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          borderRight: "1px solid",
          borderColor: "divider"
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Collapse Button - improved positioning and z-index */}
        <Zoom in={showCollapseButton}>
          <Fab
            size="small"
            onClick={onCollapse}
            sx={{
              position: "absolute",
              top: 16,
              right: -24, // Moved slightly closer for easier access
              zIndex: 1001, // Higher than any tooltips
              width: 36, // Slightly larger for easier clicking
              height: 36,
              minHeight: 36,
              bgcolor: "primary.main",
              color: "white",
              boxShadow: 3,
              "&:hover": {
                bgcolor: "primary.dark",
                boxShadow: 6
              }
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </Fab>
        </Zoom>

        {/* Navigation - preserve exact same positioning as compact mode */}
        <Box sx={{ 
          flex: 1, 
          overflow: "auto", 
          display: "flex",
          flexDirection: "column",
          py: 2,  // Same as compact mode
          gap: 2, // Same as compact mode
          position: "relative"
        }}>
          {/* Home */}
          <Box 
            sx={{ 
              display: "flex", 
              alignItems: "center",
              cursor: "pointer",
              borderRadius: 1,
              "&:hover": {
                bgcolor: "action.hover"
              },
              position: "relative"
            }}
            onClick={() => handleNavigate(homeContext as TopicContext)}
          >
            {/* Icon area - exact same positioning as compact mode */}
            <Box
              sx={{
                width: 72, // Exact same width as compact sidebar
                display: "flex",
                justifyContent: "center", // Center icon exactly like compact mode
                alignItems: "center",
                position: "relative",
                flexShrink: 0,
                "&::after": selectedContext?.name === "home" && selectedContext?.type === "home" ? {
                  content: '""',
                  position: "absolute",
                  bottom: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "60%",
                  height: 3,
                  bgcolor: "primary.main",
                  borderRadius: "2px 2px 0 0"
                } : {}
              }}
            >
              <Badge
                variant="dot"
                color="error"
                invisible={!hasHomeNotifications()}
                sx={{
                  '& .MuiBadge-badge': {
                    width: 8,
                    height: 8,
                    minWidth: 8
                  }
                }}
              >
                <IconButton
                  color="primary"
                  size="large"
                  sx={{ pointerEvents: "none" }}
                >
                  <HomeIcon />
                </IconButton>
              </Badge>
            </Box>
            
            {/* Text area - only visible in expanded mode */}
            <Box sx={{ 
              flex: 1,
              pl: 1, // Small padding from icon area
              overflow: "hidden"
            }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: selectedContext?.name === "home" ? 600 : 400,
                  color: "text.primary"
                }}
              >
                {intl.formatMessage({ id: "sidebar.home", defaultMessage: "Home" })}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mx: 2 }} />

          {/* Apply the same pattern to all other items */}
          {WorkspaceContexts.map(workspaceContext => {
            const workspace = workspaces.find(w => w.id === workspaceContext.id);
            const imageUrl = getWorkspaceIcon(workspaceContext.id || '') || workspace?.image;
            const workspaceNameInitial = workspaceContext.name[0]?.toUpperCase();
            const hasNotifications = hasWorkspaceNotifications(workspaceContext.id || '');
            const displayName = workspace?.name || workspaceContext.name;

            return (
              <Box 
                key={`workspace-${workspaceContext.id || workspaceContext.name}`}
                sx={{ 
                  display: "flex", 
                  alignItems: "center",
                  cursor: "pointer",
                  borderRadius: 1,
                  "&:hover": {
                    bgcolor: "action.hover"
                  },
                  position: "relative"
                }}
                onClick={() => handleNavigate(workspaceContext)}
                onContextMenu={(e) => handleContextMenu(e, workspaceContext)}
              >
                {/* Icon area - exact same positioning as compact mode */}
                <Box
                  sx={{
                    width: 72, // Exact same width as compact sidebar
                    display: "flex",
                    justifyContent: "center", // Center icon exactly like compact mode
                    alignItems: "center",
                    position: "relative",
                    flexShrink: 0,
                    "&::after": isContextSelected(workspaceContext) ? {
                      content: '""',
                      position: "absolute",
                      bottom: -8,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "60%",
                      height: 3,
                      bgcolor: "primary.main",
                      borderRadius: "2px 2px 0 0"
                    } : {}
                  }}
                >
                  <Badge
                    variant="dot"
                    color="error"
                    invisible={!hasNotifications}
                    sx={{
                      '& .MuiBadge-badge': {
                        width: 8,
                        height: 8,
                        minWidth: 8
                      }
                    }}
                  >
                    <IconButton
                      color="primary"
                      size="large"
                      sx={{ pointerEvents: "none" }}
                    >
                      {imageUrl ? (
                        <Avatar src={imageUrl} sx={{ width: 24, height: 24 }}>
                          {workspaceNameInitial || <GroupIcon fontSize="small" />}
                        </Avatar>
                      ) : workspaceNameInitial ? (
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.875rem' }}>
                          {workspaceNameInitial}
                        </Avatar>
                      ) : (
                        <GroupIcon />
                      )}
                    </IconButton>
                  </Badge>
                </Box>
                
                {/* Text area - only visible in expanded mode */}
                <Box sx={{ 
                  flex: 1,
                  pl: 1, // Small padding from icon area
                  overflow: "hidden"
                }}>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      fontWeight: isContextSelected(workspaceContext) ? 600 : 400,
                      color: "text.primary"
                    }}
                  >
                    {displayName}
                  </Typography>
                  {workspaceContext.id && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontSize: '0.75rem'
                      }}
                    >
                      {workspaceContext.id.slice(0, 8)}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}

          {/* Add Workspace */}
          {user && (
            <Box 
              sx={{ 
                display: "flex", 
                alignItems: "center",
                cursor: "pointer",
                borderRadius: 1,
                "&:hover": {
                  bgcolor: "action.hover"
                },
                position: "relative"
              }}
              onClick={handleAddTeam}
            >
              <Box
                sx={{
                  width: 72, // Exact same width as compact sidebar
                  display: "flex",
                  justifyContent: "center", // Center icon exactly like compact mode
                  alignItems: "center",
                  flexShrink: 0
                }}
              >
                <IconButton
                  color="primary"
                  size="large"
                  sx={{ pointerEvents: "none" }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
              <Box sx={{ ml: 1, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.primary"
                  }}
                >
                  {intl.formatMessage({ id: "workspace.create.title", defaultMessage: "Add Workspace" })}
                </Typography>
              </Box>
            </Box>
          )}

          <Divider sx={{ mx: 2 }} />

          {/* Calendar */}
          {user && (
            <Box 
              sx={{ 
                display: "flex", 
                alignItems: "center",
                cursor: "pointer",
                borderRadius: 1,
                "&:hover": {
                  bgcolor: "action.hover"
                },
                position: "relative"
              }}
              onClick={handleCalendarNavigate}
            >
              <Box
                sx={{
                  width: 72, // Exact same width as compact sidebar
                  display: "flex",
                  justifyContent: "center", // Center icon exactly like compact mode
                  alignItems: "center",
                  position: "relative",
                  flexShrink: 0,
                  "&::after": selectedContext?.name === "calendar" && selectedContext?.type === "calendar" ? {
                    content: '""',
                    position: "absolute",
                    bottom: -8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "60%",
                    height: 3,
                    bgcolor: "primary.main",
                    borderRadius: "2px 2px 0 0"
                  } : {}
                }}
              >
                <IconButton
                  color="primary"
                  size="large"
                  sx={{ pointerEvents: "none" }}
                >
                  <CalendarTodayIcon />
                </IconButton>
              </Box>
              <Box sx={{ ml: 1, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: selectedContext?.name === "calendar" ? 600 : 400,
                    color: "text.primary"
                  }}
                >
                  {intl.formatMessage({ id: "calendar.title", defaultMessage: "Calendar" })}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Admin Panel */}
          {user && isAdmin && (
            <Box 
              sx={{ 
                display: "flex", 
                alignItems: "center",
                cursor: "pointer",
                borderRadius: 1,
                "&:hover": {
                  bgcolor: "action.hover"
                },
                position: "relative"
              }}
              onClick={handleAdminNavigate}
            >
              <Box
                sx={{
                  width: 72, // Exact same width as compact sidebar
                  display: "flex",
                  justifyContent: "center", // Center icon exactly like compact mode
                  alignItems: "center",
                  position: "relative",
                  flexShrink: 0,
                  "&::after": selectedContext?.name === "admin" && selectedContext?.type === "admin" ? {
                    content: '""',
                    position: "absolute",
                    bottom: -8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "60%",
                    height: 3,
                    bgcolor: "primary.main",
                    borderRadius: "2px 2px 0 0"
                  } : {}
                }}
              >
                <IconButton
                  color="primary"
                  size="large"
                  sx={{ pointerEvents: "none" }}
                >
                  <AdminPanelSettingsIcon />
                </IconButton>
              </Box>
              <Box sx={{ ml: 1, flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: selectedContext?.name === "admin" ? 600 : 400,
                    color: "text.primary"
                  }}
                >
                  {intl.formatMessage({ id: "admin.title", defaultMessage: "Admin Panel" })}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* UserInfoBar at bottom */}
        <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
          <UserInfoBar 
            onAgentToggle={onAgentToggle}
            agentOverlayVisible={agentOverlayVisible}
          />
        </Box>
      </Box>

      {/* Existing menus and dialogs */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleExitWorkspaceClick}>
          {intl.formatMessage({ id: "workspace.exit.title", defaultMessage: "Exit Workspace" })}
        </MenuItem>
      </Menu>

      <AddTeamDialog
        open={showAddTeamDialog}
        onClose={() => setShowAddTeamDialog(false)}
        onWorkspaceAdded={handleTeamAdded}
      />

      <ExitWorkspaceDialog
        open={showExitDialog}
        onClose={() => {
          setShowExitDialog(false);
          setWorkspaceToExit(null);
        }}
        onConfirm={handleConfirmExit}
        workspace={workspaceToExit}
      />
    </>
  );
}

export default ExpandedTabs;

import { Box, Tooltip, IconButton, Menu, MenuItem } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import AddIcon from "@mui/icons-material/Add";
import GroupIcon from "@mui/icons-material/Group";
import { useState, useEffect, useRef } from "react";
import { useTopicStore, TopicContext } from "@/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/stores/Workspace/WorkspaceStore";
import { useUserStore } from "@/stores/User/UserStore";
import AddTeamDialog from "@/components/Dialog/AddWorkspaceDialog";
import ExitWorkspaceDialog from "@/components/Dialog/ExitWorkspace";
import { getUserFromStore } from "@/utils/user";
import { IWorkspace } from "../../../../types/Workspace/Workspace";
import { useChatStore } from "@/stores/Chat/ChatStore";
import { useIntl } from "react-intl";

function SidebarTabs() {
  const { selectedContext, contexts, setSelectedContext, removeContext, addContext } = useTopicStore();
  const { workspaces, getWorkspace, exitWorkspace, isLoading, setWorkspaceCreatedCallback } = useWorkspaceStore();
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
  const homeContext = contexts.find(context => context.name === "home" && context.type === "home") || contexts[0];

  // Handle login/logout transitions
  useEffect(() => {
    const previousUser = previousUserRef.current;
    previousUserRef.current = user;

    // If user logged out
    if (previousUser && !user) {
      // Navigate to home
      setSelectedContext(homeContext);

      // Remove workspace contexts from TopicStore manually
      const workspaceContexts = [...contexts].filter(ctx => ctx.type === "workspace");
      workspaceContexts.forEach(ctx => removeContext(ctx));

      // Clear workspaces in the WorkspaceStore
      useWorkspaceStore.setState({ workspaces: [] });
    }

    // If user logged in
    if (!previousUser && user && user.id) {
      getWorkspace(user.id);
    }
  }, [user, homeContext, setSelectedContext, removeContext, contexts, getWorkspace]);

  // Fetch workspaces when component mounts (if user is logged in)
  useEffect(() => {
    const currentUser = getUserFromStore();
    if (currentUser?.id) {
      getWorkspace(currentUser.id);
    }
  }, [getWorkspace]);

  // Sync workspaces to contexts (only add new ones, removal is handled in logout)
  useEffect(() => {
    if (!user) return;

    // Add workspaces that aren't in the context list yet
    workspaces.forEach(workspace => {
      const existingContext = contexts.find(
        context => context.type === "workspace" && context.id === workspace.id
      );

      if (!existingContext) {
        addContext({
          id: workspace.id,
          name: workspace.name,
          type: "workspace"
        });
      }
    });
  }, [workspaces, contexts, addContext, user]);

  // Filter workspace contexts
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

  const handleNavigate = (context: TopicContext) => {
    const isSameContext = context.id && selectedContext?.id
      ? selectedContext.id === context.id
      : selectedContext?.name === context.name && selectedContext?.type === context.type;

    if (isSameContext) {
      return;
    }

    // Clear irrelevant topic selections when switching context types
    if (context.type !== selectedContext?.type) {
      // Reset any selected topics tied to the previous context
      const currentTopics = useTopicStore.getState().selectedTopics;
      Object.keys(currentTopics).forEach(section => {
        if (
          (context.type === "home" && section.startsWith("workspace:")) ||
          (context.type === "workspace" && section === "agents")
        ) {
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
    } else if (context.type === "home") {
      const lastHomeSection = useTopicStore.getState().lastSections['home'];

      setSelectedContext({
        ...context,
        section: lastHomeSection || 'agents'
      });

      const currentUser = getUserFromStore();
      if (currentUser?.id) {
        useChatStore.getState().getChat(currentUser.id, 'agent');
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
        setSelectedContext(homeContext);
      }

      // Refresh workspaces after exiting
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
        section: "workspace:chat"
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
          section: "workspace:chat"
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

  return (
    <>
      <Box
        sx={{
          width: 72,
          height: "100%",
          bgcolor: "background.paper",
          borderRight: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 2,
          gap: 2
        }}
      >
        <Tooltip title="Home" placement="right">
          <Box
            sx={{
              borderBottom: selectedContext?.name === "home" && selectedContext?.type === "home"
                ? "3px solid"
                : "3px solid transparent",
              borderColor: selectedContext?.name === "home" && selectedContext?.type === "home"
                ? "primary.main"
                : "transparent",
              borderRadius: 0,
            }}
          >
            <IconButton
              color="primary"
              size="large"
              onClick={() => handleNavigate(homeContext)}
            >
              <HomeIcon />
            </IconButton>
          </Box>
        </Tooltip>

        {WorkspaceContexts.map(workspaceContext => (
          <Tooltip
            key={workspaceContext.id || `workspace-${workspaceContext.name}`}
            title={`${intl.formatMessage({ id: "workspace.title", defaultMessage: "Workspace" })}: ${workspaceContext.name}${workspaceContext.id ? ` (${workspaceContext.id.slice(0, 8)})` : ''}`}
            placement="right"
          >
            <Box
              sx={{
                position: 'relative',
                borderBottom: isContextSelected(workspaceContext)
                  ? "3px solid"
                  : "3px solid transparent",
                borderColor: isContextSelected(workspaceContext)
                  ? "primary.main"
                  : "transparent",
                borderRadius: 0,
              }}
              onContextMenu={(e) => handleContextMenu(e, workspaceContext)}
            >
              <IconButton
                color="primary"
                size="large"
                onClick={() => handleNavigate(workspaceContext)}
              >
                <GroupIcon />
              </IconButton>
            </Box>
          </Tooltip>
        ))}

        {user && (
          <Tooltip title={intl.formatMessage({ id: "workspace.create.title", defaultMessage: "Add Workspace" })} placement="right">
            <Box>
              <IconButton
                color="primary"
                size="large"
                onClick={handleAddTeam}
              >
                <AddIcon />
              </IconButton>
            </Box>
          </Tooltip>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleExitWorkspaceClick}>{intl.formatMessage({ id: "workspace.exit.title", defaultMessage: "Exit Workspace" })}</MenuItem>
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

export default SidebarTabs;
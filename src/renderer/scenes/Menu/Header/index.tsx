import { Box, Typography, IconButton, Menu } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import AddNewFriend from "@/renderer/components/Dialog/AddNewFriend";
import HomeMenuItems, { renderCategoryActions } from "./MenuItems/HomeMenuItems";
import WorkspaceMenuItems, { RenderWorkspaceActions } from "./MenuItems/WorkspaceMenuItems";
import SettingsMenuItems, { renderSettingsActions } from "./MenuItems/SettingsMenuItems";
import CalendarMenuItems, { RenderCalendarActions } from "./MenuItems/CalendarMenuItem";
import DefaultMenuItems from "./MenuItems/DefaultMenuItems";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import AdminMenuItems, { renderAdminActions } from "./MenuItems/AdminMenuItems";
import PortalMenuItems, { renderPortalActions } from "./MenuItems/PortalMenuItems";
import DocsMenuItems, { renderDocsActions } from "./MenuItems/DocsMenuItems";

function MenuHeader() {
  const user = useUserStore((state) => state.user);
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);
  const createChat = useChatStore((state) => state.createChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
  const open = Boolean(anchorEl) || Boolean(menuPosition);
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);
  const isLocal = user?.id ? false : true

  // Parse section from the context
  const selectedSection = selectedContext?.type === 'workspace' ?
    selectedContext.section?.split(':')[1] || null :
    selectedContext?.type === 'settings' ?
      selectedContext.section || null :
      selectedContext?.type === 'calendar' ?
        selectedContext.section?.split(':')[1] || null :
      selectedContext?.type === 'docs' ?
        selectedContext.section || null : null;

  // For home context, use section directly as category
  const selectedCategory = selectedContext?.type === 'home' ?
    selectedContext.section || null : null;

  const handleCategorySelect = (category: string) => {
    if (selectedContext) {
      setSelectedContext({
        ...selectedContext,
        section: category
      });
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuPosition(null);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setMenuPosition(null);
    // Ensure focus is properly managed when menu closes
    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur();
    }
  };

  // FIXME: only for home context
  const handleCreateChat = async () => {
    setSelectedContext({
      type: 'home',
      name: 'home',
      section: 'agents'
    });

    // Create the chat and get the new chat data
    const newChat = await createChat(
      user?.id || "guest",
      'agent',
      undefined,
    );

    // Use the returned chat data directly
    if (newChat?.id) {
      setSelectedTopic('agents', newChat.id);
      setActiveChat(newChat.id, 'home:home');
    }
  };

  const handleWorkspaceAction = (action: string) => {
    console.log('Workspace action:', action);
  };

  const handleCalendarAction = (action: string) => {
    console.log('Calendar action:', action);
  };

  const handleDocsAction = (action: string) => {
    console.log('Docs action:', action);
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    setAnchorEl(null);
    setMenuPosition({
      top: event.clientY,
      left: event.clientX,
    });
  };

  const renderMenuItems = () => {
    switch (selectedContext?.type) {
      case 'home':
        return <HomeMenuItems
          handleClose={handleClose}
          setSelectedCategory={handleCategorySelect}
          selectedCategory={selectedCategory}
        />;
      case 'workspace':
        return <WorkspaceMenuItems
          handleClose={handleClose}
        />;
      case 'calendar':
        return <CalendarMenuItems
          handleClose={handleClose}
        />;
      case 'settings':
        return <SettingsMenuItems
          handleClose={handleClose}
        />;
      case 'docs':
        return <DocsMenuItems
          handleClose={handleClose}
        />;
      case 'admin':
        return <AdminMenuItems
          handleClose={handleClose}
        />;
      case 'portal':
        return <PortalMenuItems
          handleClose={handleClose}
        />;
      default:
        return <DefaultMenuItems
          handleClose={handleClose}
        />;
    }
  };

  const renderHeaderTitle = () => {
    if (selectedContext?.type === 'workspace') {
      return (
        <>
          {selectedContext.name || <FormattedMessage id="menu.workspace" />}
          {selectedSection && (
            <> / <FormattedMessage id={`menu.workspace.${selectedSection}`} /></>
          )}
        </>
      );
    } else if (selectedContext?.type === 'calendar') {
      return (
        <>
          <FormattedMessage id="menu.calendar" />
          {selectedSection && (
            <> / <FormattedMessage id={`menu.calendar.${selectedSection}`} /></>
          )}
        </>
      );
    } else if (selectedContext?.type === 'settings') {
      return (
        <>
          <FormattedMessage id="menu.settings" />
          {selectedSection && (
            <> / <FormattedMessage id={`settings.${selectedSection}`} /></>
          )}
        </>
      );
    } else if (selectedContext?.type === 'docs') {
      return (
        <>
          <FormattedMessage id="menu.docs" />
          {selectedSection && (
            <> / <FormattedMessage id={`docs.${selectedSection}`} /></>
          )}
        </>
      );
    } else if (selectedContext?.type === 'admin') {
      return (
        <>
          <FormattedMessage id="menu.admin" />
          {selectedSection && (
            <> / <FormattedMessage id={`admin.${selectedSection}`} /></>
          )}
        </>
      );
    } else if (selectedContext?.type === 'portal') {
      return (
        <>
          <FormattedMessage id="menu.portal" />
          {selectedSection && (
            <> / <FormattedMessage id={`portal.${selectedSection}`} /></>
          )}
        </>
      );
    } else {
      return (
        <>
          <FormattedMessage id={`menu.${selectedContext?.name}`} />
          {selectedCategory && selectedContext?.type === 'home' && (
            <> / <FormattedMessage id={`menu.home.${selectedCategory}`} /></>
          )}
        </>
      );
    }
  };

  const actionBarBoxStyles = {
    display: 'flex',
    py: 0.5,
    px: 2,
    minHeight: '32px',
    backgroundColor: 'inherit',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        overflow: 'hidden'
      }}
      onContextMenu={handleContextMenu}
    >
      <Box sx={{
        borderBottom: 1,
        borderColor: "divider",
        width: '100%',
        overflow: 'hidden'
      }}>
        <Box sx={{
          px: 2,
          py: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: '100%',
          pb: ((selectedCategory && selectedContext?.type === 'home') ||
            (selectedSection && (selectedContext?.type === 'workspace' || selectedContext?.type === 'settings' || selectedContext?.type === 'calendar' || selectedContext?.type === 'admin' || selectedContext?.type === 'docs'))) ? 0 : 1
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {renderHeaderTitle()}
          </Typography>

          <IconButton onClick={handleClick} size="small">
            <MoreVertIcon />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            anchorReference={menuPosition ? 'anchorPosition' : 'anchorEl'}
            anchorPosition={menuPosition || undefined}
            open={open}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            disableAutoFocus
            disableEnforceFocus
            disableRestoreFocus
          >
            {renderMenuItems()}
          </Menu>
        </Box>

        {(() => {
          if (selectedContext?.type === 'home' && selectedCategory) {
            const homeActionContent = renderCategoryActions({
              selectedCategory,
              setShowAddFriendDialog,
              handleCreateChat
            });
            return homeActionContent ? <Box sx={actionBarBoxStyles}>{homeActionContent}</Box> : null;
          }

          if (selectedContext?.type === 'workspace' && selectedSection) {
            return <RenderWorkspaceActions
              selectedSection={selectedSection}
              handleAction={handleWorkspaceAction}
            />;
          }

          if (selectedContext?.type === 'calendar' && selectedSection) {
            return <RenderCalendarActions
              selectedSection={selectedSection}
              handleAction={handleCalendarAction}
            />;
          }

          if (selectedContext?.type === 'settings' && selectedSection) {
            const settingsActionContent = renderSettingsActions({
              selectedSection,
              handleAction: (action) => console.log('Settings action:', action)
            });
            return settingsActionContent ? <Box sx={actionBarBoxStyles}>{settingsActionContent}</Box> : null;
          }

          if (selectedContext?.type === 'docs' && selectedSection) {
            const docsActionContent = renderDocsActions({
              selectedSection,
              handleAction: handleDocsAction
            });
            return docsActionContent ? <Box sx={actionBarBoxStyles}>{docsActionContent}</Box> : null;
          }

          if (selectedContext?.type === 'admin' && selectedSection) {
            const adminActionContent = renderAdminActions({
              selectedSection,
              handleAction: (action) => console.log('Admin action:', action)
            });
            return adminActionContent ? <Box sx={actionBarBoxStyles}>{adminActionContent}</Box> : null;
          }

          if (selectedContext?.type === 'portal' && selectedSection) {
            const portalActionContent = renderPortalActions({
              selectedSection,
              handleAction: (action) => console.log('Portal action:', action)
            });
            return portalActionContent ? <Box sx={actionBarBoxStyles}>{portalActionContent}</Box> : null;
          }

          return null;
        })()}
      </Box>

      <AddNewFriend
        open={showAddFriendDialog}
        onClose={() => setShowAddFriendDialog(false)}
      />
    </Box>
  );
}

export default MenuHeader;

import { Box, Typography, Divider, IconButton, Badge } from '@mui/material';
import { useState } from 'react';
import { Menu as MuiMenu, MenuItem } from '@mui/material';
import {
  Close,
  Remove,
  CropSquare,
  Undo,
  Redo,
  ContentCut,
  ContentCopy,
  ContentPaste,
  SelectAll,
  Refresh,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  Code,
  Notifications
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import NotificationView from "@/renderer/components/Dialog/NotificationView";

const TitleBar = () => {
  const intl = useIntl();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Subscribe to notification store to get live updates
  const totalNotificationCount = useNotificationStore((state) =>
    state.notifications.filter(n => !n.read).length
  );

  // Get current topic context
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const getWorkspaceById = useWorkspaceStore((state) => state.getWorkspaceById);

  // Function to get current topic display name
  const getCurrentTopicName = () => {
    if (!selectedContext) return intl.formatMessage({ id: 'titleBar.topic.home' });

    switch (selectedContext.type) {
      case 'home':
        return intl.formatMessage({ id: 'titleBar.topic.home' });
      case 'workspace':
        if (selectedContext.id) {
          const workspace = getWorkspaceById(selectedContext.id);
          return workspace?.name || intl.formatMessage({ id: 'titleBar.topic.workspace' });
        }
        return intl.formatMessage({ id: 'titleBar.topic.workspace' });
      case 'settings':
        return intl.formatMessage({ id: 'titleBar.topic.settings' });
      case 'file':
        return intl.formatMessage({ id: 'titleBar.topic.file' });
      case 'playground':
        return intl.formatMessage({ id: 'titleBar.topic.playground' });
      case 'calendar':
        return intl.formatMessage({ id: 'titleBar.topic.calendar' });
      case 'workspace:calendar':
        return intl.formatMessage({ id: 'titleBar.topic.calendar' });
      default:
        return selectedContext.name || selectedContext.type;
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, menuType: string) => {
    setAnchorEl(event.currentTarget);
    setActiveMenu(menuType);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setActiveMenu(null);
  };

  const handleMenuAction = (action: string) => {
    window.electron.ipcRenderer.invoke('menu-action', action);
    handleClose();
  };

  const handleWindowAction = (action: string) => {
    window.electron.ipcRenderer.invoke('window-action', action);
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
          height: 32,
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          WebkitAppRegion: 'drag',
          userSelect: 'none',
          position: 'relative',
        }}
      >
        {/* Menu Items (left side) */}
        <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
          {/* File Menu */}
          <Box
            sx={{
              px: 1,
              py: 0.5,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              bgcolor: activeMenu === 'file' ? 'action.selected' : 'transparent',
            }}
            onClick={(e) => handleMenuClick(e, 'file')}
          >
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
              {intl.formatMessage({ id: 'titleBar.menu.file' })}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1,
              py: 0.5,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              bgcolor: activeMenu === 'edit' ? 'action.selected' : 'transparent',
            }}
            onClick={(e) => handleMenuClick(e, 'edit')}
          >
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
              {intl.formatMessage({ id: 'titleBar.menu.edit' })}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1,
              py: 0.5,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              bgcolor: activeMenu === 'view' ? 'action.selected' : 'transparent',
            }}
            onClick={(e) => handleMenuClick(e, 'view')}
          >
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
              {intl.formatMessage({ id: 'titleBar.menu.view' })}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1,
              py: 0.5,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              bgcolor: activeMenu === 'help' ? 'action.selected' : 'transparent',
            }}
            onClick={(e) => handleMenuClick(e, 'help')}
          >
            <Typography variant="body2" sx={{ fontSize: '13px' }}>
              {intl.formatMessage({ id: 'titleBar.menu.help' })}
            </Typography>
          </Box>
        </Box>

        {/* App Title with Topic Info (center) */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontSize: '13px', color: 'text.secondary' }}>
            {intl.formatMessage({ id: 'titleBar.appName' })}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '12px', color: 'text.disabled' }}>
            [{getCurrentTopicName()}]
          </Typography>
        </Box>

        {/* Window Controls (right side) */}
        <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
          {/* Notification Button */}
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
              sx={{
                width: 32,
                height: 32,
                '&:hover': { bgcolor: 'action.hover' },
              }}
              title={intl.formatMessage({ id: 'titleBar.notifications' })}
            >
              <Notifications sx={{ fontSize: 16 }} />
            </IconButton>
          </Badge>

          <Box
            sx={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => handleWindowAction('minimize')}
            title={intl.formatMessage({ id: 'titleBar.minimize' })}
          >
            <Remove sx={{ fontSize: 16 }} />
          </Box>
          <Box
            sx={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => handleWindowAction('maximize')}
            title={intl.formatMessage({ id: 'titleBar.maximize' })}
          >
            <CropSquare sx={{ fontSize: 14 }} />
          </Box>
          <Box
            sx={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
            }}
            onClick={() => handleWindowAction('close')}
            title={intl.formatMessage({ id: 'titleBar.close' })}
          >
            <Close sx={{ fontSize: 16 }} />
          </Box>
        </Box>

        {/* File Menu Dropdown */}
        <MuiMenu
          anchorEl={anchorEl}
          open={activeMenu === 'file'}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <MenuItem onClick={() => handleMenuAction('file:open')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.file.open' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlO' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('file:close')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.file.close' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlQ' })}
            </Typography>
          </MenuItem>
        </MuiMenu>

        {/* Edit Menu Dropdown */}
        <MuiMenu
          anchorEl={anchorEl}
          open={activeMenu === 'edit'}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <MenuItem onClick={() => handleMenuAction('edit:undo')}>
            <Undo sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.edit.undo' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlZ' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('edit:redo')}>
            <Redo sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.edit.redo' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlY' })}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleMenuAction('edit:cut')}>
            <ContentCut sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.edit.cut' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlX' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('edit:copy')}>
            <ContentCopy sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.edit.copy' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlC' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('edit:paste')}>
            <ContentPaste sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.edit.paste' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlV' })}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleMenuAction('edit:select-all')}>
            <SelectAll sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.edit.selectAll' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlA' })}
            </Typography>
          </MenuItem>
        </MuiMenu>

        {/* View Menu Dropdown */}
        <MuiMenu
          anchorEl={anchorEl}
          open={activeMenu === 'view'}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <MenuItem onClick={() => handleMenuAction('view:reload')}>
            <Refresh sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.view.reload' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlR' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('view:fullscreen')}>
            <Fullscreen sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.view.toggleFullscreen' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.f11' })}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleMenuAction('view:zoom-in')}>
            <ZoomIn sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.view.zoomIn' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlPlus' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('view:zoom-out')}>
            <ZoomOut sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.view.zoomOut' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlMinus' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('view:reset-zoom')}>
            <Typography variant="body2" sx={{ ml: 3 }}>
              {intl.formatMessage({ id: 'titleBar.view.resetZoom' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrl0' })}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleMenuAction('view:toggle-devtools')}>
            <Code sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.view.toggleDevTools' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.f12' })}
            </Typography>
          </MenuItem>
        </MuiMenu>

        {/* Help Menu Dropdown */}
        <MuiMenu
          anchorEl={anchorEl}
          open={activeMenu === 'help'}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <MenuItem onClick={() => handleMenuAction('help:learn-more')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.help.learnMore' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('help:documentation')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.help.documentation' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('help:community')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.help.community' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('help:issues')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.help.reportIssues' })}
            </Typography>
          </MenuItem>
        </MuiMenu>
      </Box>

      <NotificationView
        open={showNotifications}
        onClose={handleCloseNotifications}
      />
    </>
  );
};

export default TitleBar;
import { Box, Typography, IconButton, Menu as MuiMenu, MenuItem, Divider, Badge, Avatar } from '@mui/material';
import { useState } from 'react';
import {
  Menu as MenuIcon,
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
  Notifications,
  AccountTree,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";

interface CollapsedMenuProps {
  appIcon?: string | null;
  totalNotificationCount: number;
  onNotificationClick: () => void;
  onWindowAction: (action: string) => void;
  onMenuAction: (action: string) => void;
}

const CollapsedMenu = ({ 
  appIcon, 
  totalNotificationCount, 
  onNotificationClick, 
  onWindowAction, 
  onMenuAction 
}: CollapsedMenuProps) => {
  const intl = useIntl();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuAction = (action: string) => {
    onMenuAction(action);
    handleClose();
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
        {/* Left side - App Icon and Hamburger Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, WebkitAppRegion: 'no-drag' }}>
          {appIcon && (
            <Avatar 
              src={appIcon} 
              sx={{ 
                width: 20, 
                height: 20,
                mr: 1
              }}
            />
          )}
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{
              width: 24,
              height: 24,
              '&:hover': { bgcolor: 'action.hover' },
            }}
            title={intl.formatMessage({ id: 'titleBar.menu' })}
          >
            <MenuIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Draggable center area */}
        <Box sx={{ flex: 1, WebkitAppRegion: 'drag' }} />

        {/* Right side - Notifications and Window Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag', pr: 1 }}>
          {/* Notification Button */}
          <Box sx={{ mr: 1 }}>
            <Badge
              badgeContent={totalNotificationCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.65rem',
                  height: 14,
                  minWidth: 14,
                  padding: '0 3px',
                  top: 6,
                  right: 6,
                  borderRadius: '7px'
                }
              }}
            >
              <IconButton
                size="small"
                onClick={onNotificationClick}
                sx={{
                  width: 28,
                  height: 28,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                title={intl.formatMessage({ id: 'titleBar.notifications' })}
              >
                <Notifications sx={{ fontSize: 16 }} />
              </IconButton>
            </Badge>
          </Box>

          {/* Window Control Buttons */}
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
            onClick={() => onWindowAction('minimize')}
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
            onClick={() => onWindowAction('maximize')}
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
            onClick={() => onWindowAction('close')}
            title={intl.formatMessage({ id: 'titleBar.close' })}
          >
            <Close sx={{ fontSize: 16 }} />
          </Box>
        </Box>

        {/* Collapsed Menu Dropdown */}
        <MuiMenu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          sx={{
            '& .MuiPaper-root': {
              minWidth: 200,
              maxHeight: 400,
              overflowY: 'auto'
            }
          }}
        >
          {/* File Menu Section */}
          <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
            {intl.formatMessage({ id: 'titleBar.menu.file' })}
          </Typography>
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
          
          <Divider />

          {/* Edit Menu Section */}
          <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
            {intl.formatMessage({ id: 'titleBar.menu.edit' })}
          </Typography>
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
          <MenuItem onClick={() => handleMenuAction('edit:select-all')}>
            <SelectAll sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.edit.selectAll' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.ctrlA' })}
            </Typography>
          </MenuItem>

          <Divider />

          {/* View Menu Section */}
          <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
            {intl.formatMessage({ id: 'titleBar.menu.view' })}
          </Typography>
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
          <MenuItem onClick={() => handleMenuAction('view:n8n')}>
            <AccountTree sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.view.n8n' })}
            </Typography>
          </MenuItem>
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
          <MenuItem onClick={() => handleMenuAction('view:toggle-devtools')}>
            <Code sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.view.toggleDevTools' })}
            </Typography>
            <Typography variant="caption" sx={{ ml: 'auto', color: 'text.secondary' }}>
              {intl.formatMessage({ id: 'titleBar.shortcut.f12' })}
            </Typography>
          </MenuItem>

          <Divider />

          {/* Help Menu Section */}
          <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', fontWeight: 'bold', color: 'text.secondary' }}>
            {intl.formatMessage({ id: 'titleBar.menu.help' })}
          </Typography>
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
          <MenuItem onClick={() => handleMenuAction('help:issues')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.help.reportIssues' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('help:disclaimer')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.help.disclaimer' })}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => handleMenuAction('help:about')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.help.about' })}
            </Typography>
          </MenuItem>
        </MuiMenu>
      </Box>
    </>
  );
};

export default CollapsedMenu;

import { Box, Typography, Divider, IconButton, Badge, Avatar, TextField, Autocomplete, Chip, InputAdornment } from '@mui/material';
import { useState, useEffect, useMemo } from 'react';
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
  Notifications,
  AccountTree,
  ArrowBack,
  ArrowForward,
  Search
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import NotificationView from "@/renderer/components/Dialog/NotificationView";
import AboutDialog from "@/renderer/components/Dialog/AboutDialog";
import { useWorkspaceIcons } from '@/renderer/hooks/useWorkspaceIcons';
import { useAppAssets } from '@/renderer/hooks/useAppAssets';
import { useUserStore } from '@/renderer/stores/User/UserStore';

const TitleBar = () => {
  const intl = useIntl();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [appIcon, setAppIcon] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Subscribe to notification store to get live updates
  const totalNotificationCount = useNotificationStore((state) =>
    state.notifications.filter(n => !n.read).length
  );

  // Get current topic context and navigation methods
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const canGoBack = useTopicStore((state) => state.canGoBack());
  const canGoForward = useTopicStore((state) => state.canGoForward());
  const goBack = useTopicStore((state) => state.goBack);
  const goForward = useTopicStore((state) => state.goForward);
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);
  const addToHistory = useTopicStore((state) => state.addToHistory);
  const getWorkspaceById = useWorkspaceStore((state) => state.getWorkspaceById);

  // Get workspaces and user info
  const { workspaces } = useWorkspaceStore();
  const { getWorkspaceIcon } = useWorkspaceIcons(workspaces);
  const user = useUserStore((state) => state.user);

  // Add app assets hook
  const { getAsset } = useAppAssets();

  // Define available contexts for search with sections
  const availableContexts = useMemo(() => {
    const contexts: Array<{
      name: string;
      type: string;
      section: string;
      value: any;
      icon: string | null;
      workspaceId?: string;
    }> = [
      // Core sections
      {
        name: intl.formatMessage({ id: 'titleBar.topic.home' }),
        type: 'home',
        section: 'Core',
        value: { name: 'home', type: 'home', section: 'homepage' },
        icon: null
      },
      {
        name: intl.formatMessage({ id: 'titleBar.topic.playground' }),
        type: 'playground', 
        section: 'Core',
        value: { name: 'playground', type: 'playground' },
        icon: null
      }
    ];

    // Add workspaces if user is logged in
    if (user && workspaces.length > 0) {
      const workspaceContexts = workspaces.map(workspace => ({
        name: workspace.name || 'Unnamed Workspace',
        type: 'workspace',
        section: 'Workspaces',
        value: { 
          id: workspace.id,
          name: workspace.name?.toLowerCase() || 'unnamed workspace',
          type: 'workspace',
          section: 'workspace:chatroom'
        },
        icon: getWorkspaceIcon(workspace.id) || workspace.image,
        workspaceId: workspace.id
      }));
      
      contexts.push(...workspaceContexts);
    }

    return contexts;
  }, [intl, user, workspaces, getWorkspaceIcon]);

  // Group contexts by section
  const groupedContexts = useMemo(() => {
    const groups = availableContexts.reduce((acc, context) => {
      if (!acc[context.section]) {
        acc[context.section] = [];
      }
      acc[context.section].push(context);
      return acc;
    }, {} as Record<string, typeof availableContexts>);

    return groups;
  }, [availableContexts]);

  // Load app icon on component mount
  useEffect(() => {
    const loadAppIcon = async () => {
      try {
        const iconUrl = await getAsset('icon.png');
        if (iconUrl) {
          setAppIcon(iconUrl);
        }
      } catch (error) {
        console.error('Failed to load app icon:', error);
      }
    };
    
    loadAppIcon();
  }, [getAsset]);

  // Function to get current topic display name
  const getCurrentTopicInfo = () => {
    if (!selectedContext) {
      return {
        name: intl.formatMessage({ id: 'titleBar.topic.home' }),
        icon: null
      };
    }

    switch (selectedContext.type) {
      case 'home':
        return {
          name: intl.formatMessage({ id: 'titleBar.topic.home' }),
          icon: null
        };
      case 'workspace':
        if (selectedContext.id) {
          const workspace = getWorkspaceById(selectedContext.id);
          const workspaceIcon = getWorkspaceIcon(selectedContext.id);
          return {
            name: workspace?.name || intl.formatMessage({ id: 'titleBar.topic.workspace' }),
            icon: workspaceIcon
          };
        }
        return {
          name: intl.formatMessage({ id: 'titleBar.topic.workspace' }),
          icon: null
        };
      case 'settings':
        return {
          name: intl.formatMessage({ id: 'titleBar.topic.settings' }),
          icon: null
        };
      case 'file':
        return {
          name: intl.formatMessage({ id: 'titleBar.topic.file' }),
          icon: null
        };
      case 'playground':
        return {
          name: intl.formatMessage({ id: 'titleBar.topic.playground' }),
          icon: null
        };
      case 'calendar':
        return {
          name: intl.formatMessage({ id: 'titleBar.topic.calendar' }),
          icon: null
        };
      case 'workspace:calendar':
        return {
          name: intl.formatMessage({ id: 'titleBar.topic.calendar' }),
          icon: null
        };
      default:
        return {
          name: selectedContext.name || selectedContext.type,
          icon: null
        };
    }
  };

  const currentTopicInfo = getCurrentTopicInfo();

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, menuType: string) => {
    setAnchorEl(event.currentTarget);
    setActiveMenu(menuType);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setActiveMenu(null);
  };

  const handleMenuAction = (action: string) => {
    if (action === 'help:about') {
      setShowAbout(true);
    } else {
      window.electron.ipcRenderer.invoke('menu-action', action);
    }
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

  const handleCloseAbout = () => {
    setShowAbout(false);
  };

  const handleGoBack = () => {
    goBack();
  };

  const handleGoForward = () => {
    goForward();
  };

  const handleContextChange = (event: any, newValue: any) => {
    if (newValue && newValue.value) {
      const contextToSet = newValue.value;
      setSelectedContext(contextToSet);
      addToHistory(contextToSet);
      setSearchOpen(false);
    }
  };

  const getCurrentContextOption = () => {
    if (selectedContext?.type === 'workspace' && selectedContext?.id) {
      return availableContexts.find(ctx => 
        ctx.type === 'workspace' && ctx.workspaceId === selectedContext.id
      ) || undefined;
    }
    return availableContexts.find(ctx => ctx.type === selectedContext?.type) || availableContexts[0] || undefined;
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
        {/* App Icon (leftmost) */}
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
        </Box>

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

        {/* Draggable spacer */}
        <Box sx={{ width: 20, WebkitAppRegion: 'drag' }} />

        {/* Navigation Arrows and Search Bar (center) - with specific drag regions */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: 1,
          position: 'relative'
        }}>
          {/* Draggable area before controls */}
          <Box sx={{ 
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            WebkitAppRegion: 'drag',
            zIndex: 0
          }} />
          
          {/* Navigation and Search Container - no-drag zone */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            WebkitAppRegion: 'no-drag',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Navigation Arrows */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                size="small"
                onClick={handleGoBack}
                disabled={!canGoBack}
                sx={{
                  width: 24,
                  height: 24,
                  mr: 0.5,
                  '&:hover': { bgcolor: 'action.hover' },
                  '&.Mui-disabled': {
                    color: 'action.disabled'
                  }
                }}
                title={intl.formatMessage({ id: 'titleBar.navigation.back' })}
              >
                <ArrowBack sx={{ fontSize: 12 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleGoForward}
                disabled={!canGoForward}
                sx={{
                  width: 24,
                  height: 24,
                  mr: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                  '&.Mui-disabled': {
                    color: 'action.disabled'
                  }
                }}
                title={intl.formatMessage({ id: 'titleBar.navigation.forward' })}
              >
                <ArrowForward sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>

            {/* Context Search Bar */}
            <Autocomplete
              options={availableContexts}
              getOptionLabel={(option) => option.name}
              inputValue={getCurrentContextOption()?.name || ''}
              onInputChange={(event: React.SyntheticEvent, newInputValue: string, reason: string) => {
                // Handle typing if needed
              }}
              onChange={handleContextChange}
              open={searchOpen}
              onOpen={() => setSearchOpen(true)}
              onClose={() => setSearchOpen(false)}
              disableClearable
              size="small"
              groupBy={(option) => option.section}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return option === value;
                return option.type === value.type && 
                       option.workspaceId === value.workspaceId &&
                       option.name === value.name;
              }}
              sx={{
                minWidth: 250,
                maxWidth: 350,
                '& .MuiOutlinedInput-root': {
                  height: 24,
                  fontSize: '13px',
                  paddingLeft: '8px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    border: 'none'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    border: '1px solid',
                    borderColor: 'divider'
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    border: '1px solid',
                    borderColor: 'primary.main'
                  }
                },
                '& .MuiAutocomplete-input': {
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'text.primary',
                  textAlign: 'center',
                  cursor: 'pointer',
                  paddingLeft: '4px !important'
                },
                '& .MuiAutocomplete-endAdornment': {
                  display: 'none'
                },
                '& .MuiInputAdornment-root': {
                  marginRight: '4px'
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  placeholder="Search contexts..."
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Search 
                              sx={{ 
                                fontSize: 14, 
                                color: 'text.secondary',
                                opacity: searchOpen ? 0.8 : 0.6
                              }} 
                            />
                            {getCurrentContextOption()?.icon && (
                              <Avatar 
                                src={getCurrentContextOption()?.icon || ''} 
                                sx={{ 
                                  width: 14, 
                                  height: 14,
                                  fontSize: '8px'
                                }}
                              >
                                {getCurrentContextOption()?.name[0]?.toUpperCase()}
                              </Avatar>
                            )}
                          </Box>
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      cursor: 'pointer'
                    }
                  }}
                />
              )}
              renderGroup={(params) => (
                <Box key={params.group}>
                  <Typography
                    variant="caption"
                    sx={{
                      px: 2,
                      py: 1,
                      display: 'block',
                      fontWeight: 600,
                      color: 'text.secondary',
                      backgroundColor: 'action.hover',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {params.group}
                  </Typography>
                  {params.children}
                </Box>
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {option.icon && (
                    <Avatar 
                      src={option.icon} 
                      sx={{ 
                        width: 16, 
                        height: 16,
                        fontSize: '10px'
                      }}
                    >
                      {option.name[0]?.toUpperCase()}
                    </Avatar>
                  )}
                  <Typography variant="body2" sx={{ fontSize: '13px' }}>
                    {option.name}
                  </Typography>
                </Box>
              )}
            />
          </Box>
        </Box>

        {/* Draggable spacer */}
        <Box sx={{ width: 20, WebkitAppRegion: 'drag' }} />

        {/* Window Controls (right side) */}
        <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag', pr: 1 }}>
          {/* Notification Button with proper spacing */}
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
                onClick={handleNotificationClick}
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
          <MenuItem onClick={() => handleMenuAction('view:n8n')}>
            <AccountTree sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.view.n8n' })}
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
          <MenuItem onClick={() => handleMenuAction('help:issues')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.help.reportIssues' })}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleMenuAction('help:about')}>
            <Typography variant="body2">
              {intl.formatMessage({ id: 'titleBar.help.about' })}
            </Typography>
          </MenuItem>
        </MuiMenu>
      </Box>

      <NotificationView
        open={showNotifications}
        onClose={handleCloseNotifications}
      />

      <AboutDialog
        open={showAbout}
        onClose={handleCloseAbout}
      />
    </>
  );
};

export default TitleBar;
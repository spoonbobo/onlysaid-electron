import { Box, Typography, Divider, IconButton, Badge, Avatar, TextField, Autocomplete, Chip, InputAdornment, useMediaQuery, useTheme } from '@mui/material';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Menu as MuiMenu, MenuItem } from '@mui/material';
import {
  Close,
  Remove,
  CropSquare,
  FilterNone,
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
import DisclaimerDialog from "@/renderer/components/Dialog/Disclaimer/DisclaimerDialog";
import { useAgentStore } from '@/renderer/stores/Agent/AgentStore';
import { useUserTokenStore } from '@/renderer/stores/User/UserToken';
import { useCryptoStore } from '@/renderer/stores/Crypto/CryptoStore';
import { toast } from '@/utils/toast';
import { createNotificationsForUnreadMessages } from '@/utils/notifications';
import CollapsedMenu from './CollapsedMenu';
import { Fade } from '@mui/material';

// Modern titlebar height standards
const TITLEBAR_HEIGHT = 44; // Increased from 32px to 44px for better usability
const COLLAPSE_BREAKPOINT = 800;

const TitleBar = () => {
  const intl = useIntl();
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [appIcon, setAppIcon] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // ✅ Add search input state
  const [searchInputValue, setSearchInputValue] = useState('');
  
  // ✅ Add window state tracking
  const [isWindowMaximized, setIsWindowMaximized] = useState(false);

  // Use media query instead of manual resize handling for better performance
  const isCollapsed = useMediaQuery(`(max-width:${COLLAPSE_BREAKPOINT}px)`);

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

  // Get workspaces and user info with stable references
  const { workspaces } = useWorkspaceStore();
  const stableWorkspaces = useMemo(() => workspaces, [
    workspaces.map(w => `${w.id}-${w.name}-${w.image}`).join(',')
  ]);
  const { getWorkspaceIcon } = useWorkspaceIcons(stableWorkspaces);
  const user = useUserStore((state) => state.user);

  // Add app assets hook
  const { assets } = useAppAssets(); // Only get assets, don't call getAsset

  // Get user and disclaimer state
  const showDisclaimerFromStore = useUserStore((state) => state.showDisclaimer);
  const setShowDisclaimerInStore = useUserStore((state) => state.setShowDisclaimer);
  const isFirstLogin = useUserStore((state) => state.isFirstLogin);

  // Define available contexts for search with sections - memoized for performance
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
        name: intl.formatMessage({ id: 'titleBar.topic.docs' }),
        type: 'docs', 
        section: 'Core',
        // ✅ FIX: Add a default section so header shows just "Documentation"
        value: { name: 'docs', type: 'docs', section: 'docs' },
        icon: null
      }
    ];

    // Add workspaces if user is logged in
    if (user && workspaces.length > 0) {
      const workspaceContexts = workspaces
        .filter(workspace => workspace && workspace.id && workspace.name) // Filter out invalid workspaces
        .map(workspace => ({
          name: workspace.name || `Workspace-${workspace.id.slice(0, 8)}`,
          type: 'workspace',
          section: 'Workspaces',
          value: { 
            id: workspace.id,
            name: workspace.name.toLowerCase(),
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

  // Group contexts by section - memoized
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
    // Simply use the asset if it's already loaded by App.tsx
    if (assets['icon.png']) {
      setAppIcon(assets['icon.png']);
      console.log('[TitleBar] Using preloaded icon from assets');
    } else {
      console.log('[TitleBar] Icon not yet loaded, will update when available');
    }
  }, [assets]); // Only depend on assets

  // ✅ Add window state listener
  useEffect(() => {
    const handleWindowStateChange = (event: any, ...args: unknown[]) => {
      const data = args[0] as { isMaximized: boolean; isMinimized: boolean };
      console.log('[TitleBar] Window state changed:', data);
      setIsWindowMaximized(data.isMaximized);
    };

    // Listen for window state changes
    const unsubscribe = window.electron?.ipcRenderer?.on?.('window:state-changed', handleWindowStateChange);

    // Get initial window state
    const checkInitialState = async () => {
      try {
        const isMaximized = await window.electron?.window?.isMaximized?.();
        if (typeof isMaximized === 'boolean') {
          setIsWindowMaximized(isMaximized);
        }
      } catch (error) {
        console.warn('[TitleBar] Could not get initial window state:', error);
      }
    };

    checkInitialState();

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Optimized event handlers with useCallback
  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>, menuType: string) => {
    setAnchorEl(event.currentTarget);
    setActiveMenu(menuType);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setActiveMenu(null);
    // ✅ Ensure focus returns to appropriate element
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
    }, 0);
  }, []);

  const handleMenuAction = useCallback((action: string) => {
    if (action === 'help:about') {
      setShowAbout(true);
    } else if (action === 'help:disclaimer') {
      setShowDisclaimer(true);
    } else {
      window.electron.ipcRenderer.invoke('menu-action', action);
    }
    handleClose();
  }, [handleClose]);

  // ✅ Update handleWindowAction to handle maximize/restore logic
  const handleWindowAction = useCallback((action: string) => {
    if (action === 'maximize') {
      // The main process will handle the toggle logic (maximize if not maximized, restore if maximized)
      window.electron.ipcRenderer.invoke('window-action', 'maximize');
    } else {
      window.electron.ipcRenderer.invoke('window-action', action);
    }
  }, []);

  const handleNotificationClick = useCallback(() => {
    setShowNotifications(true);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);
  }, []);

  const handleCloseAbout = useCallback(() => {
    setShowAbout(false);
  }, []);

  const handleGoBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleGoForward = useCallback(() => {
    goForward();
  }, [goForward]);

  // ✅ Update onInputChange handler to allow typing
  const handleInputChange = useCallback((event: React.SyntheticEvent, newInputValue: string, reason: string) => {
    if (reason === 'input') {
      setSearchInputValue(newInputValue);
    }
  }, []);

  const handleContextChange = useCallback((event: any, newValue: any) => {
    if (newValue && newValue.value) {
      const contextToSet = newValue.value;
      setSelectedContext(contextToSet);
      addToHistory(contextToSet);
      setSearchOpen(false);
      // ✅ Clear search input after selection
      setSearchInputValue('');
    }
  }, [setSelectedContext, addToHistory]);

  // ✅ Update to handle search open/close and reset input
  const handleSearchOpen = useCallback(() => {
    setSearchOpen(true);
    // Always start with empty input to show all contexts
    setSearchInputValue('');
  }, []);

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
    // Reset to empty when closing without selection
    setSearchInputValue('');
    // ✅ Ensure focus is properly managed
    setTimeout(() => {
      const searchInput = document.querySelector('[role="combobox"]') as HTMLElement;
      if (searchInput && searchInput.blur) {
        searchInput.blur();
      }
    }, 0);
  }, []);

  // Function to get current topic display name - memoized
  const getCurrentTopicInfo = useMemo(() => {
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
      case 'docs':
        return {
          name: intl.formatMessage({ id: 'titleBar.topic.docs' }),
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
      case 'copilot':
        return {
          name: intl.formatMessage({ id: 'titleBar.topic.copilot', defaultMessage: 'AI Copilot' }),
          icon: null
        };
      default:
        return {
          name: selectedContext.name || selectedContext.type,
          icon: null
        };
    }
  }, [selectedContext, getWorkspaceById, getWorkspaceIcon, intl]);

  const getCurrentContextOption = useCallback(() => {
    if (selectedContext?.type === 'workspace' && selectedContext?.id) {
      return availableContexts.find(ctx => 
        ctx.type === 'workspace' && ctx.workspaceId === selectedContext.id
      ) || undefined;
    }
    return availableContexts.find(ctx => ctx.type === selectedContext?.type) || availableContexts[0] || undefined;
  }, [selectedContext, availableContexts]);

  const handleDisclaimerAccept = useCallback(() => {
    setShowDisclaimerInStore(false);
    setShowDisclaimer(false);
    
    // Continue with normal login flow after disclaimer acceptance
    if (user) {
      const { fetchAgent, clearAgent } = useAgentStore.getState();
      const { token } = useUserTokenStore.getState();
      
      // Fetch agent
      if (user.agent_id && token) {
        fetchAgent(user.agent_id, token);
        console.log('[TitleBar] Fetching agent after disclaimer acceptance');
      } else {
        clearAgent();
      }

      // Auto-unlock encryption
      const { unlockForUser } = useCryptoStore.getState();
      if (user.id && token) {
        unlockForUser(user.id, token).then((success) => {
          if (success) {
            console.log('[TitleBar] Encryption unlocked after disclaimer acceptance');
            // Create notifications
            setTimeout(() => {
              createNotificationsForUnreadMessages();
            }, 2000);
          }
        });
      }

      // Navigate to home
      setSelectedContext({ name: "home", type: "home", section: "homepage" });
      
      const userName = user.username || 'User';
      toast.success(intl.formatMessage({ id: 'toast.welcome' }, { name: userName }));
    }
  }, [setShowDisclaimerInStore, user, setSelectedContext, intl]);

  const handleDisclaimerDecline = useCallback(() => {
    setShowDisclaimerInStore(false);
    setShowDisclaimer(false);
    
    // Check if user is new or existing
    const userIsNew = user ? isFirstLogin(user) : true;
    
    if (userIsNew) {
      // Log out user if they decline (only for new users)
      const { logout } = useUserStore.getState();
      logout();
      toast.info(intl.formatMessage({ id: 'disclaimer.declined' }));
    } else {
      // For existing users, just close the dialog (they already agreed before)
      console.log('[TitleBar] Existing user closed disclaimer dialog');
    }
  }, [setShowDisclaimerInStore, user, isFirstLogin, intl]);

  // Determine if user is new for disclaimer dialog
  const userIsNew = user ? isFirstLogin(user) : true;

  // If window is too small, show collapsed menu
  if (isCollapsed) {
    return (
      <>
        <CollapsedMenu
          appIcon={appIcon}
          totalNotificationCount={totalNotificationCount}
          onNotificationClick={handleNotificationClick}
          onWindowAction={handleWindowAction}
          onMenuAction={handleMenuAction}
          isWindowMaximized={isWindowMaximized}
        />

        <NotificationView
          open={showNotifications}
          onClose={handleCloseNotifications}
        />

        <AboutDialog
          open={showAbout}
          onClose={handleCloseAbout}
        />

        <DisclaimerDialog
          open={showDisclaimerFromStore || showDisclaimer}
          onAccept={handleDisclaimerAccept}
          onDecline={handleDisclaimerDecline}
          isNewUser={userIsNew}
        />
      </>
    );
  }

  // Original full TitleBar for larger windows
  return (
    <>
      <Box
        sx={{
          height: TITLEBAR_HEIGHT,
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
        <Box sx={{ display: 'flex', alignItems: 'center', pl: 1.5, WebkitAppRegion: 'no-drag' }}>
          {appIcon && (
            <Avatar 
              src={appIcon} 
              sx={{ 
                width: 24, 
                height: 24,
                mr: 1.5
              }}
            />
          )}
        </Box>

        {/* Menu Items (left side) */}
        <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' }}>
          {/* File Menu */}
          <Box
            sx={{
              px: 1.5,
              py: 1,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              bgcolor: activeMenu === 'file' ? 'action.selected' : 'transparent',
            }}
            onClick={(e) => handleMenuClick(e, 'file')}
          >
            <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500 }}>
              {intl.formatMessage({ id: 'titleBar.menu.file' })}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1.5,
              py: 1,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              bgcolor: activeMenu === 'edit' ? 'action.selected' : 'transparent',
            }}
            onClick={(e) => handleMenuClick(e, 'edit')}
          >
            <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500 }}>
              {intl.formatMessage({ id: 'titleBar.menu.edit' })}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1.5,
              py: 1,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              bgcolor: activeMenu === 'view' ? 'action.selected' : 'transparent',
            }}
            onClick={(e) => handleMenuClick(e, 'view')}
          >
            <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500 }}>
              {intl.formatMessage({ id: 'titleBar.menu.view' })}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1.5,
              py: 1,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
              bgcolor: activeMenu === 'help' ? 'action.selected' : 'transparent',
            }}
            onClick={(e) => handleMenuClick(e, 'help')}
          >
            <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500 }}>
              {intl.formatMessage({ id: 'titleBar.menu.help' })}
            </Typography>
          </Box>
        </Box>

        {/* Draggable spacer */}
        <Box sx={{ width: 24, WebkitAppRegion: 'drag' }} />

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
                  width: 28,
                  height: 28,
                  mr: 0.5,
                  '&:hover': { bgcolor: 'action.hover' },
                  '&.Mui-disabled': {
                    color: 'action.disabled'
                  }
                }}
                title={intl.formatMessage({ id: 'titleBar.navigation.back' })}
              >
                <ArrowBack sx={{ fontSize: 14 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleGoForward}
                disabled={!canGoForward}
                sx={{
                  width: 28,
                  height: 28,
                  mr: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                  '&.Mui-disabled': {
                    color: 'action.disabled'
                  }
                }}
                title={intl.formatMessage({ id: 'titleBar.navigation.forward' })}
              >
                <ArrowForward sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>

            {/* Context Search Bar */}
            <Autocomplete
              options={availableContexts}
              getOptionLabel={(option) => option.name}
              inputValue={searchOpen ? searchInputValue : (getCurrentContextOption()?.name || '')}
              onInputChange={handleInputChange}
              onChange={handleContextChange}
              open={searchOpen}
              onOpen={handleSearchOpen}
              onClose={handleSearchClose}
              disableClearable
              size="small"
              groupBy={(option) => option.section}
              isOptionEqualToValue={(option, value) => {
                if (!option || !value) return option === value;
                return option.type === value.type && 
                       option.workspaceId === value.workspaceId &&
                       option.name === value.name;
              }}
              slotProps={{
                popper: {
                  placement: 'bottom-start',
                  modifiers: [
                    {
                      name: 'offset',
                      options: {
                        offset: [0, 4],
                      },
                    },
                  ],
                },
              }}
              sx={{
                minWidth: 280,
                maxWidth: 380,
                '& .MuiOutlinedInput-root': {
                  height: 28,
                  fontSize: '14px',
                  paddingLeft: '10px',
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
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'text.primary',
                  textAlign: 'center',
                  cursor: 'pointer',
                  paddingLeft: '6px !important'
                },
                '& .MuiAutocomplete-endAdornment': {
                  display: 'none'
                },
                '& .MuiInputAdornment-root': {
                  marginRight: '6px'
                },
                // ✅ Fix accessibility for dropdown options
                '& .MuiAutocomplete-listbox': {
                  '& .MuiAutocomplete-option': {
                    '&[aria-selected="true"]': {
                      backgroundColor: 'action.selected',
                      '&.Mui-focused': {
                        backgroundColor: 'action.selected',
                      },
                    },
                    '&.Mui-focused': {
                      backgroundColor: 'action.hover',
                    },
                  },
                },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  placeholder="Search contexts..."
                  // ✅ Add accessibility attributes
                  inputProps={{
                    ...params.inputProps,
                    'aria-label': 'Search application contexts',
                    'aria-describedby': 'context-search-helper',
                  }}
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {getCurrentContextOption()?.icon && (
                              <Avatar 
                                src={getCurrentContextOption()?.icon || ''} 
                                sx={{ 
                                  width: 16, 
                                  height: 16,
                                  fontSize: '10px'
                                }}
                                // ✅ Add accessibility for avatar
                                alt={`${getCurrentContextOption()?.name} icon`}
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
                      fontSize: '12px',
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
                        width: 18, 
                        height: 18,
                        fontSize: '11px'
                      }}
                    >
                      {option.name[0]?.toUpperCase()}
                    </Avatar>
                  )}
                  <Typography variant="body2" sx={{ fontSize: '14px' }}>
                    {option.name}
                  </Typography>
                </Box>
              )}
            />
          </Box>
        </Box>

        {/* Draggable spacer */}
        <Box sx={{ width: 24, WebkitAppRegion: 'drag' }} />

        {/* Window Controls (right side) */}
        <Box sx={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag', pr: 1.5 }}>
          {/* Notification Button with proper spacing */}
          <Box sx={{ mr: 1.5 }}>
            <Badge
              badgeContent={totalNotificationCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.7rem',
                  height: 16,
                  minWidth: 16,
                  padding: '0 4px',
                  top: 7,
                  right: 7,
                  borderRadius: '8px'
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
                <Notifications sx={{ fontSize: 18 }} />
              </IconButton>
            </Badge>
          </Box>

          {/* Window Control Buttons */}
          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => handleWindowAction('minimize')}
            title={intl.formatMessage({ id: 'titleBar.minimize' })}
          >
            <Remove sx={{ fontSize: 18 }} />
          </Box>
          
          {/* ✅ Updated maximize/restore button with conditional icon */}
          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => handleWindowAction('maximize')}
            title={intl.formatMessage({ 
              id: isWindowMaximized ? 'titleBar.restore' : 'titleBar.maximize' 
            })}
          >
            {isWindowMaximized ? (
              <FilterNone sx={{ fontSize: 16 }} />
            ) : (
              <CropSquare sx={{ fontSize: 16 }} />
            )}
          </Box>
          
          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' },
            }}
            onClick={() => handleWindowAction('close')}
            title={intl.formatMessage({ id: 'titleBar.close' })}
          >
            <Close sx={{ fontSize: 18 }} />
          </Box>
        </Box>

        {/* File Menu Dropdown */}
        <MuiMenu
          anchorEl={anchorEl}
          open={activeMenu === 'file'}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          TransitionComponent={undefined}
          transitionDuration={0}
          // ✅ Remove disablePortal and add proper focus management
          disableAutoFocus={false}
          disableEnforceFocus={false}
          disableRestoreFocus={false}
          sx={{
            '& .MuiPaper-root': {
              mt: 0.5,
            },
            '& .MuiMenuItem-root': {
              '&.Mui-focusVisible': {
                backgroundColor: 'action.hover',
              },
            },
          }}
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
          TransitionComponent={undefined}
          transitionDuration={0}
          // ✅ Remove disablePortal and add proper focus management
          disableAutoFocus={false}
          disableEnforceFocus={false}
          disableRestoreFocus={false}
          sx={{
            '& .MuiPaper-root': {
              mt: 0.5,
            },
            '& .MuiMenuItem-root': {
              '&.Mui-focusVisible': {
                backgroundColor: 'action.hover',
              },
            },
          }}
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
          TransitionComponent={undefined}
          transitionDuration={0}
          // ✅ Remove disablePortal and add proper focus management
          disableAutoFocus={false}
          disableEnforceFocus={false}
          disableRestoreFocus={false}
          sx={{
            '& .MuiPaper-root': {
              mt: 0.5,
            },
            '& .MuiMenuItem-root': {
              '&.Mui-focusVisible': {
                backgroundColor: 'action.hover',
              },
            },
          }}
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
          TransitionComponent={undefined}
          transitionDuration={0}
          // ✅ Remove disablePortal and add proper focus management
          disableAutoFocus={false}
          disableEnforceFocus={false}
          disableRestoreFocus={false}
          sx={{
            '& .MuiPaper-root': {
              mt: 0.5,
            },
            '& .MuiMenuItem-root': {
              '&.Mui-focusVisible': {
                backgroundColor: 'action.hover',
              },
            },
          }}
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

      <NotificationView
        open={showNotifications}
        onClose={handleCloseNotifications}
      />

      <AboutDialog
        open={showAbout}
        onClose={handleCloseAbout}
      />

      <DisclaimerDialog
        open={showDisclaimerFromStore || showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onDecline={handleDisclaimerDecline}
        isNewUser={userIsNew}
      />
    </>
  );
};

export default TitleBar;
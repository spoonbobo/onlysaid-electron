import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  Stack,
  Menu,
  MenuItem,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import GroupIcon from "@mui/icons-material/Group";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpIcon from "@mui/icons-material/Help";
import InboxIcon from "@mui/icons-material/Inbox";
import { useIntl } from 'react-intl';
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import HelpDialog, { getHelpItemsForContext, getHelpTitleForContext } from "./Help";

function Tabs() {
  const intl = useIntl();
  const { contexts, selectedContext, setSelectedContext } = useTopicStore();
  const { tabs = [], activeTabId, addTab, closeTab, setActiveTab, repairStore } = useWindowStore();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string, position: 'left' | 'right' } | null>(null);
  const draggedTabIndex = useRef<number>(-1);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const hasErrors = !tabs ||
      !Array.isArray(tabs) ||
      tabs.some(tab => !tab || !tab.id || !tab.context);

    if (hasErrors) {
      console.warn("Detected errors in tabs, attempting to repair store");
      try {
        repairStore();
      } catch (err) {
        console.error("Failed to repair store:", err);
        try {
          console.warn("Clearing localStorage for window-tabs-storage");
          localStorage.removeItem("window-tabs-storage");
          window.location.reload();
        } catch (clearErr) {
          console.error("Failed to clear localStorage:", clearErr);
        }
      }
    }
  }, [tabs, repairStore]);

  useEffect(() => {
    if (!tabs || tabs.length === 0) {
      console.log("No tabs exist, creating initial home tab");
      const homeContext = contexts.find(c => c.name === "home" && c.type === "home");
      if (homeContext) {
        console.log("Found home context:", homeContext);
        const newTab = addTab(homeContext);
        console.log("Created new tab:", newTab);
      } else {
        console.warn("No home context found in contexts:", contexts);
      }
    }
  }, [tabs?.length, contexts, addTab]);

  useEffect(() => {
    if (window.electron) {
      const removeListener = window.electron.ipcRenderer.on(
        'window:sync-state',
        (data: any) => {
          console.log('Received tab state sync:', data);
        }
      );

      return () => {
        if (removeListener) removeListener();
      };
    }
  }, []);

  const getContextIcon = (type: string | undefined) => {
    switch (type) {
      case "home":
        return <HomeIcon fontSize="small" />;
      case "team":
        return <GroupIcon fontSize="small" />;
      case "settings":
        return <SettingsIcon fontSize="small" />;
      default:
        return <HomeIcon fontSize="small" />;
    }
  };

  const handleTabClick = (tabId: string, context: any) => {
    if (!tabId) {
      console.warn("Attempted to click on tab with no ID");
      return;
    }

    setActiveTab(tabId);
    if (context) {
      useTopicStore.getState().setContextParent(
        `${context.name}:${context.type}`,
        tabId
      );
      setSelectedContext(context);
    } else {
      console.warn("No context found for tab:", tabId);
    }
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    if (!tabId) {
      console.warn("Attempted to close tab with no ID");
      return;
    }
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleAddTab = (context: any) => {
    if (!context) {
      console.warn("Attempted to add tab with no context");
      return;
    }

    console.log("Adding new tab with context:", context);
    const newTab = addTab(context);
    console.log("New tab created:", newTab);
    setSelectedContext(context);
    handleCloseMenu();
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.setData('text/plain', tabId);

    const index = tabs.findIndex(tab => tab.id === tabId);
    draggedTabIndex.current = index;

    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.4';
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedTab(null);
    setDropTarget(null);
    draggedTabIndex.current = -1;

    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, tabId: string) => {
    if (!draggedTab || draggedTab === tabId) {
      setDropTarget(null);
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const draggedIndex = draggedTabIndex.current;
    const targetIndex = tabs.findIndex(tab => tab.id === tabId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const position = draggedIndex < targetIndex ? 'right' : 'left';
      setDropTarget({ id: tabId, position });
    }
  };

  const handleEmptyAreaDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggedTab) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    setDropTarget({ id: 'end', position: 'right' });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetTabId: string) => {
    e.preventDefault();
    setDropTarget(null);

    const sourceTabId = e.dataTransfer.getData('text/plain');
    if (sourceTabId === targetTabId) return;

    const sourceIndex = tabs.findIndex(tab => tab.id === sourceTabId);
    const targetIndex = tabs.findIndex(tab => tab.id === targetTabId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(sourceIndex, 1);

    const insertIndex = dropTarget?.position === 'right'
      ? targetIndex
      : targetIndex === 0
        ? 0
        : targetIndex - 1;

    newTabs.splice(insertIndex, 0, movedTab);

    updateTabsOrder(newTabs);
  };

  const handleEndDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropTarget(null);

    const sourceTabId = e.dataTransfer.getData('text/plain');
    const sourceIndex = tabs.findIndex(tab => tab.id === sourceTabId);

    if (sourceIndex === -1) return;

    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(sourceIndex, 1);
    newTabs.push(movedTab);

    updateTabsOrder(newTabs);
  };

  const updateTabsOrder = (newTabs: typeof tabs) => {
    const state = useWindowStore.getState();

    useWindowStore.setState({
      ...state,
      tabs: newTabs.map(tab => ({
        ...tab,
        active: tab.id === activeTabId
      }))
    });
  };

  const renderTabs = () => {
    try {
      if (!tabs || !Array.isArray(tabs)) {
        console.warn("Tabs is not an array:", tabs);
        return null;
      }

      return tabs.map((tab) => {
        if (!tab) {
          console.warn("Found undefined tab in tabs array");
          return null;
        }

        const isDropTargetLeft = dropTarget?.id === tab.id && dropTarget.position === 'left';
        const isDropTargetRight = dropTarget?.id === tab.id && dropTarget.position === 'right';

        return (
          <Box
            key={tab.id || `tab-${Math.random()}`}
            onClick={() => handleTabClick(tab.id, tab.context)}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDrop={(e) => handleDrop(e, tab.id)}
            sx={{
              py: 1,
              px: 2,
              display: "flex",
              alignItems: "center",
              borderRight: 1,
              borderColor: "divider",
              minWidth: 180,
              maxWidth: 240,
              cursor: "pointer",
              bgcolor: tab.active ? "action.selected" : "background.paper",
              "&:hover": {
                bgcolor: tab.active ? "action.selected" : "action.hover",
              },
              borderLeft: isDropTargetLeft ? 2 : 0,
              borderLeftColor: isDropTargetLeft ? "primary.main" : "transparent",
              position: "relative",
              ...(isDropTargetRight && {
                "&::after": {
                  content: '""',
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  bgcolor: "primary.main",
                  zIndex: 1
                }
              })
            }}
          >
            <Box
              sx={{
                mr: 1,
                display: "flex",
                color: "text.secondary"
              }}
            >
              {getContextIcon(tab.context?.type)}
            </Box>
            <Typography
              variant="body2"
              noWrap
              sx={{
                flex: 1,
                fontWeight: tab.active ? 500 : 400
              }}
            >
              {tab.title || "Untitled"}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => handleCloseTab(e, tab.id)}
              sx={{
                ml: 1,
                p: 0.5,
                color: "text.secondary",
                opacity: tab.active ? 1 : 0,
                "&:hover": {
                  opacity: 1,
                  bgcolor: "action.hover",
                  color: "error.main"
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        );
      });
    } catch (err) {
      console.error("Error rendering tabs:", err);
      return null;
    }
  };

  const handleOpenHelp = () => {
    setIsHelpOpen(true);
  };

  const handleCloseHelp = () => {
    setIsHelpOpen(false);
  };

  const currentHelpItems = getHelpItemsForContext(selectedContext, intl);
  const currentHelpTitle = getHelpTitleForContext(selectedContext, intl);

  return (
    <Box sx={{
      width: "100%",
      height: "auto",
      borderBottom: 1,
      borderColor: "divider",
      display: "flex",
      flexShrink: 0
    }}>
      <Stack
        direction="row"
        spacing={0}
        sx={{
          flex: 1,
          overflowX: "auto",
          "&::-webkit-scrollbar": {
            height: 6,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: 3,
          }
        }}
      >
        {renderTabs()}

        <Box
          onDragOver={handleEmptyAreaDragOver}
          onDrop={handleEndDrop}
          sx={{
            width: 50,
            height: "100%",
            flexGrow: 1,
            minWidth: 50,
            ...(dropTarget?.id === 'end' ? {
              borderLeft: 2,
              borderLeftColor: "primary.main",
              bgcolor: "action.hover"
            } : {})
          }}
        />
      </Stack>

      <Box sx={{ display: "flex", alignItems: "center", borderLeft: 1, borderColor: "divider" }}>
        <Tooltip title="New Tab">
          <IconButton
            size="small"
            onClick={handleOpenMenu}
            sx={{ mx: 1 }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Inbox">
          <IconButton
            size="small"
            sx={{ mx: 1 }}
          >
            <InboxIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Help">
          <IconButton
            size="small"
            sx={{ mx: 1 }}
            onClick={handleOpenHelp}
          >
            <HelpIcon />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleCloseMenu}
        >
          {contexts.map((context) => (
            <MenuItem key={`${context.name}-${context.type}`} onClick={() => handleAddTab(context)}>
              <Box sx={{ mr: 1, display: "flex" }}>
                {getContextIcon(context.type)}
              </Box>
              <Typography>
                {context.name.charAt(0).toUpperCase() + context.name.slice(1)}
              </Typography>
            </MenuItem>
          ))}
        </Menu>
      </Box>

      <HelpDialog
        open={isHelpOpen}
        onClose={handleCloseHelp}
        helpItems={currentHelpItems}
        title={currentHelpTitle}
      />
    </Box>
  );
}

export default Tabs;
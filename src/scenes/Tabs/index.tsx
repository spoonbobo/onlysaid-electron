import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Tooltip,
  IconButton,
  Stack,
  Menu,
  MenuItem,
  Button
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import GroupIcon from "@mui/icons-material/Group";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTopicStore } from "../../stores/Topic/TopicStore";
import { useWindowStore } from "../../stores/Topic/WindowStore";

function Tabs() {
  const { contexts, setSelectedContext } = useTopicStore();
  const { tabs = [], activeTabId, addTab, closeTab, setActiveTab, repairStore } = useWindowStore();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  console.log("Current tabs:", tabs);
  console.log("Active tab ID:", activeTabId);

  // Attempt to repair the store if needed
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
        // As a last resort, clear local storage
        try {
          console.warn("Clearing localStorage for window-tabs-storage");
          localStorage.removeItem("window-tabs-storage");
          // Force reload
          window.location.reload();
        } catch (clearErr) {
          console.error("Failed to clear localStorage:", clearErr);
        }
      }
    }
  }, [tabs, repairStore]);

  // Set up initial tab if none exists
  useEffect(() => {
    if (!tabs || tabs.length === 0) {
      console.log("No tabs exist, creating initial home tab");
      // Create an initial Home tab
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

  // Register for IPC messages for tab synchronization
  useEffect(() => {
    if (window.electron) {
      // Listen for tab state synchronization from other windows
      const removeListener = window.electron.ipcRenderer.on(
        'window:sync-state',
        (data: any) => {
          console.log('Received tab state sync:', data);
          // In a real implementation, we would update the local state
          // based on the synced data from other windows
        }
      );

      // Clean up listener on unmount
      return () => {
        if (removeListener) removeListener();
      };
    }
  }, []);

  // Get the icon for a given context type
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

  // Handle tab click
  const handleTabClick = (tabId: string, context: any) => {
    if (!tabId) {
      console.warn("Attempted to click on tab with no ID");
      return;
    }

    setActiveTab(tabId);
    if (context) {
      setSelectedContext(context);
    } else {
      console.warn("No context found for tab:", tabId);
    }
  };

  // Handle tab close
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    if (!tabId) {
      console.warn("Attempted to close tab with no ID");
      return;
    }
    e.stopPropagation();
    closeTab(tabId);
  };

  // Open context menu
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  // Close context menu
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  // Add a new tab
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

  // Render a safe version of tabs that catches errors
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

        return (
          <Box
            key={tab.id || `tab-${Math.random()}`}
            onClick={() => handleTabClick(tab.id, tab.context)}
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
              }
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

  return (
    <Box sx={{
      width: "100%",
      borderBottom: 1,
      borderColor: "divider",
      display: "flex"
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
    </Box>
  );
}

export default Tabs;

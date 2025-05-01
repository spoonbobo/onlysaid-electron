import { Box } from "@mui/material";
import Menu from "../Menu";
import Main from "../Main";
import Tabs from "../Tabs";
import SidebarTabs from "../SidebarTabs";
import { useLayoutResize } from "../../stores/Layout/LayoutResize";
import { useWindowStore } from "../../stores/Topic/WindowStore";
import { useTopicStore } from "../../stores/Topic/TopicStore";
import { useRef, useEffect } from "react";
import UserInfoBar from "./UserInfoBar";

function MainInterface() {
  const { menuWidth, setMenuWidth } = useLayoutResize();
  const { tabs = [], activeTabId, updateActiveTabContext, resetStore } = useWindowStore();
  const { setSelectedContext, selectedContext } = useTopicStore();
  const isDraggingMenu = useRef(false);

  // Track the previous context to detect actual changes
  const previousContextRef = useRef(selectedContext);

  // When active tab changes, update selected context
  useEffect(() => {
    if (activeTabId) {
      console.log("Tab changed, activeTabId:", activeTabId);
      const activeTab = tabs.find(tab => tab.id === activeTabId);

      if (activeTab && activeTab.context) {
        console.log("Setting context from active tab:", activeTab.context);
        setSelectedContext(activeTab.context);
      } else {
        console.warn("Active tab has no valid context", activeTab);
      }
    }
  }, [activeTabId, tabs, setSelectedContext]);

  // When selectedContext changes, update the active tab's context
  useEffect(() => {
    // Check if the context actually changed (different type or name)
    const contextChanged =
      selectedContext?.type !== previousContextRef.current?.type ||
      selectedContext?.name !== previousContextRef.current?.name;

    if (selectedContext && contextChanged) {
      console.log("Context changed from:", previousContextRef.current, "to:", selectedContext);

      // Update the active tab with the new context
      updateActiveTabContext(selectedContext);

      // Update the ref for the next comparison
      previousContextRef.current = selectedContext;
    }
  }, [selectedContext, updateActiveTabContext]);

  // Debug the current selectedContext
  useEffect(() => {
    console.log("Currently selected context:", selectedContext);
  }, [selectedContext]);

  // Add keyboard shortcut to reset tab state (Ctrl+Shift+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+R keyboard shortcut
      if (e.ctrlKey && e.shiftKey && e.key === 'r') {
        e.preventDefault(); // Prevent browser refresh
        console.log("Resetting tab state via keyboard shortcut");
        resetStore();

        // Reload the page after a short delay to ensure clean state
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetStore]);

  // Listen for IPC messages from the main process
  useEffect(() => {
    if (window.electron) {
      // Setup IPC listeners for window/tab management
      const tabCreatedListener = window.electron.ipcRenderer.on(
        'window:tab-created',
        (data: any) => {
          console.log('New tab created in another window:', data);
          // In a real implementation, we would potentially sync tab state
        }
      );

      return () => {
        if (tabCreatedListener) tabCreatedListener();
      };
    }
  }, []);

  const handleMenuMouseDown = () => {
    isDraggingMenu.current = true;
    document.body.style.cursor = "col-resize";
  };

  // Mouse move and up listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingMenu.current) {
        const newWidth = Math.max(120, Math.min(e.clientX - 72, 400));
        setMenuWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isDraggingMenu.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setMenuWidth]);

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Horizontal tab bar at the top */}
      <Tabs />

      {/* Main Content Area */}
      <Box
        sx={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: 72 + menuWidth,
            minWidth: 72 + menuWidth,
            maxWidth: 72 + menuWidth,
            borderRight: "1px solid #eee",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0 }}>
            <Box
              sx={{
                width: 72,
                borderRight: "1px solid #eee",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Restored sidebar vertical tabs */}
              <SidebarTabs />
            </Box>
            <Box
              sx={{
                width: menuWidth,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Menu />
            </Box>
          </Box>
          <UserInfoBar />
        </Box>
        <Box
          sx={{
            width: 6,
            cursor: "col-resize",
            zIndex: 1,
            bgcolor: "transparent",
            "&:hover": { bgcolor: "#eee" },
          }}
          onMouseDown={handleMenuMouseDown}
        />
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Main />
        </Box>
      </Box>
    </Box>
  );
}

export default MainInterface;

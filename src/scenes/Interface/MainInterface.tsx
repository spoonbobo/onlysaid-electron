import { Box } from "@mui/material";
import Menu from "../Menu";
import Main from "../Main";
import SidebarTabs from "../SidebarTabs";
import { useLayoutResize } from "@/stores/Layout/LayoutResize";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useRef, useEffect } from "react";
import UserInfoBar from "./UserInfoBar";
import LevelUp from "./LevelUp";
import Pane from "../Pane/index";
import OverlaysContainer from "./Overlays/OverlaysContainer";

function MainInterface() {
  const { menuWidth, setMenuWidth } = useLayoutResize();
  const { tabs = [], activeTabId, updateActiveTabContext, resetStore } = useWindowStore();
  const { setSelectedContext, selectedContext } = useTopicStore();
  const isDraggingMenu = useRef(false);
  const previousContextRef = useRef(selectedContext);

  useEffect(() => {
    if (activeTabId) {
      const activeTab = tabs.find(tab => tab.id === activeTabId);

      if (activeTab && activeTab.context) {
        setSelectedContext(activeTab.context);
      } else {
        console.warn("Active tab has no valid context", activeTab);
      }
    }
  }, [activeTabId, tabs, setSelectedContext]);

  useEffect(() => {
    const contextChanged =
      selectedContext?.type !== previousContextRef.current?.type ||
      selectedContext?.name !== previousContextRef.current?.name;

    if (selectedContext && contextChanged) {
      if (activeTabId) {
        const contextId = `${selectedContext.name}:${selectedContext.type}`;
        useTopicStore.getState().setContextParent(contextId, activeTabId);
      }

      updateActiveTabContext(selectedContext);
      previousContextRef.current = selectedContext;
    }
  }, [selectedContext, updateActiveTabContext, activeTabId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        console.log("Resetting tab state via keyboard shortcut");
        resetStore();

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

  useEffect(() => {
    if (window.electron) {
      const tabCreatedListener = window.electron.ipcRenderer.on(
        'window:tab-created',
        (data: any) => {
          console.log('New tab created in another window:', data);
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
      <Box
        sx={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
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
            position: "relative",
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

          <Box
            sx={{
              position: "absolute",
              top: 0,
              right: -3,
              width: 6,
              height: "100%",
              cursor: "col-resize",
              zIndex: 1,
              bgcolor: "transparent",
              "&:hover": { bgcolor: "rgba(200, 200, 200, 0.4)" },
            }}
            onMouseDown={handleMenuMouseDown}
          />
        </Box>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Pane>
            <Main />
          </Pane>
          <LevelUp />
        </Box>
      </Box>

      <OverlaysContainer />
    </Box>
  );
}

export default MainInterface;

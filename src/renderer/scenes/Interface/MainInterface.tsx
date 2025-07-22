import { Box } from "@mui/material";
import Menu from "../Menu";
import Main from "../Main";
import SidebarTabs from "../SidebarTabs";
import { useLayoutResize } from "@/renderer/stores/Layout/LayoutResize";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useRef, useEffect, useCallback, useState } from "react";
import UserInfoBar from "./UserInfoBar";
import LevelUp from "./LevelUp";
import OverlaysContainer from "./Overlays/OverlaysContainer";
import TitleBar from "./TitleBar";
import AgentWorkOverlay from "../../components/Agent/AgentWorkOverlay";

function MainInterface() {
  const { menuWidth, setMenuWidth } = useLayoutResize();
  const { selectedContext } = useTopicStore();
  const isDraggingMenu = useRef(false);
  const mainInterfaceRenderCountRef = useRef(0);
  
  const [showAgentOverlay, setShowAgentOverlay] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const mainInterfaceRef = useRef<HTMLDivElement>(null);

  mainInterfaceRenderCountRef.current += 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        console.log("Resetting application state via keyboard shortcut");

        try {
          localStorage.removeItem("topic-store");
        } catch (error) {
          console.error("Failed to clear localStorage", error);
        }

        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMenuMouseDown = () => {
    isDraggingMenu.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const setMenuWidthRef = useRef(setMenuWidth);
  useEffect(() => {
    setMenuWidthRef.current = setMenuWidth;
  }, [setMenuWidth]);

  const throttledSetMenuWidth = useCallback((width: number) => {
    if (setMenuWidthRef.current) {
      setMenuWidthRef.current(width);
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingMenu.current) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {
          const baseWidth = isExpanded ? 280 : 72;
          const newWidth = Math.max(120, Math.min(e.clientX - baseWidth, 400));
          throttledSetMenuWidth(newWidth);
        });
      }
    };

    const handleMouseUp = () => {
      if (isDraggingMenu.current) {
        isDraggingMenu.current = false;
        document.body.style.cursor = "";
        document.body.style.removeProperty('user-select');

        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.removeProperty('user-select');

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isExpanded]);

  const handleAgentToggle = useCallback((show: boolean) => {
    setShowAgentOverlay(show);
  }, []);

  const handleOverlayClose = useCallback(() => {
    setShowAgentOverlay(false);
  }, []);

  const sidebarWidth = isExpanded ? 280 : 72;

  return (
    <Box
      ref={mainInterfaceRef}
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <TitleBar />
      <Box
        sx={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* Sidebar + Menu Container */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: sidebarWidth + menuWidth,
            minWidth: sidebarWidth + menuWidth,
            maxWidth: sidebarWidth + menuWidth,
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
            position: "relative",
            // transition: "width 0.3s ease-in-out", // Removed animation
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "row", flex: 1, minHeight: 0 }}>
            <Box
              sx={{
                width: sidebarWidth,
                borderRight: "1px solid",
                borderColor: "divider",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <SidebarTabs 
                onExpandChange={setIsExpanded} 
                onAgentToggle={handleAgentToggle}
                agentOverlayVisible={showAgentOverlay}
              />
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
          
          {/* Only show UserInfoBar when sidebar is NOT expanded */}
          {!isExpanded && (
            <UserInfoBar 
              onAgentToggle={handleAgentToggle}
              agentOverlayVisible={showAgentOverlay}
            />
          )}

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

        {/* Main Content - gets smaller when expanded */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          <Box sx={{ flex: 1, overflow: "hidden", p: 3 }}>
            <Main />
          </Box>
          <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 9999 }}>
            <LevelUp />
          </Box>
        </Box>
      </Box>

      <AgentWorkOverlay 
        visible={showAgentOverlay}
        onClose={handleOverlayClose}
        containerRef={mainInterfaceRef}
        respectParentBounds={true}
        fullscreenMargin={20}
      />

      <OverlaysContainer mainInterfaceRenderCount={mainInterfaceRenderCountRef.current} />
    </Box>
  );
}

export default MainInterface;

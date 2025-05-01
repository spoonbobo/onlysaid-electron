import { Box } from "@mui/material";
import Menu from "../Menu";
import Main from "../Main";
import Tabs from "../Tabs";
import { useLayoutResize } from "../../stores/Layout/LayoutResize";
import { useRef, useEffect } from "react";
import UserInfoBar from "./UserInfoBar";

function MainInterface() {
  const { menuWidth, setMenuWidth } = useLayoutResize();
  const isDraggingMenu = useRef(false);

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
        bgcolor: "background.default",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
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
            <Tabs />
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
  );
}

export default MainInterface;

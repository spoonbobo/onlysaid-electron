import { Box, Paper } from "@mui/material";
import DebugOverlay from "./DebugOverlay";
import DbOverlay from "./DbOverlay";
import ResourceOverlay from "./ResourceOverlay";
import PlaygroundOverlay from "./PlaygroundOverlay";
import ChatOverlay from "./ChatOverlay";
import SocketOverlay from "./SocketOverlay";
import UserOverlay from "./UserOverlay";
import { useDebugStore } from "@/stores/Debug/DebugStore";
import { useState, useRef, useEffect } from "react";
import { useUserSettingsStore } from "@/stores/User/UserSettings";

export default function OverlaysContainer() {
  const { debugMode } = useUserSettingsStore();
  const {
    overlaysPosition,
    overlaysWidth,
    overlaysHeight,
    setOverlaysPosition,
    setOverlaysWidth,
    setOverlaysHeight
  } = useDebugStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const [isResizingCorner, setIsResizingCorner] = useState(false);

  const dragRef = useRef({ startX: 0, startY: 0 });
  const resizeRef = useRef({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragRef.current.startX;
        const newY = e.clientY - dragRef.current.startY;

        // Constrain to window bounds
        const x = Math.max(0, Math.min(newX, window.innerWidth - overlaysWidth));
        const y = Math.max(0, Math.min(newY, window.innerHeight - overlaysHeight));

        setOverlaysPosition({ x, y });
      }

      if (isResizingWidth || isResizingCorner) {
        const maxWidth = window.innerWidth - overlaysPosition.x - 20;
        const newWidth = Math.min(
          maxWidth,
          Math.max(200, resizeRef.current.startWidth + (e.clientX - resizeRef.current.startX))
        );
        setOverlaysWidth(newWidth);
      }

      if (isResizingHeight || isResizingCorner) {
        const maxHeight = window.innerHeight - overlaysPosition.y - 20;
        const newHeight = Math.min(
          maxHeight,
          Math.max(150, resizeRef.current.startHeight + (e.clientY - resizeRef.current.startY))
        );
        setOverlaysHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizingWidth(false);
      setIsResizingHeight(false);
      setIsResizingCorner(false);
      document.body.style.cursor = "";
    };

    if (isDragging || isResizingWidth || isResizingHeight || isResizingCorner) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    isResizingWidth,
    isResizingHeight,
    isResizingCorner,
    overlaysWidth,
    overlaysHeight,
    overlaysPosition,
    setOverlaysPosition,
    setOverlaysWidth,
    setOverlaysHeight
  ]);

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX - overlaysPosition.x,
      startY: e.clientY - overlaysPosition.y
    };
    document.body.style.cursor = "grabbing";
    e.preventDefault();
  };

  const handleWidthResizeStart = (e: React.MouseEvent) => {
    setIsResizingWidth(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: overlaysWidth,
      startHeight: overlaysHeight
    };
    document.body.style.cursor = "ew-resize";
    e.preventDefault();
  };

  const handleHeightResizeStart = (e: React.MouseEvent) => {
    setIsResizingHeight(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: overlaysWidth,
      startHeight: overlaysHeight
    };
    document.body.style.cursor = "ns-resize";
    e.preventDefault();
  };

  const handleCornerResizeStart = (e: React.MouseEvent) => {
    setIsResizingCorner(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: overlaysWidth,
      startHeight: overlaysHeight
    };
    document.body.style.cursor = "nwse-resize";
    e.preventDefault();
  };

  // Check if overlay is outside window after resize and adjust if needed
  // Check if overlay is outside window after resize and adjust if needed
  useEffect(() => {
    const checkPosition = () => {
      const isOutsideX = overlaysPosition.x + overlaysWidth > window.innerWidth;
      const isOutsideY = overlaysPosition.y + overlaysHeight > window.innerHeight;

      if (isOutsideX || isOutsideY) {
        const newX = isOutsideX ? Math.max(0, window.innerWidth - overlaysWidth) : overlaysPosition.x;
        const newY = isOutsideY ? Math.max(0, window.innerHeight - overlaysHeight) : overlaysPosition.y;
        setOverlaysPosition({ x: newX, y: newY });
      }
    };

    window.addEventListener('resize', checkPosition);
    checkPosition(); // Call after adding listener

    return () => window.removeEventListener('resize', checkPosition);
  }, [overlaysWidth, overlaysHeight, setOverlaysPosition]); // Remove overlaysPosition from dependencies

  if (!debugMode) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        left: overlaysPosition.x,
        top: overlaysPosition.y,
        zIndex: 9999,
        width: overlaysWidth,
        height: overlaysHeight,
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          p: 0.5,
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'auto',
          flex: 1,
          userSelect: 'none'
        }}
        onMouseDown={handleDragStart}
      >
        <ResourceOverlay />
        <DebugOverlay />
        <SocketOverlay />
        <ChatOverlay />
        <DbOverlay />
        <UserOverlay />
        <PlaygroundOverlay />
      </Box>

      {/* Width resizer */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: -6,
          width: 6,
          height: '100%',
          cursor: 'ew-resize',
          backgroundColor: 'transparent',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.1)' },
          zIndex: 1
        }}
        onMouseDown={handleWidthResizeStart}
      />

      {/* Height resizer */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -6,
          left: 0,
          width: '100%',
          height: 6,
          cursor: 'ns-resize',
          backgroundColor: 'transparent',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.1)' },
          zIndex: 1
        }}
        onMouseDown={handleHeightResizeStart}
      />

      {/* Corner resizer */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -6,
          right: -6,
          width: 12,
          height: 12,
          cursor: 'nwse-resize',
          backgroundColor: 'transparent',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.2)' },
          zIndex: 2
        }}
        onMouseDown={handleCornerResizeStart}
      />
    </Paper>
  );
}
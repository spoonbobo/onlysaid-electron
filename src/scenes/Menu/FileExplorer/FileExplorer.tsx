import { useRef, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import MenuListItem from "../../../components/Navigation/MenuListItem";
import MenuSection from "../../../components/Navigation/MenuSection";
import { useFileExplorerStore } from "../../../stores/Layout/FileExplorerResize";
import { FormattedMessage } from "react-intl";

// Define props interface
interface FileExplorerProps {
  minContentHeightAbove: number;
}

function FileExplorer({ minContentHeightAbove }: FileExplorerProps) {
  const { height, isExpanded, setHeight, setIsExpanded } = useFileExplorerStore();
  const isDragging = useRef(false);
  const startY = useRef(0);
  const fileExplorerRef = useRef<HTMLDivElement>(null);

  // Handle mouse down to start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isExpanded || !fileExplorerRef.current) return;

    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";
  };

  // Set up event listeners for mouse move and mouse up
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Prevent browser default actions during drag move
      e.preventDefault();

      if (!isDragging.current || !fileExplorerRef.current) return;

      const selfElement = fileExplorerRef.current;
      const menuContainer = selfElement.closest('#menu-container');
      const menuHeaderWrapper = menuContainer?.querySelector('#menu-header-wrapper');

      if (!menuContainer || !menuHeaderWrapper) {
        console.warn("FileExplorer resize: Could not find layout elements (#menu-container, #menu-header-wrapper).");
        return;
      }

      const menuContainerRect = menuContainer.getBoundingClientRect();
      const menuHeaderRect = menuHeaderWrapper.getBoundingClientRect();

      const minExplorerHeight = 40;

      const maxTopYAllowed = menuContainerRect.top + menuHeaderRect.height + minContentHeightAbove;

      const minBottomYAllowed = menuContainerRect.bottom - minExplorerHeight;

      const clampedClientY = Math.max(maxTopYAllowed, Math.min(e.clientY, minBottomYAllowed));

      const newHeight = menuContainerRect.bottom - clampedClientY;

      if (newHeight !== height) {
        setHeight(newHeight);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Prevent browser default actions on mouse up during drag
      // Although less critical here, it's good practice for consistency
      e.preventDefault();

      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };

    if (isExpanded) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setHeight, height, isExpanded, minContentHeightAbove]);

  return (
    <Box ref={fileExplorerRef} sx={{ borderTop: 1, borderColor: "divider", position: "relative" }}>
      {isExpanded && (
        <Box
          sx={{
            height: "4px",
            cursor: "ns-resize",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            "&:hover": { bgcolor: "rgba(0, 0, 0, 0.1)" }
          }}
          onMouseDown={handleMouseDown}
        />
      )}

      <MenuSection>
        <Box>
          <MenuListItem
            icon={<FolderIcon color="primary" fontSize="small" />}
            label={<FormattedMessage id="menu.fileExplorer" />}
            isSelected={false}
            textColor="primary.main"
            onClick={() => setIsExpanded(!isExpanded)}
            endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          {isExpanded && (
            <Box
              sx={{
                height: `${height}px`,
                overflow: "auto",
                transition: isDragging.current ? 'none' : 'height 0.2s ease',
              }}
            >
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="100%"
                p={2}
                textAlign="center"
              >
                <Typography color="text.secondary" gutterBottom>
                  <FormattedMessage id="menu.fileExplorer.empty" defaultMessage="No folders found" />
                </Typography>
                <Button
                  startIcon={<CreateNewFolderIcon />}
                  variant="outlined"
                  size="small"
                  color="primary"
                  sx={{ mt: 1 }}
                >
                  <FormattedMessage id="menu.fileExplorer.addFolder" defaultMessage="Add Folder" />
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </MenuSection>
    </Box>
  );
}

export default FileExplorer;
import { useRef, useEffect, useState } from "react";
import { Box, Typography, Button, List, ListItem, ListItemIcon, ListItemText, CircularProgress } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import MenuListItem from "@/components/Navigation/MenuListItem";
import MenuSection from "@/components/Navigation/MenuSection";
import { useFileExplorerStore } from "@/stores/Layout/FileExplorerResize";
import { useFileExplorerStore as useFilesStore, selectors } from "@/stores/File/FileExplorerStore";
import { FormattedMessage } from "react-intl";

// Define props interface
interface FileExplorerProps {
  minContentHeightAbove: number;
}

function FileNodeItem({ node, level = 0 }: { node: any, level?: number }) {
  const { loadFolder, toggleFolder, selectItem } = useFilesStore();
  const isLoading = useFilesStore(selectors.selectIsNodeLoading(node.path));
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    if (isLoading) return;

    if (node.type === 'directory') {
      if (node.isExpanded || node.children?.length > 0) {
        toggleFolder(node.path);
      } else if (!node.isExpanded && !node.children) {
        loadFolder(node.path);
      } else if (!node.isExpanded && node.children?.length === 0) {
        loadFolder(node.path);
      }
    } else {
      selectItem(node.path);
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', node.path);
    // Set the drag image (optional - can customize this)
    if (e.dataTransfer.setDragImage && e.currentTarget) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
    // Add some visual feedback
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.4';
    }
  };

  // Handle drag end
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const draggedNodePath = e.dataTransfer.getData('text/plain');
    // You would need to add a function to the store to handle reordering
    // For now, just log the action
    console.log(`Dropped ${draggedNodePath} onto ${node.path}`);
  };

  // Simple rendering without collapse animation
  return (
    <div>
      <ListItem
        component="div"
        onClick={handleClick}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          pl: 2 + level * 2,
          py: 0.5,
          cursor: isLoading ? 'default' : 'grab',
          opacity: isLoading ? 0.7 : (isDragging ? 0.4 : 1),
          '&:hover': { bgcolor: isLoading ? 'transparent' : 'action.hover' },
          height: 36,
          minHeight: 36,
          boxSizing: 'border-box',
          userSelect: 'none', // Prevent text selection
          WebkitUserSelect: 'none', // For Safari
          MozUserSelect: 'none', // For Firefox
          msUserSelect: 'none', // For IE/Edge
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          {node.type === 'directory' ? (
            isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : node.isExpanded ? (
              <FolderOpenIcon fontSize="small" color="primary" />
            ) : (
              <FolderIcon fontSize="small" color="primary" />
            )
          ) : (
            <InsertDriveFileIcon fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText
          primary={node.name}
          slotProps={{
            primary: {
              fontSize: '0.875rem',
              noWrap: true,
              sx: { lineHeight: 1.1 }
            }
          }}
        />
        {node.type === 'directory' && !isLoading && (
          node.isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />
        )}
      </ListItem>

      {node.type === 'directory' && node.isExpanded && node.children && (
        node.children.length > 0 ? (
          node.children.map((child: any) => (
            <FileNodeItem key={child.id} node={child} level={level + 1} />
          ))
        ) : (
          !isLoading && (
            <ListItem
              sx={{
                pl: 4 + level * 2,
                py: 0.5,
                height: 36,
                minHeight: 36,
                boxSizing: 'border-box',
                userSelect: 'none',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                <FormattedMessage id="file.emptyFolder" defaultMessage="Empty folder" />
              </Typography>
            </ListItem>
          )
        )
      )}
    </div>
  );
}

function FileExplorer({ minContentHeightAbove }: FileExplorerProps) {
  const { height, isExpanded, setHeight, setIsExpanded } = useFileExplorerStore();
  const { rootFolders, isLoading, addRootFolder } = useFilesStore();
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
              {isLoading && (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {!isLoading && rootFolders.length === 0 ? (
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
                    onClick={addRootFolder}
                  >
                    <FormattedMessage id="menu.fileExplorer.addFolder" defaultMessage="Add Folder" />
                  </Button>
                </Box>
              ) : (
                <div>
                  {rootFolders.map(folder => (
                    <FileNodeItem key={folder.id} node={folder} />
                  ))}
                  <ListItem
                    onClick={addRootFolder}
                    sx={{
                      pl: 2,
                      py: 0.5,
                      cursor: 'pointer',
                      height: 36,
                      minHeight: 36
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CreateNewFolderIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<FormattedMessage id="menu.fileExplorer.addFolder" defaultMessage="Add Folder" />}
                      slotProps={{
                        primary: { fontSize: '0.875rem' }
                      }}
                    />
                  </ListItem>
                </div>
              )}
            </Box>
          )}
        </Box>
      </MenuSection>
    </Box>
  );
}

export default FileExplorer;
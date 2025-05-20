import { useRef, useEffect, useState } from "react";
import { Box, Typography, Button, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Menu, MenuItem, Chip } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import MenuListItem from "@/components/Navigation/MenuListItem";
import MenuSection from "@/components/Navigation/MenuSection";
import { useFileExplorerStore } from "@/stores/Layout/FileExplorerResize";
import { useFileExplorerStore as useFilesStore, selectors, FileNode } from "@/stores/File/FileExplorerStore";
import { FormattedMessage } from "react-intl";
import FileDropDialog from "@/components/Dialog/File";
import FileClickDialog from "@/components/Dialog/File/FileClickDialog";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { getUserTokenFromStore } from "@/utils/user";
import { useKBStore } from '@/stores/KB/KBStore';

// Define props interface
interface FileExplorerProps {
  minContentHeightAbove: number;
}

function FileNodeItem({ node, level = 0 }: { node: FileNode, level?: number }) {
  const { loadFolder, toggleFolder, selectItem, removeRootFolder, selectedId } = useFilesStore();
  const isLoading = useFilesStore(selectors.selectIsNodeLoading(node.id));
  const [isDragging, setIsDragging] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const [showFileDropDialog, setShowFileDropDialog] = useState(false);
  const [showFileClickDialog, setShowFileClickDialog] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const isRootNode = level === 0;
  const isRemoteRoot = isRootNode && node.source === 'remote';

  const isSelected = selectedId === node.id;
  const isLeafFile = level > 0 && node.type === 'file';

  const isDraggable = node.type === 'file';

  const iconColor = isSelected ? "primary" : (isRemoteRoot ? "info" : "primary");
  const fileIconColor = isSelected ? "primary" : "inherit";

  const { processedKbDocuments } = useKBStore();
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (node.type === 'file' && node.source === 'remote' && node.workspaceId) {
      const workspaceDocsByKb = processedKbDocuments[node.workspaceId];
      if (workspaceDocsByKb) {
        const allDocsForWorkspace = Object.values(workspaceDocsByKb).flat();
        const found = allDocsForWorkspace.some(doc => doc.filePath === node.path);
        setIsSynced(found);
      } else {
        setIsSynced(false);
      }
    } else {
      setIsSynced(false);
    }
  }, [node.type, node.source, node.workspaceId, node.path, processedKbDocuments]);

  const handleClick = () => {
    if (isLoading) return;

    if (node.type === 'directory') {
      if (node.isExpanded || (node.children && node.children.length > 0)) {
        toggleFolder(node.id);
      } else {
        const token = getUserTokenFromStore();
        if (token) {
          loadFolder(node.id, token);
        }
      }
    } else {
      selectItem(node.id);

      if (isLeafFile) {
        setShowFileClickDialog(true);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', node.id);
    if (e.dataTransfer.setDragImage && e.currentTarget) {
      e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    }
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.4';
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    setIsDragging(false);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dNodeId = e.dataTransfer.getData('text/plain');
    console.log(`Dropped ${dNodeId} onto ${node.id}`);

    setDraggedNodeId(dNodeId);
    setShowFileDropDialog(true);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (level === 0) {
      e.preventDefault();
      e.stopPropagation();
      setMenuAnchorEl(e.currentTarget);
    }
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleRemoveFolder = () => {
    removeRootFolder(node.id);
    handleCloseMenu();
  };

  const primaryTextContent = (
    <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <Typography
        component="span"
        noWrap
        sx={{
          lineHeight: 1.1,
          color: isSelected ? 'primary.main' : 'inherit',
          fontWeight: isSelected ? 500 : 'inherit',
          fontSize: '0.875rem',
          flexGrow: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pr: isSynced ? 0.5 : 0,
        }}
      >
        {node.label}
      </Typography>
      {isSynced && (
        <Chip
          icon={<CloudDoneIcon sx={{ fontSize: '1rem !important', marginLeft: '2px !important', marginRight: '-2px !important' }} />}
          label="Synced"
          size="small"
          color="success"
          variant="outlined"
          sx={{
            height: '20px',
            fontSize: '0.65rem',
            lineHeight: '1',
            '.MuiChip-label': { px: '6px' },
          }}
        />
      )}
    </Box>
  );

  return (
    <div>
      <ListItem
        component="div"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable={isDraggable}
        onDragStart={isDraggable ? handleDragStart : undefined}
        onDragEnd={isDraggable ? handleDragEnd : undefined}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          pl: 2 + level * 2,
          py: 0.5,
          cursor: isLoading ? 'default' : (isDraggable ? 'grab' : 'pointer'),
          opacity: isLoading ? 0.7 : (isDragging ? 0.4 : 1),
          bgcolor: isSelected ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: isLoading ? 'transparent' : (isSelected ? 'action.selected' : 'action.hover') },
          height: 36,
          minHeight: 36,
          boxSizing: 'border-box',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          {node.type === 'directory' ? (
            isLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : node.isExpanded ? (
              <FolderOpenIcon fontSize="small" color={iconColor as "primary" | "secondary" | "info" | "success" | "warning" | "error" | "inherit" | undefined} />
            ) : (
              <FolderIcon fontSize="small" color={iconColor as "primary" | "secondary" | "info" | "success" | "warning" | "error" | "inherit" | undefined} />
            )
          ) : (
            <InsertDriveFileIcon fontSize="small" color={fileIconColor} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={primaryTextContent}
          sx={{ overflow: 'hidden' }}
        />
        {node.type === 'directory' && !isLoading && (
          node.isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />
        )}
      </ListItem>

      <Menu
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={handleRemoveFolder}
          sx={{ minHeight: 36, fontSize: 14 }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={<FormattedMessage id="menu.fileExplorer.removeFolder" defaultMessage="Remove Folder" />}
            slotProps={{
              primary: { fontSize: '0.875rem' }
            }}
          />
        </MenuItem>
      </Menu>

      <FileDropDialog
        open={showFileDropDialog}
        onClose={() => setShowFileDropDialog(false)}
        sourceNodeId={draggedNodeId}
        targetNodeId={node.id}
      />

      <FileClickDialog
        open={showFileClickDialog}
        onClose={() => setShowFileClickDialog(false)}
        nodeId={node.id}
      />

      {node.type === 'directory' && node.isExpanded && node.children && (
        node.children.length > 0 ? (
          node.children.map((child: FileNode) => (
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
  const { rootFolders, isLoading, addLocalRootFolder, addRemoteWorkspaceRoot } = useFilesStore();
  const isDragging = useRef(false);
  const startY = useRef(0);
  const fileExplorerRef = useRef<HTMLDivElement>(null);

  const { selectedContext } = useTopicStore();
  const token = getUserTokenFromStore();

  useEffect(() => {
    if (selectedContext?.id && selectedContext?.name && token && selectedContext.type === 'workspace') {
      const workspaceRootId = `remote:${selectedContext.id}:`;
      const existingRootFolder = rootFolders.find(folder => folder.id === workspaceRootId);
      if (!existingRootFolder) {
        addRemoteWorkspaceRoot(selectedContext.id, selectedContext.name, token);
      }
    }
  }, [selectedContext, token, addRemoteWorkspaceRoot, rootFolders]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isExpanded || !fileExplorerRef.current) return;

    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
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
                    onClick={addLocalRootFolder}
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
                    onClick={addLocalRootFolder}
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
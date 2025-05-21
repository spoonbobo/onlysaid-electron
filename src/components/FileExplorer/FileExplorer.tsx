import { useRef, useEffect, useState } from "react";
import { Box, Typography, Button, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Menu, MenuItem, Chip, IconButton, ListItemButton } from "@mui/material";
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
    if (isLoading && node.type === 'directory') return;

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

  const handleExpansionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
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
          lineHeight: 1,
          color: isSelected ? 'primary.main' : 'inherit',
          fontWeight: isSelected ? 500 : 'inherit',
          fontSize: '0.8rem',
          flexGrow: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pr: isSynced ? 0.25 : 0,
        }}
      >
        {node.label}
      </Typography>
      {isSynced && (
        <Chip
          icon={<CloudDoneIcon sx={{ fontSize: '0.8rem !important', marginLeft: '1px !important', marginRight: '-1px !important' }} />}
          label="Synced"
          size="small"
          color="success"
          variant="outlined"
          sx={{
            height: '18px',
            fontSize: '0.6rem',
            lineHeight: '1',
            '.MuiChip-label': { px: '4px' },
            ml: 0.5,
          }}
        />
      )}
    </Box>
  );

  return (
    <div>
      <ListItem
        component="div"
        onClick={isDraggable ? undefined : handleClick}
        onContextMenu={handleContextMenu}
        draggable={isDraggable}
        onDragStart={isDraggable ? handleDragStart : undefined}
        onDragEnd={isDraggable ? handleDragEnd : undefined}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          pl: 1 + level * 1.5,
          py: 0.25,
          cursor: isLoading ? 'default' : (isDraggable ? 'grab' : (node.type === 'directory' ? 'pointer' : 'pointer')),
          opacity: isLoading ? 0.7 : (isDragging ? 0.4 : 1),
          bgcolor: isSelected ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: isLoading ? 'transparent' : (isSelected ? 'action.selected' : 'action.hover') },
          height: 30,
          minHeight: 30,
          boxSizing: 'border-box',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ListItemIcon sx={{ minWidth: 24, p: 0, m: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {node.type === 'directory' ? (
            isLoading ? (
              <CircularProgress size={16} color="inherit" sx={{ p: 0, m: 0 }} />
            ) : (
              <IconButton onClick={handleExpansionClick} size="small" sx={{ p: 0.25 }}>
                {node.isExpanded ? <ExpandLess sx={{ fontSize: '1rem' }} /> : <ExpandMore sx={{ fontSize: '1rem' }} />}
              </IconButton>
            )
          ) : (
            <Box sx={{ width: 24, height: 24 }} />
          )}
        </ListItemIcon>
        <ListItemIcon sx={{ minWidth: 30, mr: 0.5, ml: 0.25 }}>
          {node.type === 'directory' ? (
            node.isExpanded ? (
              <FolderOpenIcon sx={{ fontSize: '1.1rem' }} color={iconColor as "primary" | "secondary" | "info" | "success" | "warning" | "error" | "inherit" | undefined} />
            ) : (
              <FolderIcon sx={{ fontSize: '1.1rem' }} color={iconColor as "primary" | "secondary" | "info" | "success" | "warning" | "error" | "inherit" | undefined} />
            )
          ) : (
            <InsertDriveFileIcon sx={{ fontSize: '1.1rem' }} color={fileIconColor} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={primaryTextContent}
          sx={{ my: 0, overflow: 'hidden', cursor: (node.type === 'file' && !isLoading ? 'pointer' : 'default') }}
          onClick={node.type === 'file' && !isLoading ? handleClick : undefined}
        />
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
          sx={{
            minHeight: 24,
            fontSize: '0.75rem',
            py: 0.25,
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 28,
              color: 'error.main',
              mr: 0.5
            }}
          >
            <DeleteOutlineIcon sx={{ fontSize: '1rem' }} />
          </ListItemIcon>
          <ListItemText
            primary={<FormattedMessage id="menu.fileExplorer.removeFolder" defaultMessage="Remove Folder" />}
            primaryTypographyProps={{ fontSize: '0.75rem' }}
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
                pl: 1 + (level + 1) * 1.5 + (24 / 8 / 2),
                py: 0.25,
                height: 30,
                minHeight: 30,
                boxSizing: 'border-box',
                userSelect: 'none',
              }}
            >
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }} color="text.secondary">
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

      const minExplorerHeight = 30;

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
            height: "3px",
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

      <MenuSection sx={{ p: 0, '& .MuiList-root': { p: 0, m: 0 } }}>
        <Box>
          <ListItemButton
            onClick={() => setIsExpanded(!isExpanded)}
            sx={{
              py: 0.375,
              px: 0.75,
              minHeight: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <IconButton size="small" sx={{ p: 0.1, mr: 0.5 }}>
              {isExpanded ? <ExpandLess sx={{ fontSize: '1rem' }} /> : <ExpandMore sx={{ fontSize: '1rem' }} />}
            </IconButton>
            <ListItemIcon sx={{ minWidth: 'auto', mr: 0.75 }}>
              <FolderIcon color="primary" sx={{ fontSize: '1.1rem' }} />
            </ListItemIcon>
            <ListItemText
              primary={<FormattedMessage id="menu.fileExplorer" />}
              slotProps={{
                primary: {
                  sx: {
                    fontWeight: 500,
                    fontSize: "0.8rem",
                    color: "primary.main",
                    lineHeight: 1,
                  }
                }
              }}
              sx={{ my: 0 }}
            />
          </ListItemButton>

          {isExpanded && (
            <Box
              sx={{
                height: `${height}px`,
                overflow: "auto",
                transition: isDragging.current ? 'none' : 'height 0.2s ease',
              }}
            >
              {isLoading && (
                <Box display="flex" justifyContent="center" p={1.5}>
                  <CircularProgress size={20} />
                </Box>
              )}

              {!isLoading && rootFolders.length === 0 ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                  p={1.5}
                  textAlign="center"
                >
                  <Typography color="text.secondary" sx={{ fontSize: '0.8rem' }} gutterBottom>
                    <FormattedMessage id="menu.fileExplorer.empty" defaultMessage="No folders found" />
                  </Typography>
                  <Button
                    startIcon={<CreateNewFolderIcon sx={{ fontSize: '1.1rem' }} />}
                    variant="outlined"
                    size="small"
                    color="primary"
                    sx={{ mt: 0.5, fontSize: '0.75rem', py: 0.25 }}
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
                      pl: 1.5,
                      py: 0.25,
                      cursor: 'pointer',
                      height: 30,
                      minHeight: 30
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 30, mr: 0.5 }}>
                      <CreateNewFolderIcon sx={{ fontSize: '1.1rem' }} color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<FormattedMessage id="menu.fileExplorer.addFolder" defaultMessage="Add Folder" />}
                      primaryTypographyProps={{ fontSize: '0.8rem' }}
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
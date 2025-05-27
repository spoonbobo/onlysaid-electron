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
import MenuSection from "@/renderer/components/Navigation/MenuSection";
import { FormattedMessage } from "react-intl";
import FileDropDialog from "@/renderer/components/Dialog/File";
import FileClickDialog from "@/renderer/components/Dialog/File/FileClickDialog";
import { getUserTokenFromStore } from "@/utils/user";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useFileExplorerStore } from "@/renderer/stores/Layout/FileExplorerResize";
import { useFileExplorerStore as useFilesStore, selectors, FileNode } from "@/renderer/stores/File/FileExplorerStore";
import { useKBStore } from '@/renderer/stores/KB/KBStore';
import { toast } from "@/utils/toast";
import DownloadIcon from "@mui/icons-material/Download";
import { useToastStore } from "@/renderer/stores/Notification/ToastStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";

// Define props interface
interface FileExplorerProps {
  minContentHeightAbove: number;
}

// Helper function to read file as Data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Helper functions for basic path operations
const getPathExtension = (filePath: string): string => {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0 || lastDot === filePath.length - 1) { // No extension or hidden file like .bashrc
    return '';
  }
  return filePath.substring(lastDot); // Includes the dot, e.g., ".txt"
};

const getPathBasename = (filePath: string, ext?: string): string => {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  const fileName = lastSlash === -1 ? filePath : filePath.substring(lastSlash + 1);

  if (ext && fileName.endsWith(ext)) {
    return fileName.substring(0, fileName.length - ext.length);
  }
  return fileName;
};

function FileNodeItem({ node, level = 0 }: { node: FileNode, level?: number }) {
  const { loadFolder, toggleFolder, selectItem, removeRootFolder, selectedId, refreshFolder } = useFilesStore();
  const isLoading = useFilesStore(selectors.selectIsNodeLoading(node.id));
  const [isDragging, setIsDragging] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const [showFileDropDialog, setShowFileDropDialog] = useState(false);
  const [showFileClickDialog, setShowFileClickDialog] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [externalDropInfo, setExternalDropInfo] = useState<{ count: number; names: string[] } | null>(null);

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
    if (node.type === 'file' && node.source === 'remote' && node.workspaceId && node.fileDbId) {
      const workspaceKbsData = processedKbDocuments[node.workspaceId];
      if (workspaceKbsData) {
        const allDocsForWorkspace = Object.values(workspaceKbsData).flat();

        const found = allDocsForWorkspace.some(doc => {
          if (doc.title) {
            const ext = getPathExtension(doc.title);
            const docFileUuid = ext ? getPathBasename(doc.title, ext) : doc.title;
            return docFileUuid === node.fileDbId;
          }
          return false;
        });
        setIsSynced(found);
      } else {
        setIsSynced(false);
      }
    } else {
      setIsSynced(false);
    }
  }, [node.type, node.source, node.workspaceId, node.fileDbId, processedKbDocuments]);

  const handleClick = () => {
    if (isLoading && node.type === 'directory') return;

    if (node.type === 'directory') {
      if (node.isExpanded) {
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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const droppedFiles = e.dataTransfer.files;

    if (droppedFiles && droppedFiles.length > 0) {
      const targetNodeForUpload = node;

      console.log("[FileExplorer DEBUG] Drop Target Node:", {
        id: targetNodeForUpload.id,
        name: targetNodeForUpload.name,
        label: targetNodeForUpload.label,
        path: targetNodeForUpload.path,
        type: targetNodeForUpload.type,
        source: targetNodeForUpload.source,
        workspaceId: targetNodeForUpload.workspaceId,
      });

      if (targetNodeForUpload.type === 'directory' && targetNodeForUpload.source === 'remote' && targetNodeForUpload.workspaceId) {
        const token = getUserTokenFromStore();
        if (!token) {
          toast.error("Authentication token not found. Cannot upload files.");
          console.error("[FileExplorer DEBUG] Auth token missing for upload.");
          return;
        }
        const workspaceId = targetNodeForUpload.workspaceId;
        const targetDirectoryPathInWorkspace = targetNodeForUpload.path;

        console.log("[FileExplorer DEBUG] Workspace ID for Upload:", workspaceId);
        console.log("[FileExplorer DEBUG] Target Directory Path in Workspace (from node.path):", targetDirectoryPathInWorkspace);

        let uploadInitiatedCount = 0;

        for (let i = 0; i < droppedFiles.length; i++) {
          const file = droppedFiles[i];

          console.log(`[FileExplorer DEBUG] Processing file ${i + 1}:`, { name: file.name, size: file.size, type: file.type });

          try {
            toast.info(`Processing: ${file.name}`);
            const fileData = await readFileAsDataURL(file);

            const remoteFileName = file.name;
            const finalTargetPathInWorkspace = targetDirectoryPathInWorkspace ? `${targetDirectoryPathInWorkspace}/${remoteFileName}` : remoteFileName;

            console.log("[FileExplorer DEBUG] Original remoteFileName:", remoteFileName);
            console.log("[FileExplorer DEBUG] Calculated finalTargetPathInWorkspace:", finalTargetPathInWorkspace);

            const metadata = {
              targetPath: finalTargetPathInWorkspace,
            };
            console.log("[FileExplorer DEBUG] Metadata to be sent:", metadata);

            window.electron.fileSystem.uploadFile({
              workspaceId,
              fileData,
              fileName: file.name,
              token,
              metadata
            }).then((response: { operationId?: string; error?: string }) => {
              if (response.error) {
                toast.error(`Upload failed for ${file.name}: ${response.error}`);
                console.error(`[FileExplorer DEBUG] Upload failed for ${file.name}:`, response.error);
              } else if (response.operationId) {
                console.log(`[FileExplorer DEBUG] Upload queued for ${file.name}, OpID: ${response.operationId}`);
              }
            }).catch((uploadError: any) => {
              toast.error(`Upload error for ${file.name}: ${uploadError.message || 'Unknown error'}`);
              console.error(`[FileExplorer DEBUG] Catch block for upload error of ${file.name}:`, uploadError);
            });
            uploadInitiatedCount++;
          } catch (err: any) {
            toast.error(`Failed to process ${file.name} for upload: ${err.message}`);
            console.error(`[FileExplorer DEBUG] Error processing or initiating file upload for ${file.name}:`, err);
          }
        }

        if (uploadInitiatedCount > 0) {
          setTimeout(() => {
            const token = getUserTokenFromStore();
            if (token) {
              refreshFolder(targetNodeForUpload.id, token);
              toast.info(`Refreshed folder: ${targetNodeForUpload.name} after uploads.`);
              console.log(`[FileExplorer DEBUG] Refreshed folder: ${targetNodeForUpload.name}`);
            }
          }, 5000 + uploadInitiatedCount * 1000);
        }
        return;
      }

      console.log("[FileExplorer DEBUG] Fallback: External file(s) dropped, but not onto a remote directory or missing info. Target:", {
        id: targetNodeForUpload.id,
        name: targetNodeForUpload.name,
        path: targetNodeForUpload.path,
        type: targetNodeForUpload.type,
        source: targetNodeForUpload.source
      });
      const filesArray = Array.from(droppedFiles);
      const fileNames = filesArray.map(f => f.name).slice(0, 3);
      const fileCount = filesArray.length;

      setDraggedNodeId(null);
      setExternalDropInfo({ count: fileCount, names: fileNames });
      setShowFileDropDialog(true);
      return;
    }

    const dNodeId = e.dataTransfer.getData('text/plain');
    if (!dNodeId) {
      console.warn("Internal drop event, but no 'text/plain' data (node ID) found.");
      return;
    }

    setExternalDropInfo(null);
    setDraggedNodeId(dNodeId);
    setShowFileDropDialog(true);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (level === 0 || (node.type === 'file' && node.source === 'remote' && node.workspaceId && node.fileDbId)) {
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

  const handleDownloadFile = async () => {
    if (!node || node.type !== 'file' || !node.workspaceId || !node.fileDbId) {
      toast.error("Cannot download: Invalid file information");
      handleCloseMenu();
      return;
    }

    const token = getUserTokenFromStore();
    if (!token) {
      toast.error("Authentication token not found");
      handleCloseMenu();
      return;
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('dialog:showSaveDialog', {
        defaultPath: node.name,
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        handleCloseMenu();
        return;
      }

      const toastId = useToastStore.getState().addToast(`Downloading: ${node.name}`, "info", 0);

      const downloadResult = await window.electron.fileSystem.download(
        node.workspaceId,
        node.fileDbId,
        result.filePath,
        token
      );

      if (downloadResult.operationId) {
        const progressUnsubscribe = window.electron.fileSystem.onProgress((data) => {
          if (data.operationId === downloadResult.operationId && toastId) {
            useToastStore.getState().updateToastProgress(toastId, data.progress);
          }
        });

        const checkStatus = async () => {
          const status = await window.electron.fileSystem.getStatus(downloadResult.operationId);
          if (status?.status === 'completed') {
            if (toastId) {
              useToastStore.getState().updateToastProgress(toastId, 100);
              setTimeout(() => {
                useToastStore.getState().removeToast(toastId);
                toast.success(`Download completed: ${node.name}`);
              }, 1000);
            }
            progressUnsubscribe();
          } else if (status?.status === 'failed') {
            if (toastId) {
              useToastStore.getState().removeToast(toastId);
            }
            toast.error(`Download failed: ${status.error || 'Unknown error'}`);
            progressUnsubscribe();
          } else {
            setTimeout(checkStatus, 1000);
          }
        };

        checkStatus();
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

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
        {level === 0 && (
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
        )}

        {node.type === 'file' && node.source === 'remote' && node.workspaceId && node.fileDbId && (
          <MenuItem
            onClick={handleDownloadFile}
            sx={{
              minHeight: 24,
              fontSize: '0.75rem',
              py: 0.25,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 28,
                color: 'primary.main',
                mr: 0.5
              }}
            >
              <DownloadIcon sx={{ fontSize: '1rem' }} />
            </ListItemIcon>
            <ListItemText
              primary={<FormattedMessage id="dialog.file.download" defaultMessage="Download" />}
              slotProps={{
                primary: {
                  sx: { fontSize: '0.75rem' }
                }
              }}
            />
          </MenuItem>
        )}
      </Menu>

      <FileDropDialog
        open={showFileDropDialog}
        onClose={() => {
          setShowFileDropDialog(false);
          setDraggedNodeId(null);
          setExternalDropInfo(null);
        }}
        sourceNodeId={draggedNodeId}
        targetNodeId={node.id}
        externalFileDetails={externalDropInfo}
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
  const syncInProgressRef = useRef(false);

  const { contexts } = useTopicStore();
  const { workspaces } = useWorkspaceStore();
  const token = getUserTokenFromStore();

  useEffect(() => {
    const syncWorkspaceRoots = async () => {
      // Prevent concurrent syncs
      if (syncInProgressRef.current || !token) return;

      syncInProgressRef.current = true;

      try {
        const workspaceContexts = (contexts || []).filter(context => context.type === "workspace");
        const validWorkspaceIds = workspaceContexts
          .map(context => context.id)
          .filter(workspaceId => workspaces.some(ws => ws.id === workspaceId));

        console.log('[FileExplorer] Syncing workspace roots for:', validWorkspaceIds);

        // Get current remote root workspace IDs
        const currentRootFolders = useFilesStore.getState().rootFolders;
        const currentRemoteWorkspaceIds = currentRootFolders
          .filter(folder => folder.source === 'remote' && folder.path === '')
          .map(folder => folder.workspaceId)
          .filter(Boolean);

        // Remove workspace roots that should no longer be shown
        const workspaceIdsToRemove = currentRemoteWorkspaceIds.filter(
          workspaceId => !validWorkspaceIds.includes(workspaceId!)
        );

        workspaceIdsToRemove.forEach(workspaceId => {
          if (workspaceId) {
            useFilesStore.getState().removeRemoteRootFolderByWorkspaceId(workspaceId);
          }
        });

        // Add new workspace roots sequentially to avoid race conditions
        for (const workspaceId of validWorkspaceIds) {
          if (!workspaceId) continue; // Type guard

          // Re-check current state before each addition to ensure no duplicates
          const currentState = useFilesStore.getState().rootFolders;
          const existingRoot = currentState.find(folder =>
            folder.source === 'remote' &&
            folder.path === '' &&
            folder.workspaceId === workspaceId
          );

          if (!existingRoot) {
            const workspace = workspaces.find(ws => ws.id === workspaceId);
            if (workspace) {
              await useFilesStore.getState().addRemoteWorkspaceRoot(
                workspaceId,
                workspace.name,
                token
              );
            }
          }
        }
      } catch (error) {
        console.error('[FileExplorer] Error syncing workspace roots:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    syncWorkspaceRoots();
  }, [contexts, workspaces, token]);

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
                      slotProps={{
                        primary: {
                          sx: { fontSize: '0.8rem' }
                        }
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

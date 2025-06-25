import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Breadcrumbs,
  Link,
  CircularProgress,
  Chip,
  Paper,
  Divider
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  Home as HomeIcon,
  CloudDone as CloudDoneIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { useFileExplorerStore as useFilesStore, selectors, FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { useKBStore } from '@/renderer/stores/KB/KBStore';
import { getUserTokenFromStore } from '@/utils/user';
import FileClickDialog from '@/renderer/components/Dialog/File/FileClickDialog';

// Helper functions for path operations
const getPathExtension = (filePath: string): string => {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0 || lastDot === filePath.length - 1) {
    return '';
  }
  return filePath.substring(lastDot);
};

const getPathBasename = (filePath: string, ext?: string): string => {
  const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  const fileName = lastSlash === -1 ? filePath : filePath.substring(lastSlash + 1);

  if (ext && fileName.endsWith(ext)) {
    return fileName.substring(0, fileName.length - ext.length);
  }
  return fileName;
};

// Helper function to build path breadcrumbs
const buildPathBreadcrumbs = (node: FileNode | null, allNodes: FileNode[]): Array<{ name: string; nodeId: string; path: string }> => {
  if (!node) return [];

  const breadcrumbs: Array<{ name: string; nodeId: string; path: string }> = [];
  
  // Add the current node
  breadcrumbs.unshift({ name: node.name, nodeId: node.id, path: node.path });
  
  // Find parent nodes by traversing up the path
  let currentPath = node.path;
  
  while (currentPath && currentPath !== '') {
    // Get parent path
    const lastSlash = Math.max(currentPath.lastIndexOf('/'), currentPath.lastIndexOf('\\'));
    const parentPath = lastSlash > 0 ? currentPath.substring(0, lastSlash) : '';
    
    // Find parent node
    const parentNode = findNodeByPath(allNodes, parentPath, node.source, node.workspaceId);
    
    if (parentNode) {
      breadcrumbs.unshift({ name: parentNode.name, nodeId: parentNode.id, path: parentNode.path });
      currentPath = parentPath;
    } else {
      break;
    }
  }
  
  return breadcrumbs;
};

// Helper function to find node by path
const findNodeByPath = (nodes: FileNode[], path: string, source: string, workspaceId?: string): FileNode | null => {
  for (const node of nodes) {
    if (node.path === path && node.source === source && node.workspaceId === workspaceId) {
      return node;
    }
    if (node.children) {
      const found = findNodeByPath(node.children, path, source, workspaceId);
      if (found) return found;
    }
  }
  return null;
};

// Helper function to find all nodes recursively
const getAllNodes = (nodes: FileNode[]): FileNode[] => {
  const allNodes: FileNode[] = [];
  
  const traverse = (nodeList: FileNode[]) => {
    for (const node of nodeList) {
      allNodes.push(node);
      if (node.children) {
        traverse(node.children);
      }
    }
  };
  
  traverse(nodes);
  return allNodes;
};

interface FileListItemProps {
  node: FileNode;
  onNodeClick: (node: FileNode) => void;
  onFileClick: (node: FileNode) => void;
}

function FileListItem({ node, onNodeClick, onFileClick }: FileListItemProps) {
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
    if (node.type === 'directory') {
      onNodeClick(node);
    } else {
      onFileClick(node);
    }
  };

  return (
    <ListItemButton
      onClick={handleClick}
      sx={{
        py: 1,
        px: 2,
        borderRadius: 1,
        mb: 0.5,
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        {node.type === 'directory' ? (
          <FolderIcon color="primary" />
        ) : (
          <FileIcon color="inherit" />
        )}
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ flexGrow: 1 }}>
              {node.name}
            </Typography>
            {isSynced && (
              <Chip
                icon={<CloudDoneIcon sx={{ fontSize: '0.8rem !important' }} />}
                label="Synced"
                size="small"
                color="success"
                variant="outlined"
                sx={{
                  height: '20px',
                  fontSize: '0.7rem',
                  '.MuiChip-label': { px: '6px' },
                }}
              />
            )}
          </Box>
        }
        secondary={node.type === 'directory' ? 'Folder' : 'File'}
      />
    </ListItemButton>
  );
}

function FileExplorer() {
  const { 
    rootFolders, 
    loadFolder, 
    refreshFolder, 
    setCurrentNode, 
    getCurrentNode 
  } = useFilesStore();
  
  const currentNodeId = useFilesStore(selectors.selectCurrentNodeId);
  const [isLoading, setIsLoading] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedFileNode, setSelectedFileNode] = useState<FileNode | null>(null);
  
  const token = getUserTokenFromStore();
  const allNodes = getAllNodes(rootFolders);
  
  // Get current node from store
  const currentNode = getCurrentNode();
  const breadcrumbs = buildPathBreadcrumbs(currentNode, allNodes);

  // Get current directory contents
  const currentContents = currentNode?.children || rootFolders;

  // Initialize current node from persisted state on mount
  useEffect(() => {
    if (currentNodeId && !currentNode && allNodes.length > 0) {
      // Try to find the persisted current node
      const persistedNode = allNodes.find(n => n.id === currentNodeId);
      if (persistedNode && persistedNode.type === 'directory') {
        // If the node exists but doesn't have children loaded, load them
        if (!persistedNode.children || persistedNode.children.length === 0) {
          if (token) {
            loadFolder(persistedNode.id, token);
          }
        }
      } else {
        // If the persisted node no longer exists, clear it
        setCurrentNode(null);
      }
    }
  }, [currentNodeId, currentNode, allNodes, token, loadFolder, setCurrentNode]);

  const handleNodeClick = async (node: FileNode) => {
    if (node.type !== 'directory') return;

    setIsLoading(true);
    
    try {
      // Load folder contents if not already loaded
      if (!node.children || node.children.length === 0) {
        if (token) {
          await loadFolder(node.id, token);
        }
      }
      
      // Update current node in store (this will persist it)
      setCurrentNode(node.id);
    } catch (error) {
      console.error('Error loading folder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (node: FileNode) => {
    setSelectedFileNode(node);
    setShowFileDialog(true);
  };

  const handleBreadcrumbClick = async (nodeId: string) => {
    if (nodeId === 'root') {
      setCurrentNode(null);
      return;
    }

    const node = allNodes.find(n => n.id === nodeId);
    if (node && node.type === 'directory') {
      await handleNodeClick(node);
    }
  };

  const handleGoBack = () => {
    if (breadcrumbs.length > 1) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];
      handleBreadcrumbClick(parentBreadcrumb.nodeId);
    } else {
      setCurrentNode(null);
    }
  };

  const handleRefresh = async () => {
    if (currentNode && token) {
      setIsLoading(true);
      try {
        await refreshFolder(currentNode.id, token);
      } catch (error) {
        console.error('Error refreshing folder:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with breadcrumbs and actions */}
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 2, 
          borderRadius: 2,
          bgcolor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
            <FormattedMessage id="menu.fileExplorer" defaultMessage="File Explorer" />
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {currentNode && (
              <>
                <IconButton
                  onClick={handleGoBack}
                  size="small"
                  sx={{ bgcolor: 'action.hover' }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <IconButton
                  onClick={handleRefresh}
                  size="small"
                  disabled={isLoading}
                  sx={{ bgcolor: 'action.hover' }}
                >
                  <RefreshIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Box>

        {/* Breadcrumb navigation */}
        <Breadcrumbs
          separator="›"
          sx={{
            '& .MuiBreadcrumbs-separator': {
              mx: 1,
              color: 'text.secondary'
            }
          }}
        >
          <Link
            component="button"
            variant="body2"
            onClick={() => handleBreadcrumbClick('root')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              textDecoration: 'none',
              color: currentNode ? 'primary.main' : 'text.primary',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            <HomeIcon sx={{ fontSize: '1rem' }} />
            <FormattedMessage id="menu.fileExplorer" defaultMessage="File Explorer" />
          </Link>
          
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <Link
                key={crumb.nodeId}
                component="button"
                variant="body2"
                onClick={() => !isLast && handleBreadcrumbClick(crumb.nodeId)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  textDecoration: 'none',
                  color: isLast ? 'text.primary' : 'primary.main',
                  cursor: isLast ? 'default' : 'pointer',
                  fontWeight: isLast ? 600 : 400,
                  '&:hover': {
                    textDecoration: isLast ? 'none' : 'underline'
                  }
                }}
              >
                <FolderIcon sx={{ fontSize: '1rem' }} />
                {crumb.name}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Paper>

      {/* Content area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px' 
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            {currentContents.length === 0 ? (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '200px',
                  textAlign: 'center',
                  color: 'text.secondary'
                }}
              >
                <FolderOpenIcon sx={{ fontSize: '3rem', mb: 2, opacity: 0.5 }} />
                <Typography variant="h6" gutterBottom>
                  <FormattedMessage id="file.emptyFolder" defaultMessage="Empty folder" />
                </Typography>
                <Typography variant="body2">
                  <FormattedMessage 
                    id="menu.fileExplorer.empty" 
                    defaultMessage="No folders found" 
                  />
                </Typography>
              </Box>
            ) : (
              <List sx={{ px: 2 }}>
                {currentContents.map((node) => (
                  <FileListItem
                    key={node.id}
                    node={node}
                    onNodeClick={handleNodeClick}
                    onFileClick={handleFileClick}
                  />
                ))}
              </List>
            )}
          </>
        )}
      </Box>

      {/* File dialog */}
      <FileClickDialog
        open={showFileDialog}
        onClose={() => {
          setShowFileDialog(false);
          setSelectedFileNode(null);
        }}
        nodeId={selectedFileNode?.id || ''}
      />
    </Box>
  );
}

export default FileExplorer;

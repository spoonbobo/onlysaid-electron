import React, { useState, useEffect, useMemo } from 'react';
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
  Refresh as RefreshIcon,
  Image as ImageIcon,
  Description as DocumentIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { useFileExplorerStore as useFilesStore, selectors, FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { useKBStore } from '@/renderer/stores/KB/KBStore';
import { getUserTokenFromStore } from '@/utils/user';
import FileClickDialog from '@/renderer/components/Dialog/File/FileClickDialog';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';
import { useCurrentTopicContext } from '@/renderer/stores/Topic/TopicStore';

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

// Helper function to check if file supports copilot
const supportsCopilot = (fileName: string): boolean => {
  if (!fileName) return false;
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  // TXT, DOCX, and Excel files are supported for copilot mode
  const supportedExts = ['.txt', '.docx', '.doc', '.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'];
  return supportedExts.includes(ext);
};

// Helper function to get file type for icon
const getFileType = (fileName: string): string => {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  // Image formats
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico'];
  if (imageExts.includes(ext)) {
    return 'image';
  }
  
  // Document formats - keeping full list for display purposes, but copilot only supports txt
  const docExts = ['.txt', '.md', '.markdown', '.csv', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.pdf', '.odt', '.ods', '.odp', '.rtf', '.html', '.htm', '.xml'];
  if (docExts.includes(ext)) {
    return 'document';
  }
  
  return 'unknown';
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
  onEditClick: (node: FileNode, event: React.MouseEvent) => void;
}

function FileListItem({ node, onNodeClick, onFileClick, onEditClick }: FileListItemProps) {
  const { processedKbDocuments } = useKBStore();
  const [isSynced, setIsSynced] = useState(false);

  // Get file type for icon and check copilot support
  const fileType = node.type === 'file' ? getFileType(node.name) : 'unknown';
  const canUseCopilot = node.type === 'file' && supportsCopilot(node.name);

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
        py: 0.5, // Reduced from 1 to 0.5 for more compact rows
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
          fileType === 'image' ? (
            <ImageIcon color="secondary" />
          ) : fileType === 'document' ? (
            <DocumentIcon color="info" />
          ) : (
            <FileIcon color="inherit" />
          )
        )}
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" sx={{ flexGrow: 1 }}>
              {node.name}
            </Typography>
            {canUseCopilot && (
              <Box 
                onClick={(event) => onEditClick(node, event)}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.3,
                  color: 'primary.main',
                  fontSize: '0.75rem',
                  mr: isSynced ? 1 : 0,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 1,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    transform: 'scale(1.05)'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 'inherit', color: 'inherit' }}>
                  Edit
                </Typography>
                <ArrowForwardIcon sx={{ fontSize: '0.8rem' }} />
              </Box>
            )}
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
        // Removed secondary prop to eliminate the "Folder"/"File" text
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
  
  const { setCurrentDocument, setActive } = useCopilotStore();
  const { setSelectedContext } = useCurrentTopicContext();
  
  const currentNodeId = useFilesStore(selectors.selectCurrentNodeId);
  const [isLoading, setIsLoading] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedFileNode, setSelectedFileNode] = useState<FileNode | null>(null);
  
  const token = getUserTokenFromStore();
  const allNodes = getAllNodes(rootFolders);
  
  // Get current node from store
  const currentNode = getCurrentNode();
  const breadcrumbs = buildPathBreadcrumbs(currentNode, allNodes);

  // Get current directory contents and sort them: folders first, then files, both alphabetically
  const currentContents = useMemo(() => {
    const contents = currentNode?.children || rootFolders;
    
    // Sort: folders first, then files, both alphabetically
    return contents.slice().sort((a, b) => {
      // If one is directory and other is file, directory comes first
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      
      // If both are same type, sort alphabetically by name (case-insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [currentNode?.children, rootFolders]);

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
    
    // Also set in copilot store for potential copilot mode
    setCurrentDocument(node);
  };

  const handleEditClick = (node: FileNode, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent file dialog from opening
    
    // Set the document in Copilot store
    setCurrentDocument(node);
    setActive(true);
    
    // Create copilot context and navigate to it
    const copilotContext = {
      id: `copilot-${node.id}`,
      name: `Copilot: ${node.name}`,
      type: 'copilot' as const,
      section: 'local:copilot'
    };
    
    setSelectedContext(copilotContext);
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
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        px: 2, 
        py: 1,
        mb: 1
      }}>
        {/* Breadcrumb navigation */}
        <Breadcrumbs
          separator="›"
          sx={{
            flex: 1,
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
              px: 1,
              py: 0.5,
              borderRadius: 1,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'primary.main',
                transform: 'scale(1.02)'
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
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': isLast ? {} : {
                    bgcolor: 'action.hover',
                    color: 'primary.dark',
                    transform: 'scale(1.02)'
                  }
                }}
              >
                <FolderIcon sx={{ fontSize: '1rem' }} />
                {crumb.name}
              </Link>
            );
          })}
        </Breadcrumbs>

        {/* Action buttons */}
        {currentNode && (
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            <IconButton
              onClick={handleGoBack}
              size="small"
              sx={{ bgcolor: 'action.hover' }}
              title="Go Back"
            >
              <ArrowBackIcon />
            </IconButton>
            <IconButton
              onClick={handleRefresh}
              size="small"
              disabled={isLoading}
              sx={{ bgcolor: 'action.hover' }}
              title="Refresh Folder"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        )}
      </Box>

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
                    onEditClick={handleEditClick}
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
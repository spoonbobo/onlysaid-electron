import { 
  Box, 
  Typography, 
  CircularProgress, 
  Paper, 
  SxProps, 
  Theme, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip
} from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useKBStore, ProcessedKBDocument } from "@/renderer/stores/KB/KBStore";
import { useCurrentTopicContext, useTopicStore, KNOWLEDGE_BASE_SELECTION_KEY } from "@/renderer/stores/Topic/TopicStore";
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleIcon from '@mui/icons-material/Article';
import CodeIcon from '@mui/icons-material/Code';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from '@mui/icons-material/Search'; // ✅ Changed from SyncIcon to SearchIcon for scan
import { toast } from "@/utils/toast";

// Placeholder for the actual status structure.
// You might want to replace this with a more specific type
// once you know the exact shape of the statusResult from getKBStatus.
export interface IKBStatus {
  // Example fields - adjust based on actual data
  lastChecked?: string;
  status?: string;
  message?: string | null;
  syncState?: 'syncing' | 'synced' | 'error' | 'pending';
  documentCount?: number;
  errorDetails?: string;
  [key: string]: any; // Allow other properties
}

// Interface for the actual KB structure response
interface KBStatusDocument {
  id: string;
  file_path: string;
  content_summary: string;
  chunks_count: number;
  content_length: number;
  status: string;
  created_at: string;
  updated_at: string;
  error: any;
  metadata: any;
}

interface KBExplorerProps {
  kbStatus: IKBStatus | null;
  isLoading: boolean;
  onScanDocuments: () => Promise<void>; // ✅ Changed from onReinitialize to onScanDocuments
  onRefreshStructure: () => void;
  sx?: SxProps<Theme>;
}

const KBExplorer: React.FC<KBExplorerProps> = ({ 
  kbStatus, 
  isLoading, 
  onScanDocuments, // ✅ Changed from onReinitialize
  onRefreshStructure,
  sx 
}) => {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const { selectedTopics } = useTopicStore();
  const { processedKbDocuments, viewKnowledgeBaseStructure } = useKBStore();
  
  const [kbStructureData, setKbStructureData] = useState<any>(null);
  const [isLoadingStructure, setIsLoadingStructure] = useState(false);

  // Remove the refresh trigger state - it's causing infinite loops
  // const [refreshTrigger, setRefreshTrigger] = useState(0);

  const currentWorkspaceId = useMemo(() => {
    return selectedContext?.type === "workspace" ? selectedContext.id : undefined;
  }, [selectedContext]);

  const selectedKbId = selectedTopics[KNOWLEDGE_BASE_SELECTION_KEY];

  // Fetch KB structure data directly
  useEffect(() => {
    if (currentWorkspaceId && selectedKbId) {
      setIsLoadingStructure(true);
      
      // Add a small delay to debounce rapid calls
      const timeoutId = setTimeout(() => {
        viewKnowledgeBaseStructure(currentWorkspaceId, selectedKbId)
          .then((result) => {
            setKbStructureData(result);
          })
          .catch((err) => {
            console.error('Error fetching KB structure:', err);
            setKbStructureData(null);
          })
          .finally(() => {
            setIsLoadingStructure(false);
          });
      }, 100); // 100ms debounce

      return () => {
        clearTimeout(timeoutId);
        setIsLoadingStructure(false);
      };
    } else {
      setKbStructureData(null);
      setIsLoadingStructure(false);
    }
  }, [currentWorkspaceId, selectedKbId]); // Removed refreshTrigger to prevent infinite loop

  // Use parent's refresh function, but also trigger internal refresh
  const handleRefresh = useCallback(() => {
    // Instead of using a trigger, directly call the parent refresh
    onRefreshStructure();
  }, [onRefreshStructure]);

  // Process documents from the raw structure data
  const documents = useMemo(() => {
    if (!kbStructureData || !kbStructureData.statuses) return [];
    
    // Handle the actual response structure: { statuses: { processed: [...] } }
    const processedDocs = kbStructureData.statuses.processed || [];
    
    return processedDocs.map((doc: KBStatusDocument) => ({
      id: doc.id,
      filePath: doc.file_path,
      title: doc.file_path.split('/').pop() || doc.file_path, // Use filename as title
      originalUrl: `file:///${doc.file_path}`, // Construct original URL
      contentSummary: doc.content_summary,
      chunksCount: doc.chunks_count,
      contentLength: doc.content_length,
      status: doc.status,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      error: doc.error,
      metadata: doc.metadata
    }));
  }, [kbStructureData]);

  // Helper function to get file extension
  const getFileExtension = (filePath: string): string => {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot > 0 ? filePath.substring(lastDot + 1).toLowerCase() : '';
  };

  // Helper function to get appropriate icon for file type
  const getFileIcon = (filePath: string) => {
    const extension = getFileExtension(filePath);
    
    switch (extension) {
      case 'pdf':
        return <PictureAsPdfIcon sx={{ color: '#d32f2f' }} />;
      case 'doc':
      case 'docx':
        return <ArticleIcon sx={{ color: '#1976d2' }} />;
      case 'txt':
      case 'md':
        return <ArticleIcon sx={{ color: '#666' }} />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
        return <CodeIcon sx={{ color: '#ff9800' }} />;
      default:
        return <InsertDriveFileIcon sx={{ color: '#757575' }} />;
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper function to format file path for display
  const formatFilePath = (filePath: string): string => {
    // Remove leading slashes and show relative path
    return filePath.replace(/^\/+/, '');
  };

  // Helper function to get directory from file path
  const getDirectoryPath = (filePath: string): string => {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
  };

  // Helper function to get filename from file path
  const getFileName = (filePath: string): string => {
    const lastSlash = filePath.lastIndexOf('/');
    return lastSlash >= 0 ? filePath.substring(lastSlash + 1) : filePath;
  };

  return (
    <Box 
      sx={{
        ...sx,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Loading State */}
      {(isLoading || isLoadingStructure) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            <FormattedMessage 
              id="kbExplorer.loadingFiles" 
              defaultMessage="Loading files..."
            />
          </Typography>
        </Box>
      )}

      {/* No Selection State */}
      {!selectedKbId && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
          <Typography variant="body2" color="text.secondary">
            <FormattedMessage 
              id="kbExplorer.noSelection" 
              defaultMessage="Select a knowledge base to browse its files"
            />
          </Typography>
        </Box>
      )}

      {/* Header with title and action buttons */}
      {selectedKbId && !isLoading && !isLoadingStructure && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              <FormattedMessage id="settings.kb.explorerSection.title" defaultMessage="KB Explorer" />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage 
                id="kbExplorer.fileCount" 
                defaultMessage="{count} {count, plural, one {file} other {files}} found"
                values={{ count: documents.length }}
              />
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            <Tooltip title={intl.formatMessage({ id: "settings.kb.explorer.refresh", defaultMessage: "Refresh File List" })}>
              <span>
                <IconButton size="small" color="info" onClick={handleRefresh} disabled={isLoading || isLoadingStructure}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={intl.formatMessage({ id: "kbExplorer.scanDocuments", defaultMessage: "Scan for New Documents" })}>
              <span>
                <IconButton size="small" color="secondary" onClick={onScanDocuments} disabled={isLoading}>
                  <SearchIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* Documents Table */}
      {selectedKbId && !isLoading && !isLoadingStructure && (
        documents.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
            <FolderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage 
                id="kbExplorer.noFiles" 
                defaultMessage="No files found in this knowledge base. Upload some documents to get started!" 
              />
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ flexGrow: 1, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 40, padding: '8px' }}></TableCell>
                  <TableCell>
                    <FormattedMessage id="kbExplorer.table.filename" defaultMessage="File Name" />
                  </TableCell>
                  <TableCell>
                    <FormattedMessage id="kbExplorer.table.path" defaultMessage="Path" />
                  </TableCell>
                  <TableCell>
                    <FormattedMessage id="kbExplorer.table.type" defaultMessage="Type" />
                  </TableCell>
                  <TableCell>
                    <FormattedMessage id="kbExplorer.table.size" defaultMessage="Size" />
                  </TableCell>
                  <TableCell>
                    <FormattedMessage id="kbExplorer.table.status" defaultMessage="Status" />
                  </TableCell>
                  <TableCell sx={{ width: 60 }}>
                    <FormattedMessage id="kbExplorer.table.actions" defaultMessage="Actions" />
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.map((doc: any) => {
                  const fileName = getFileName(doc.filePath);
                  const directoryPath = getDirectoryPath(doc.filePath);
                  const extension = getFileExtension(doc.filePath);
                  
                  return (
                    <TableRow 
                      key={doc.id}
                      hover
                      sx={{ 
                        '&:hover': { 
                          backgroundColor: 'action.hover' 
                        }
                      }}
                    >
                      <TableCell sx={{ padding: '8px' }}>
                        {getFileIcon(doc.filePath)}
                      </TableCell>
                      
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {fileName}
                          </Typography>
                          {doc.contentSummary && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {doc.contentSummary.substring(0, 100)}...
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {directoryPath ? formatFilePath(directoryPath) : '/'}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        {extension && (
                          <Chip 
                            label={extension.toUpperCase()} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 20 }}
                          />
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {formatFileSize(doc.contentLength || 0)}
                        </Typography>
                      </TableCell>
                      
                      <TableCell>
                        <Chip 
                          label={doc.status} 
                          size="small" 
                          color={doc.status === 'processed' ? 'success' : 'default'}
                          sx={{ fontSize: '0.6rem', height: 20 }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Tooltip title={intl.formatMessage({ 
                          id: "kbExplorer.openOriginal", 
                          defaultMessage: "View file details" 
                        })}>
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              // Handle viewing file details
                              console.log('File details:', doc);
                            }}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )
      )}
    </Box>
  );
};

export default KBExplorer;

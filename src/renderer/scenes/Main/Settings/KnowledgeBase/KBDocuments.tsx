import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  Paper,
  Grid
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Sync as ProcessingIcon
} from '@mui/icons-material';
import { FormattedMessage, useIntl } from 'react-intl';
import { toast } from '@/utils/toast';
import { getUserTokenFromStore } from '@/utils/user';

// Types for document status and file information
interface DocumentStatus {
  file_path: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  total_chunks?: number;
  processed_chunks?: number;
  failed_chunks?: number;
  last_modified?: string;
  file_size?: number;
}

interface DocumentsResponse {
  documents: {
    [status: string]: DocumentStatus[];
  };
}

interface KBDocumentsProps {
  knowledgeBaseId: string;
  workspaceId: string;
  kbStatus: any;
  isLoading: boolean;
  onScanDocuments: () => void;
  onRefreshStructure: () => void;
}

export default function KBDocuments({
  knowledgeBaseId,
  workspaceId,
  kbStatus,
  isLoading,
  onScanDocuments,
  onRefreshStructure
}: KBDocumentsProps) {
  const intl = useIntl();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [documents, setDocuments] = useState<DocumentStatus[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentStatus | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch documents from LightRAG server
  const fetchDocuments = useCallback(async () => {
    if (!workspaceId || !knowledgeBaseId) return;
    
    setLoadingDocuments(true);
    try {
      const token = getUserTokenFromStore();
      if (!token) {
        throw new Error('Authentication token not found');
      }

             // Call the LightRAG server directly through electron IPC
       const response = await window.electron.knowledgeBase.getDocuments({
         workspaceId,
         kbId: knowledgeBaseId,
         token
       });

       // Flatten all documents from different statuses
       const allDocs: DocumentStatus[] = [];
       if (response && response.documents) {
         Object.values(response.documents).forEach((docArray: unknown) => {
           if (Array.isArray(docArray)) {
             allDocs.push(...(docArray as DocumentStatus[]));
           }
         });
       }
      
      setDocuments(allDocs);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error(`Failed to fetch documents: ${error.message}`);
    } finally {
      setLoadingDocuments(false);
    }
  }, [workspaceId, knowledgeBaseId]);

  // Load documents on component mount and when KB changes
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    if (files.length > 0) {
      setUploadDialog(true);
    }
  };

  // Handle file upload
  const handleUpload = async (): Promise<void> => {
    if (selectedFiles.length === 0 || !workspaceId || !knowledgeBaseId) return;

    setUploading(true);
    const newProgress: { [key: string]: number } = {};
    
    try {
      const token = getUserTokenFromStore();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      for (const file of selectedFiles) {
        const fileKey = `${file.name}-${file.size}`;
        newProgress[fileKey] = 0;
        setUploadProgress({ ...newProgress });

        try {
          // Upload file through electron IPC
          await window.electron.knowledgeBase.uploadDocument({
            workspaceId,
            kbId: knowledgeBaseId,
            token,
            file: file,
            onProgress: (progress: number) => {
              newProgress[fileKey] = progress;
              setUploadProgress({ ...newProgress });
            }
          });

          newProgress[fileKey] = 100;
          setUploadProgress({ ...newProgress });
          toast.success(`${file.name} uploaded successfully`);
        } catch (error: any) {
          console.error(`Error uploading ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
        }
      }

      // Refresh documents list after upload
      setTimeout(() => {
        fetchDocuments();
        setUploadDialog(false);
        setSelectedFiles([]);
        setUploadProgress({});
      }, 1000);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return { icon: <CheckIcon color="success" />, color: 'success' as const, label: 'Processed' };
      case 'PROCESSING':
        return { icon: <ProcessingIcon color="primary" />, color: 'primary' as const, label: 'Processing' };
      case 'PENDING':
        return { icon: <PendingIcon color="warning" />, color: 'warning' as const, label: 'Pending' };
      case 'FAILED':
        return { icon: <ErrorIcon color="error" />, color: 'error' as const, label: 'Failed' };
      default:
        return { icon: <PendingIcon />, color: 'default' as const, label: 'Unknown' };
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Extract filename from path
  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || filePath;
  };

  // Handle delete document
  const handleDeleteDocument = (document: DocumentStatus) => {
    setDocumentToDelete(document);
    setDeleteDialog(true);
  };

  // Confirm delete document
  const confirmDeleteDocument = async (): Promise<void> => {
    if (!documentToDelete || !workspaceId || !knowledgeBaseId) return;

    setDeleting(true);
    try {
      const token = getUserTokenFromStore();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      await window.electron.knowledgeBase.deleteDocument({
        workspaceId,
        kbId: knowledgeBaseId,
        token,
        filePath: documentToDelete.file_path
      });

      toast.success(`${getFileName(documentToDelete.file_path)} deleted successfully`);
      
      // Refresh the documents list
      await fetchDocuments();
      
      // Close dialog and reset state
      setDeleteDialog(false);
      setDocumentToDelete(null);
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error(`Failed to delete document: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteDialog(false);
    setDocumentToDelete(null);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Section Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <FormattedMessage id="kb.documents.title" defaultMessage="Documents" />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage 
            id="kb.documents.description" 
            defaultMessage="Upload and manage documents in your knowledge base. Files are automatically processed and indexed for search."
          />
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

             {/* Action Bar */}
       <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
         <input
           type="file"
           ref={fileInputRef}
           style={{ display: 'none' }}
           multiple
           accept=".txt,.md,.pdf,.docx,.pptx,.xlsx,.rtf,.odt,.tex,.epub,.html,.htm,.csv,.json,.xml,.yaml,.yml"
           onChange={handleFileSelect}
         />
         <Button
           variant="contained"
           startIcon={<UploadIcon />}
           onClick={() => fileInputRef.current?.click()}
           disabled={isLoading || loadingDocuments}
         >
           <FormattedMessage id="kb.documents.upload" defaultMessage="Upload Files" />
         </Button>
         <Button
           variant="outlined"
           startIcon={<RefreshIcon />}
           onClick={fetchDocuments}
           disabled={loadingDocuments}
         >
           <FormattedMessage id="kb.documents.refresh" defaultMessage="Refresh" />
         </Button>
         <Button
           variant="outlined"
           onClick={onScanDocuments}
           disabled={isLoading}
         >
           <FormattedMessage id="kb.documents.scan" defaultMessage="Scan New Files" />
         </Button>
       </Box>

      {/* Documents List */}
      <Paper sx={{ flexGrow: 1, overflow: 'auto' }}>
        {loadingDocuments ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>
              <FormattedMessage id="kb.documents.loading" defaultMessage="Loading documents..." />
            </Typography>
          </Box>
        ) : documents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <FileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              <FormattedMessage id="kb.documents.empty" defaultMessage="No documents found" />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage 
                id="kb.documents.empty.description" 
                defaultMessage="Upload files to get started with your knowledge base."
              />
            </Typography>
          </Box>
        ) : (
          <List>
            {documents.map((doc, index) => {
              const statusDisplay = getStatusDisplay(doc.status);
              const fileName = getFileName(doc.file_path);
              
              return (
                <ListItem key={`${doc.file_path}-${index}`} divider>
                  <ListItemIcon>
                    <FileIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={fileName}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" component="span">
                          {doc.file_path}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                          <Chip
                            icon={statusDisplay.icon}
                            label={statusDisplay.label}
                            size="small"
                            color={statusDisplay.color}
                          />
                          {doc.file_size && (
                            <Typography variant="caption" color="text.secondary" component="span">
                              {formatFileSize(doc.file_size)}
                            </Typography>
                          )}
                          {doc.total_chunks && (
                            <Typography variant="caption" color="text.secondary" component="span">
                              {doc.processed_chunks || 0}/{doc.total_chunks} chunks
                            </Typography>
                          )}
                          {doc.last_modified && (
                            <Typography variant="caption" color="text.secondary" component="span">
                              Modified: {new Date(doc.last_modified).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View details">
                        <IconButton aria-label="view">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete document">
                        <IconButton 
                          aria-label="delete" 
                          onClick={() => handleDeleteDocument(doc)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <FormattedMessage id="kb.documents.upload.dialog.title" defaultMessage="Upload Files" />
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <FormattedMessage 
                id="kb.documents.upload.dialog.description" 
                defaultMessage="The following files will be uploaded and processed:"
              />
            </Typography>
            <List dense>
              {selectedFiles.map((file, index) => {
                const fileKey = `${file.name}-${file.size}`;
                const progress = uploadProgress[fileKey] || 0;
                
                return (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <FileIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary" component="span">
                            {formatFileSize(file.size)}
                          </Typography>
                          {uploading && (
                            <LinearProgress 
                              variant="determinate" 
                              value={progress} 
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Box>
          
          {uploading && (
            <Alert severity="info">
              <FormattedMessage 
                id="kb.documents.upload.progress" 
                defaultMessage="Uploading files... Please wait."
              />
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)} disabled={uploading}>
            <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
          </Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={uploading || selectedFiles.length === 0}
            startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
          >
            {uploading ? (
              <FormattedMessage id="kb.documents.uploading" defaultMessage="Uploading..." />
            ) : (
              <FormattedMessage id="kb.documents.upload.confirm" defaultMessage="Upload" />
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={cancelDelete} maxWidth="sm" fullWidth>
        <DialogTitle>
          <FormattedMessage id="kb.documents.delete.dialog.title" defaultMessage="Delete Document" />
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <FormattedMessage 
              id="kb.documents.delete.dialog.warning" 
              defaultMessage="This action cannot be undone. The document will be permanently removed from the knowledge base."
            />
          </Alert>
          {documentToDelete && (
            <Box>
              <Typography variant="body1" gutterBottom>
                <FormattedMessage 
                  id="kb.documents.delete.dialog.description" 
                  defaultMessage="Are you sure you want to delete the following document?"
                />
              </Typography>
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FileIcon color="action" />
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {getFileName(documentToDelete.file_path)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {documentToDelete.file_path}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={deleting}>
            <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
          </Button>
          <Button 
            onClick={confirmDeleteDocument} 
            variant="contained" 
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleting ? (
              <FormattedMessage id="kb.documents.deleting" defaultMessage="Deleting..." />
            ) : (
              <FormattedMessage id="kb.documents.delete.confirm" defaultMessage="Delete" />
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 
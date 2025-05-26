import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogContent,
  CircularProgress,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  PictureAsPdf as PdfIcon,
  Description as DocumentIcon,
  Archive as ArchiveIcon,
  Code as CodeIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';
import { IFile } from '@/../../types/File/File';
import { IChatMessage } from '@/../../types/Chat/Message';
import { getUserTokenFromStore, getCurrentWorkspace } from '@/utils/user';
import { toast } from '@/utils/toast';
import { useSocketStore } from '@/stores/Socket/SocketStore';

interface FileDisplayProps {
  message: IChatMessage;
}

const FileDisplay: React.FC<FileDisplayProps> = ({ message }) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<IFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadOperationIds, setDownloadOperationIds] = useState<Record<string, string>>({});

  // ✅ Use SocketStore and add logging
  const { fileProgress } = useSocketStore();

  // Don't render if no files
  if (!message.files || message.files.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    const iconProps = { fontSize: 'small' as const };

    if (mimeType.startsWith('image/')) {
      return <ImageIcon color="primary" {...iconProps} />;
    } else if (mimeType.startsWith('video/')) {
      return <VideoIcon color="secondary" {...iconProps} />;
    } else if (mimeType.startsWith('audio/')) {
      return <AudioIcon color="info" {...iconProps} />;
    } else if (mimeType === 'application/pdf') {
      return <PdfIcon color="error" {...iconProps} />;
    } else if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) {
      return <DocumentIcon color="primary" {...iconProps} />;
    } else if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) {
      return <ArchiveIcon color="warning" {...iconProps} />;
    } else if (mimeType.includes('code') || fileName.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|html|css|json|xml)$/i)) {
      return <CodeIcon color="success" {...iconProps} />;
    } else {
      return <FileIcon {...iconProps} />;
    }
  };

  const handleDownload = useCallback(async (file: IFile) => {
    try {
      const token = getUserTokenFromStore();
      const workspace = getCurrentWorkspace();

      if (!token || !workspace?.id) {
        toast.error('Authentication or workspace not found');
        return;
      }

      // Mark file as downloading
      setDownloading(prev => ({ ...prev, [file.id]: true }));

      // Try to open folder dialog first
      let selectedFolder: string | null = null;

      try {
        const folderResult = await window.electron.fileSystem.openFolderDialog();
        console.log('Folder dialog result:', folderResult);

        if (Array.isArray(folderResult) && folderResult.length > 0) {
          selectedFolder = folderResult[0];
        } else if (typeof folderResult === 'string' && folderResult.trim()) {
          selectedFolder = folderResult;
        } else if (folderResult && typeof folderResult === 'object' && 'filePaths' in folderResult) {
          selectedFolder = folderResult.filePaths?.[0];
        }
      } catch (dialogError) {
        console.warn('Folder dialog failed:', dialogError);
      }

      // Fallback to Downloads folder or home directory
      if (!selectedFolder) {
        try {
          const homeDir = await window.electron.homedir();
          selectedFolder = `${homeDir}/Downloads`;
          toast.info(`Downloading to Downloads folder: ${file.name}`);
        } catch (homeDirError) {
          toast.error('Could not determine download location');
          setDownloading(prev => ({ ...prev, [file.id]: false }));
          return;
        }
      } else {
        toast.info(`Downloading: ${file.name}`);
      }

      const destinationPath = `${selectedFolder}/${file.name}`;
      console.log('Final download path:', destinationPath);

      const result = await window.electron.fileSystem.download(
        workspace.id,
        file.id,
        destinationPath,
        token
      );

      if (result.error) {
        toast.error(`Download failed: ${result.error}`);
        setDownloading(prev => ({ ...prev, [file.id]: false }));
        return;
      }

      if (result.operationId) {
        setDownloadOperationIds(prev => ({
          ...prev,
          [file.id]: result.operationId
        }));

        console.log('🔄 Starting download with operationId:', result.operationId);

        // Monitor download completion
        const checkStatus = async () => {
          try {
            const status = await window.electron.fileSystem.getStatus(result.operationId);
            console.log('📁 Download status:', status);

            if (status?.status === 'completed') {
              // Clean up progress and downloading state
              setDownloading(prev => ({ ...prev, [file.id]: false }));

              toast.success(`Downloaded to: ${destinationPath}`);
              return; // Stop the loop
            } else if (status?.status === 'failed') {
              const errorMsg = status.error || 'Unknown error';

              // Clean up progress and downloading state
              setDownloading(prev => ({ ...prev, [file.id]: false }));

              toast.error(`Download failed: ${errorMsg}`);
              return; // Stop the loop
            } else if (status?.status === 'processing' || status?.status === 'pending') {
              // Continue checking for these statuses
              setTimeout(checkStatus, 1000);
            } else {
              // For any other status, stop polling
              console.warn('Stopping polling for unknown status:', status);
              setDownloading(prev => ({ ...prev, [file.id]: false }));
              return;
            }
          } catch (error) {
            console.error('Error checking download status:', error);

            // Clean up on error
            setDownloading(prev => ({ ...prev, [file.id]: false }));

            toast.error(`Download monitoring failed: ${error}`);
          }
        };

        // Start checking after a short delay
        setTimeout(checkStatus, 500);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Download failed: ${error}`);
      setDownloading(prev => ({ ...prev, [file.id]: false }));
    }
  }, []);

  const handlePreview = useCallback(async (file: IFile) => {
    // Only preview certain file types
    const previewableMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'text/plain', 'text/markdown', 'application/json',
      'text/html', 'text/css', 'text/javascript'
    ];

    if (!previewableMimeTypes.some(type => file.mime_type.includes(type.split('/')[0]))) {
      toast.info('Preview not available for this file type');
      return;
    }

    setPreviewFile(file);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewContent(null);

    try {
      const token = getUserTokenFromStore();
      const workspace = getCurrentWorkspace();

      if (!token || !workspace?.id) {
        toast.error('Authentication or workspace not found');
        return;
      }

      // Get file metadata which might include preview URL or content
      const metadataResponse = await window.electron.fileSystem.getFileMetadata({
        workspaceId: workspace.id,
        fileId: file.id,
        token
      });

      if (metadataResponse?.data) {
        // For text files, we might get content directly
        if (file.mime_type.startsWith('text/') || file.mime_type.includes('json')) {
          setPreviewContent(`File: ${file.name}\nSize: ${formatFileSize(file.size)}\nType: ${file.mime_type}`);
        } else if (file.mime_type.startsWith('image/')) {
          setPreviewContent('Image preview would be shown here');
        }
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewFile(null);
    setPreviewContent(null);
  }, []);

  const isPreviewable = (mimeType: string) => {
    return mimeType.startsWith('image/') ||
      mimeType.startsWith('text/') ||
      mimeType.includes('json') ||
      mimeType.includes('markdown');
  };

  const getFileTypeLabel = (mimeType: string) => {
    const type = mimeType.split('/')[1];
    if (!type) return 'FILE';
    return type.toUpperCase().substring(0, 4);
  };

  // Get progress from SocketStore with logging
  const getFileProgress = (file: IFile) => {
    const operationId = downloadOperationIds[file.id];
    if (operationId && fileProgress[operationId]) {
      return fileProgress[operationId].progress;
    }
    return null;
  };

  return (
    <>
      <Box sx={{ mt: 1, mb: 0.5 }}>
        {/* Files Section Header */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
          py: 0.5,
          px: 1,
          bgcolor: 'action.hover',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <AttachFileIcon
            fontSize="small"
            sx={{ color: 'text.secondary' }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}
          >
            {message.files.length === 1 ? '1 File' : `${message.files.length} Files`}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              fontSize: '0.7rem'
            }}
          >
            Attachments
          </Typography>
        </Box>

        {/* Files List */}
        {message.files.map((file, index) => {
          const fileProgress = getFileProgress(file);
          const isDownloading = downloading[file.id];

          return (
            <Paper
              key={file.id || index}
              variant="outlined"
              sx={{
                mb: index < message.files!.length - 1 ? 0.5 : 0,
                maxWidth: 400,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                position: 'relative'
              }}
            >
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                minHeight: 0
              }}>
                {/* File Icon */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 24
                }}>
                  {getFileIcon(file.mime_type, file.name)}
                </Box>

                {/* File Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      wordBreak: 'break-word',
                      mb: 0.3,
                      lineHeight: 1.2,
                      fontSize: '0.875rem'
                    }}
                  >
                    {file.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <Chip
                      label={formatFileSize(file.size)}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        '& .MuiChip-label': { px: 0.5 }
                      }}
                    />
                    <Chip
                      label={getFileTypeLabel(file.mime_type)}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{
                        height: 18,
                        fontSize: '0.65rem',
                        '& .MuiChip-label': { px: 0.5 }
                      }}
                    />
                    {isDownloading && fileProgress !== null && (
                      <Chip
                        label={`${fileProgress}%`}
                        size="small"
                        color="info"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          '& .MuiChip-label': { px: 0.5 }
                        }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{
                  display: 'flex',
                  gap: 0.5,
                  alignItems: 'center'
                }}>
                  {isPreviewable(file.mime_type) && (
                    <Tooltip title="Preview">
                      <IconButton
                        size="small"
                        onClick={() => handlePreview(file)}
                        sx={{ p: 0.5 }}
                        disabled={isDownloading}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={isDownloading ? "Downloading..." : "Download"}>
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(file)}
                      sx={{ p: 0.5 }}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <CircularProgress size={16} />
                      ) : (
                        <DownloadIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Progress Bar */}
              {isDownloading && fileProgress !== null && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={fileProgress}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 2
                      }
                    }}
                  />
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '80vh',
            bgcolor: 'background.paper'
          }
        }}
      >
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography variant="h6" noWrap sx={{ fontSize: '1.1rem' }}>
            {previewFile?.name}
          </Typography>
          <IconButton onClick={handleClosePreview} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ p: 2 }}>
          {previewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : previewFile && previewFile.mime_type.startsWith('image/') ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Image preview would be displayed here
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Size: {formatFileSize(previewFile.size)} • Type: {previewFile.mime_type}
              </Typography>
            </Box>
          ) : previewContent ? (
            <Box>
              <Typography
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  bgcolor: 'grey.50',
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  maxHeight: 400,
                  overflow: 'auto'
                }}
              >
                {previewContent}
              </Typography>
            </Box>
          ) : (
            <Typography color="text.secondary">
              Preview not available for this file type
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileDisplay;

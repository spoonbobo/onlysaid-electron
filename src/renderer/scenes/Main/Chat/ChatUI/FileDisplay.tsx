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
import { getUserTokenFromStore } from '@/utils/user';
import { getCurrentWorkspace } from '@/utils/workspace';
import { toast } from '@/utils/toast';
import { useSocketStore } from '@/renderer/stores/Socket/SocketStore';

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
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [resolvedFiles, setResolvedFiles] = useState<IFile[]>([]);
  const [tooltipKeys, setTooltipKeys] = useState<Record<string, number>>({});

  const { fileProgress } = useSocketStore();

  const handleDownload = useCallback(async (file: IFile) => {
    try {
      const token = getUserTokenFromStore();
      const workspace = getCurrentWorkspace();

      if (!token || !workspace?.id) {
        toast.error('Authentication or workspace not found');
        return;
      }

      setDownloading(prev => ({ ...prev, [file.id]: true }));

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
        toast.error('Failed to open folder selection dialog');
        setDownloading(prev => ({ ...prev, [file.id]: false }));
        setTooltipKeys(prev => ({ ...prev, [file.id]: (prev[file.id] || 0) + 1 }));
        return;
      }

      if (!selectedFolder) {
        toast.info('Download cancelled - no location selected');
        setDownloading(prev => ({ ...prev, [file.id]: false }));
        setTooltipKeys(prev => ({ ...prev, [file.id]: (prev[file.id] || 0) + 1 }));
        return;
      }

      toast.info(`Downloading: ${file.name}`);
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
        setTooltipKeys(prev => ({ ...prev, [file.id]: (prev[file.id] || 0) + 1 }));
        return;
      }

      if (result.operationId) {
        setDownloadOperationIds(prev => ({
          ...prev,
          [file.id]: result.operationId
        }));

        console.log('🔄 Starting download with operationId:', result.operationId);

        const checkStatus = async () => {
          try {
            const status = await window.electron.fileSystem.getStatus(result.operationId);
            console.log('📁 Download status:', status);

            if (status?.status === 'completed') {
              setDownloading(prev => ({ ...prev, [file.id]: false }));
              toast.success(`Downloaded to: ${destinationPath}`);
              return;
            } else if (status?.status === 'failed') {
              const errorMsg = status.error || 'Unknown error';
              setDownloading(prev => ({ ...prev, [file.id]: false }));
              toast.error(`Download failed: ${errorMsg}`);
              return;
            } else if (status?.status === 'processing' || status?.status === 'pending') {
              setTimeout(checkStatus, 1000);
            } else {
              console.warn('Stopping polling for unknown status:', status);
              setDownloading(prev => ({ ...prev, [file.id]: false }));
              return;
            }
          } catch (error) {
            console.error('Error checking download status:', error);
            setDownloading(prev => ({ ...prev, [file.id]: false }));
            toast.error(`Download monitoring failed: ${error}`);
          }
        };

        setTimeout(checkStatus, 500);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Download failed: ${error}`);
      setDownloading(prev => ({ ...prev, [file.id]: false }));
      setTooltipKeys(prev => ({ ...prev, [file.id]: (prev[file.id] || 0) + 1 }));
    }
  }, []);

  const handlePreview = useCallback(async (file: IFile) => {
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

      const metadataResponse = await window.electron.fileSystem.getFileMetadata({
        workspaceId: workspace.id,
        fileId: file.id,
        token
      });

      if (metadataResponse?.data) {
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

  useEffect(() => {
    const resolveFiles = async () => {
      if (message.files && message.files.length > 0) {
        setResolvedFiles(message.files);
        setLoadingFiles(false);
        return;
      }

      if (message.file_ids) {
        try {
          setLoadingFiles(true);
          const fileIds = JSON.parse(message.file_ids);
          if (Array.isArray(fileIds) && fileIds.length > 0) {
            const token = getUserTokenFromStore();
            const workspace = getCurrentWorkspace();

            if (token && workspace?.id) {
              const filesResponse = await window.electron.fileSystem.getFilesMetadata({
                workspaceId: workspace.id,
                fileIds: fileIds,
                token
              });

              if (filesResponse?.data) {
                setResolvedFiles(filesResponse.data);
              }
            }
          }
        } catch (error) {
          console.error('Error resolving files in FileDisplay:', error);
        } finally {
          setLoadingFiles(false);
        }
      } else {
        setLoadingFiles(false);
      }
    };

    resolveFiles();
  }, [message.files, message.file_ids]);

  if ((!message.files || message.files.length === 0) && !message.file_ids) {
    return null;
  }

  if (loadingFiles) {
    return (
      <Box sx={{ mt: 1, mb: 0.5 }}>
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
          <CircularProgress size={16} />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Loading files...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (resolvedFiles.length === 0) {
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
            {resolvedFiles.length === 1 ? '1 File' : `${resolvedFiles.length} Files`}
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

        {resolvedFiles.map((file, index) => {
          const fileProgress = getFileProgress(file);
          const isDownloading = downloading[file.id];

          return (
            <Paper
              key={file.id || index}
              variant="outlined"
              sx={{
                mb: index < resolvedFiles!.length - 1 ? 0.5 : 0,
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
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 24
                }}>
                  {getFileIcon(file.mime_type, file.name)}
                </Box>

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
                  <Tooltip
                    key={tooltipKeys[file.id] || 0}
                    title={isDownloading ? "Downloading..." : "Download"}
                  >
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

      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              maxHeight: '80vh',
              bgcolor: 'background.paper'
            }
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
import React from "react";
import { Box, Typography, IconButton, LinearProgress, Chip } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { alpha } from '@mui/material/styles';

interface ProgressData {
  progress: number;
  stage?: 'network' | 'server' | 'complete';
  details?: any;
  timestamp?: number;
}

interface AttachmentPreviewProps {
  attachments: Record<string, any>;
  uploadProgress?: Record<string, ProgressData>;
  onRemove: (type: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getStageLabel = (stage?: string): string => {
  const stageLabels = {
    'network': 'Uploading...',
    'server': 'Processing...',
    'parsing': 'Parsing file...',
    'validating': 'Validating...',
    'writing': 'Saving...',
    'database': 'Finalizing...',
    'complete': 'Complete'
  };
  return stageLabels[stage as keyof typeof stageLabels] || 'Processing...';
};

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  uploadProgress = {},
  onRemove
}) => {
  if (Object.keys(attachments).length === 0) return null;

  return (
    <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Object.entries(attachments).map(([type, attachment]) => {
        const file = attachment.file || attachment;
        const fileName = file?.name || attachment?.name || 'Unknown file';
        const fileSize = file?.size || attachment?.size || 0;
        const operationId = attachment?.operationId;
        const isUploaded = !!attachment?.uploadedFile;
        const progressData = operationId ? uploadProgress[operationId] : undefined;
        const progress = progressData?.progress || 0;
        const stage = progressData?.stage;
        const isUploading = operationId && !isUploaded && progress !== undefined && progress < 100;
        const isCompleted = isUploaded || progress >= 100;

        return (
          <Box
            key={type}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1,
              bgcolor: attachment.isFailed
                ? theme => alpha(theme.palette.error.main, 0.1)
                : isCompleted
                  ? theme => alpha(theme.palette.success.main, 0.1)
                  : theme => alpha(theme.palette.background.paper, 0.8),
              borderRadius: 1,
              border: attachment.isFailed
                ? theme => `1px solid ${theme.palette.error.main}`
                : isCompleted
                  ? theme => `1px solid ${theme.palette.success.main}`
                  : theme => `1px solid ${theme.palette.divider}`,
              position: 'relative'
            }}
          >
            {/* File icon with status indicator */}
            <Box sx={{ position: 'relative' }}>
              {isUploading ? (
                <CloudUploadIcon
                  sx={{
                    color: 'primary.main',
                    fontSize: '1.2rem'
                  }}
                />
              ) : isCompleted ? (
                <CheckCircleIcon
                  sx={{
                    color: 'success.main',
                    fontSize: '1.2rem'
                  }}
                />
              ) : (
                <InsertDriveFileIcon
                  sx={{
                    color: attachment.isFailed ? 'error.main' : 'text.secondary',
                    fontSize: '1.2rem'
                  }}
                />
              )}
              {attachment.isFailed && (
                <ErrorIcon
                  sx={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    fontSize: '0.8rem',
                    color: 'error.main',
                    bgcolor: 'background.paper',
                    borderRadius: '50%'
                  }}
                />
              )}
            </Box>

            {/* File info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: attachment.isFailed ? 'error.main' : 'text.primary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}
                >
                  {fileName}
                </Typography>
                {/* Stage indicator chip */}
                {isUploading && stage && (
                  <Chip
                    label={getStageLabel(stage)}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      color: 'primary.main',
                      borderColor: 'primary.main'
                    }}
                  />
                )}
              </Box>

              <Typography variant="caption" color="text.secondary">
                ({formatFileSize(fileSize)})
                {attachment.isFailed && (
                  <Box component="span" sx={{ color: 'error.main', ml: 1 }}>
                    • Upload failed
                  </Box>
                )}
                {isUploading && (
                  <Box component="span" sx={{ color: 'primary.main', ml: 1 }}>
                    • {progress}%
                  </Box>
                )}
                {isCompleted && !attachment.isFailed && (
                  <Box component="span" sx={{ color: 'success.main', ml: 1 }}>
                    • Complete
                  </Box>
                )}
              </Typography>

              {/* Enhanced progress bar for uploading */}
              {isUploading && !attachment.isFailed && (
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    mt: 0.5,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      background: stage === 'network'
                        ? 'linear-gradient(90deg, #2196f3 0%, #21cbf3 100%)'
                        : 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)'
                    }
                  }}
                />
              )}
            </Box>

            {/* Delete button */}
            <IconButton
              size="small"
              onClick={() => onRemove(type)}
              disabled={isUploading}
              sx={{
                color: attachment.isFailed ? 'error.main' : 'text.secondary',
                opacity: isUploading ? 0.5 : 1,
                '&:hover': {
                  bgcolor: attachment.isFailed
                    ? theme => alpha(theme.palette.error.main, 0.1)
                    : theme => alpha(theme.palette.action.hover, 0.8)
                }
              }}
            >
              <CloseIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Box>
        );
      })}
    </Box>
  );
};

export default AttachmentPreview;

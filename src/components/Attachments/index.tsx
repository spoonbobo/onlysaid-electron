import React from "react";
import { Box, Typography, IconButton, LinearProgress } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { alpha } from '@mui/material/styles';

interface AttachmentPreviewProps {
  attachments: Record<string, any>;
  uploadProgress?: Record<string, number>;
  onRemove: (type: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        const progress = operationId ? uploadProgress[operationId] : undefined;
        const isUploading = operationId && !isUploaded && progress !== undefined;

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
                : theme => alpha(theme.palette.background.paper, 0.8),
              borderRadius: 1,
              border: attachment.isFailed
                ? theme => `1px solid ${theme.palette.error.main}`
                : theme => `1px solid ${theme.palette.divider}`,
              position: 'relative'
            }}
          >
            {/* File icon with error indicator */}
            <Box sx={{ position: 'relative' }}>
              <InsertDriveFileIcon
                sx={{
                  color: attachment.isFailed ? 'error.main' : 'text.secondary',
                  fontSize: '1.2rem'
                }}
              />
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
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: attachment.isFailed ? 'error.main' : 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {fileName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({formatFileSize(fileSize)})
                {attachment.isFailed && (
                  <Box component="span" sx={{ color: 'error.main', ml: 1 }}>
                    • Upload failed
                  </Box>
                )}
              </Typography>

              {/* Progress bar for uploading */}
              {attachment.showProgress && !attachment.isFailed && (
                <LinearProgress
                  variant="determinate"
                  value={progress || 0}
                  sx={{
                    mt: 0.5,
                    height: 4,
                    borderRadius: 2,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 2
                    }
                  }}
                />
              )}
            </Box>

            {/* Delete button */}
            <IconButton
              size="small"
              onClick={() => onRemove(type)}
              sx={{
                color: attachment.isFailed ? 'error.main' : 'text.secondary',
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

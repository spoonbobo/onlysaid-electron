import React from "react";
import { Box, Typography, IconButton, LinearProgress } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface ProgressData {
  progress: number;
  stage?: string;
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

interface AttachmentItemProps {
  type: string;
  attachment: any;
  uploadProgress?: Record<string, ProgressData>;
  onRemove: (type: string) => void;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({
  type,
  attachment,
  uploadProgress = {},
  onRemove
}) => {
  const file = attachment.file || attachment;
  const fileName = file?.name || attachment?.name || 'Unknown file';
  const fileSize = file?.size || attachment?.size || 0;
  const operationId = attachment?.operationId;
  const isUploaded = !!attachment?.uploadedFile;
  const isFailed = !!attachment.isFailed;

  const currentProgress = operationId ? uploadProgress[operationId] : null;
  const progress = currentProgress?.progress || 0;
  const stage = currentProgress?.stage || '';

  const hasOperationId = !!operationId;
  const isProcessing = hasOperationId && !isUploaded && !isFailed;
  const showProgress = isProcessing;

  const getStageDisplay = () => {
    if (stage === 'network') return 'Uploading...';
    if (stage === 'parsing') return 'Processing...';
    if (stage === 'validating') return 'Validating...';
    if (stage === 'preparing') return 'Preparing...';
    if (stage === 'writing') return 'Saving...';
    if (stage === 'complete') return 'Complete';
    if (showProgress && !currentProgress) return 'Starting...';
    return 'Processing...';
  };

  const getStatus = () => {
    if (isFailed) return { icon: ErrorIcon, color: 'error.main' };
    if (isUploaded) return { icon: CheckCircleIcon, color: 'success.main' };
    if (isProcessing) return { icon: CloudUploadIcon, color: 'primary.main' };
    return { icon: InsertDriveFileIcon, color: 'text.secondary' };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: isFailed ? 'error.main' : 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Progress bar overlay */}
      {!isFailed && showProgress && (
        <LinearProgress
          variant={!currentProgress ? "indeterminate" : "determinate"}
          value={currentProgress ? progress : 0}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: '100%',
            borderRadius: 1,
            bgcolor: 'transparent',
            '& .MuiLinearProgress-bar': {
              borderRadius: 1,
              opacity: 0.08,
            },
            '& .MuiLinearProgress-bar1Indeterminate, & .MuiLinearProgress-bar2Indeterminate': {
              opacity: 0.08,
            },
            zIndex: 0,
          }}
        />
      )}

      {/* Content Layer */}
      <Box sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        width: '100%',
        zIndex: 1,
      }}>
        {/* Status Icon */}
        <StatusIcon
          sx={{
            color: status.color,
            fontSize: '1rem'
          }}
        />

        {/* File Name and Size */}
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            color: isFailed ? 'error.main' : 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0
          }}
        >
          {fileName} ({formatFileSize(fileSize)})
        </Typography>

        {/* ✅ Single line progress display */}
        {showProgress && (
          <Typography
            variant="caption"
            sx={{
              color: 'primary.main',
              fontSize: '0.75rem',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            {getStageDisplay()} {Math.round(progress)}%
          </Typography>
        )}

        {/* Remove Button */}
        <IconButton
          size="small"
          onClick={() => onRemove(type)}
          disabled={isProcessing}
          sx={{
            color: 'text.secondary',
            opacity: isProcessing ? 0.5 : 1,
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
        >
          <CloseIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Box>
    </Box>
  );
};

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  uploadProgress = {},
  onRemove
}) => {
  if (Object.keys(attachments).length === 0) return null;

  return (
    <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Object.entries(attachments).map(([type, attachment]) => (
        <AttachmentItem
          key={type}
          type={type}
          attachment={attachment}
          uploadProgress={uploadProgress}
          onRemove={onRemove}
        />
      ))}
    </Box>
  );
};

export default AttachmentPreview;

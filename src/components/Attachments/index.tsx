import React, { useRef } from "react";
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

// Separate component for each attachment item to properly use hooks
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

  // ✅ ONLY show processing operations (those with stages)
  const processingOperations = React.useMemo(() => {
    return Object.entries(uploadProgress).filter(([_, progress]) =>
      progress.stage && progress.stage !== 'network'
    );
  }, [uploadProgress]);

  // Find the most advanced processing operation
  const currentProcessing = React.useMemo(() => {
    if (processingOperations.length === 0) return null;
    return processingOperations.reduce((latest, [operationId, progress]) => {
      return progress.progress > latest.progress ? { operationId, ...progress } : latest;
    }, { operationId: processingOperations[0][0], ...processingOperations[0][1] });
  }, [processingOperations]);

  const displayStage = currentProcessing?.stage;

  // ✅ Determine states - never show upload progress
  const hasProcessingStarted = !!currentProcessing;
  const isProcessing = hasProcessingStarted && !isUploaded && currentProcessing.progress < 100;
  const isWaitingForProcessing = !hasProcessingStarted && !isUploaded && operationId;
  const isCompleted = isUploaded || (hasProcessingStarted && currentProcessing.progress >= 100);

  // ✅ Only return progress value when processing has actually started
  const processingProgress = hasProcessingStarted ? currentProcessing.progress : 0;

  return (
    <Box
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
        {isProcessing || isWaitingForProcessing ? (
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
          {(isProcessing || isWaitingForProcessing) && (
            <Chip
              label={displayStage ? getStageLabel(displayStage) : 'Preparing...'}
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
          {isWaitingForProcessing && (
            <Box component="span" sx={{ color: 'primary.main', ml: 1 }}>
              • Preparing...
            </Box>
          )}
          {isProcessing && (
            <Box component="span" sx={{ color: 'primary.main', ml: 1 }}>
              • {Math.round(processingProgress)}%
            </Box>
          )}
          {isCompleted && !attachment.isFailed && (
            <Box component="span" sx={{ color: 'success.main', ml: 1 }}>
              • Complete
            </Box>
          )}
        </Typography>

        {/* ✅ Progress bar logic - prevent 100% → 0% animation */}
        {!attachment.isFailed && (
          <>
            {/* Show indeterminate progress while waiting for processing */}
            {isWaitingForProcessing && (
              <LinearProgress
                variant="indeterminate"
                sx={{
                  mt: 0.5,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    background: 'linear-gradient(90deg, #2196f3 0%, #21cbf3 100%)'
                  }
                }}
              />
            )}

            {/* Show determinate progress only during processing */}
            {isProcessing && (
              <LinearProgress
                variant="determinate"
                value={processingProgress}
                sx={{
                  mt: 0.5,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
                  transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    background: 'linear-gradient(90deg, #ff9800 0%, #ffc107 100%)'
                  }
                }}
              />
            )}
          </>
        )}
      </Box>

      {/* Delete button */}
      <IconButton
        size="small"
        onClick={() => onRemove(type)}
        disabled={isProcessing || isWaitingForProcessing}
        sx={{
          color: attachment.isFailed ? 'error.main' : 'text.secondary',
          opacity: (isProcessing || isWaitingForProcessing) ? 0.5 : 1,
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

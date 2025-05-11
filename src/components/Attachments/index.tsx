import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';

interface AttachmentPreviewProps {
  attachments: Record<string, File>;
  onRemove: (type: string) => void;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  onRemove
}) => {
  if (Object.keys(attachments).length === 0) return null;

  return (
    <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {Object.entries(attachments).map(([type, file]) => (
        <Box
          key={type}
          sx={{
            position: 'relative',
            width: 80,
            height: 100,
            borderRadius: 1,
            bgcolor: '#f0f4fa',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* File icon */}
          <Box
            sx={{
              width: 50,
              height: 60,
              bgcolor: '#e2e7f2',
              borderRadius: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
              position: 'relative'
            }}
          >
            {/* PDF icon for example - you can adjust based on file type */}
            <Box sx={{
              width: 40,
              height: 50,
              bgcolor: '#dae1f0',
              borderRadius: '4px',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '10px',
                height: '10px',
                borderStyle: 'solid',
                borderWidth: '0 0 10px 10px',
                borderColor: 'transparent transparent #c3cde0 transparent',
              }
            }} />
          </Box>

          {/* Filename - truncated */}
          <Typography
            variant="caption"
            noWrap
            sx={{
              width: '100%',
              textAlign: 'center',
              px: 0.5,
              fontSize: '0.65rem'
            }}
          >
            {file.name.length > 20
              ? `${file.name.substring(0, 20)}...`
              : file.name}
          </Typography>

          {/* Close button positioned at top right */}
          <IconButton
            size="small"
            onClick={() => onRemove(type)}
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              p: 0.5,
              bgcolor: 'rgba(0,0,0,0.1)',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.2)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: '0.875rem' }} />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
};

export default AttachmentPreview;

import React from 'react';
import { Box, Typography, CircularProgress } from "@mui/material";
import { useThreeStore } from "@/renderer/stores/Avatar/ThreeStore";
import Avatar3D from '@/renderer/components/Avatar/Avatar3D';

interface Avatar3DRenderProps {
  width?: number;
  height?: number;
  showName?: boolean;
  showPreviewText?: boolean;
  enableControls?: boolean;
  autoRotate?: boolean;
}

function Avatar3DRender({ 
  width, 
  height, 
  showName = true, 
  showPreviewText = true,
  enableControls = true,
  autoRotate = false
}: Avatar3DRenderProps) {
  const { selectedModel, getModelById } = useThreeStore();
  const currentModel = getModelById(selectedModel || 'alice-3d');

  // If width/height are undefined, use full container
  const containerStyle = {
    width: width || '100%',
    height: height || '100%',
    borderRadius: 4,
    border: '1px solid',
    borderColor: 'grey.200',
    boxShadow: 2,
    overflow: 'hidden',
    position: 'relative' as const
  };

  return (
    <Box sx={containerStyle}>
      <React.Suspense 
        fallback={
          <Box sx={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2
          }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading 3D Avatar...
            </Typography>
          </Box>
        }
      >
        <Avatar3D 
          width={width} 
          height={height} 
          enableControls={enableControls}
          autoRotate={autoRotate}
        />
      </React.Suspense>
      
      {/* Overlay Info */}
      {(showName || showPreviewText) && (
        <Box sx={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          right: 8,
          textAlign: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          borderRadius: 1,
          p: 1
        }}>
          {showName && (
            <Typography variant="h6" sx={{ fontSize: '0.875rem' }}>
              {currentModel?.name || 'Avatar'}
            </Typography>
          )}
          {showPreviewText && (
            <Typography variant="body2" sx={{ fontSize: '0.75rem', opacity: 0.8 }}>
              Interactive 3D Model
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

export default Avatar3DRender;

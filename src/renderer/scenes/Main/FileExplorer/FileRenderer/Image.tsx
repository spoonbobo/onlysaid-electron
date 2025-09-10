import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardMedia,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateRight as RotateRightIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { getUserTokenFromStore } from '@/utils/user';

interface ImagePreviewProps {
  node: FileNode;
  maxHeight?: number;
}

interface ImageData {
  data: string; // base64 data URL
  mimeType: string;
  size: number;
  path: string;
}

export default function ImagePreview({ node, maxHeight = 400 }: ImagePreviewProps) {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const token = getUserTokenFromStore();

  // Check if file is an image
  const isImageFile = (fileName: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico'];
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  };

  // Get file size in human readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadImage = async () => {
    if (!node || !isImageFile(node.name)) {
      setError('Not a valid image file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (node.source === 'local') {
        // For local files, use the new handler to read image as base64
        const result = await (window.electron as any).fileSystem.readLocalImageFile(node.path);
        
        if (result.success) {
          setImageData({
            data: result.data,
            mimeType: result.mimeType,
            size: result.size,
            path: result.path
          });
        } else {
          setError(result.error || 'Failed to load local image');
        }
      } else if (node.source === 'remote' && node.workspaceId && node.fileDbId && token) {
        // For remote files, read the file content
        const response = await window.electron.fileSystem.readTextFile({
          workspaceId: node.workspaceId,
          fileId: node.fileDbId,
          token: token
        });

        if (response.success && response.content) {
          // If the content is already base64 encoded image data
          let imageDataUrl = response.content;
          
          // If it's not a data URL, assume it's base64 and add the proper prefix
          if (!imageDataUrl.startsWith('data:')) {
            const ext = node.name.toLowerCase().substring(node.name.lastIndexOf('.'));
            let mimeType = 'image/png'; // default
            
            switch (ext) {
              case '.jpg':
              case '.jpeg':
                mimeType = 'image/jpeg';
                break;
              case '.png':
                mimeType = 'image/png';
                break;
              case '.gif':
                mimeType = 'image/gif';
                break;
              case '.svg':
                mimeType = 'image/svg+xml';
                break;
              case '.webp':
                mimeType = 'image/webp';
                break;
              case '.bmp':
                mimeType = 'image/bmp';
                break;
              case '.ico':
                mimeType = 'image/x-icon';
                break;
            }
            
            imageDataUrl = `data:${mimeType};base64,${response.content}`;
          }

          setImageData({
            data: imageDataUrl,
            mimeType: response.mimeType || 'image/png',
            size: response.size || response.content.length,
            path: node.path
          });
        } else {
          setError(response.error || 'Failed to load image');
        }
      } else {
        setError('Invalid file source or missing required data');
      }
    } catch (err: any) {
      console.error('Error loading image:', err);
      setError(err.message || 'Failed to load image');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (node && isImageFile(node.name)) {
      loadImage();
    } else {
      setError('Not an image file');
    }
  }, [node, token]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handleDownload = async () => {
    if (imageData) {
      const link = document.createElement('a');
      link.href = imageData.data;
      link.download = node.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isImageFile(node.name)) {
    return (
      <Alert severity="info">
        <FormattedMessage 
          id="file.preview.notSupported" 
          defaultMessage="Preview not supported for this file type" 
        />
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 200,
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage id="file.preview.loading" defaultMessage="Loading preview..." />
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  if (!imageData) {
    return (
      <Alert severity="warning">
        <FormattedMessage id="file.preview.noData" defaultMessage="No preview data available" />
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Image info and controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={node.name.substring(node.name.lastIndexOf('.') + 1).toUpperCase()} 
            size="small" 
            color="primary"
          />
          <Chip 
            label={formatFileSize(imageData.size)} 
            size="small" 
            variant="outlined"
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 0.25}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '50px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 3}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Rotate">
            <IconButton size="small" onClick={handleRotate}>
              <RotateRightIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Download">
            <IconButton size="small" onClick={handleDownload}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Image preview */}
      <Card sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            maxHeight: maxHeight,
            overflow: 'auto',
            bgcolor: 'grey.50',
            p: 1
          }}
        >
          <CardMedia
            component="img"
            image={imageData.data}
            alt={node.name}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-in-out',
              cursor: zoom > 1 ? 'grab' : 'default',
              '&:active': {
                cursor: zoom > 1 ? 'grabbing' : 'default'
              }
            }}
            onError={() => setError('Failed to display image')}
          />
        </Box>
      </Card>
    </Box>
  );
}
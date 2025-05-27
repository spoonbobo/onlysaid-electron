import { useState, ReactNode, useRef } from "react";
import { Box, alpha, Typography } from "@mui/material";
import { toast } from "@/utils/toast";
import { IFile } from "@/../../types/File/File";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface FileDropProps {
  children: ReactNode;
  onDrop: (type: string, file: File, uploadedFile?: IFile) => void;
  sx?: any;
}

// Helper function to read file as Data URL
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

function FileDrop({ children, onDrop, sx = {} }: FileDropProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const getFileType = (file: File): string => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const filePath = e.dataTransfer.getData('text/plain');

    if (filePath) {
      try {
        const fileName = filePath.split('/').pop() || 'file';
        const fileType = fileName.includes('.') ?
          fileName.split('.').pop()?.toLowerCase() : 'unknown';

        let type = 'file';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType || '')) {
          type = 'image';
        } else if (['mp4', 'webm', 'avi', 'mov'].includes(fileType || '')) {
          type = 'video';
        } else if (['mp3', 'wav', 'ogg'].includes(fileType || '')) {
          type = 'audio';
        }

        const mockFile = new File([''], fileName, { type: `${type}/${fileType}` });
        onDrop(type, mockFile);
      } catch (error) {
        console.error('Failed to handle dragged file:', error);
      }
    } else if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const type = getFileType(file);

      console.log('📁 FileDrop - File dropped:', file.name, 'delegating to ChatInput for progress handling');
      onDrop(type, file, undefined);
    }
  };

  return (
    <Box
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      sx={{
        ...sx,
        position: 'relative',
        ...(isDragOver && {
          boxShadow: theme => `0 0 0 2px ${theme.palette.primary.main}`,
          bgcolor: theme => alpha(theme.palette.primary.light, 0.1)
        })
      }}
    >
      {children}
      {isDragOver && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
            borderRadius: 'inherit',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 2,
            }}
          >
            <CloudUploadIcon sx={{ fontSize: '2rem', color: 'primary.main', mb: 1 }} />
            <Typography variant="body2" color="primary">
              Drop file to upload
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default FileDrop;

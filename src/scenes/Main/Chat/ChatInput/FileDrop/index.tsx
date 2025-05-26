import { useState, ReactNode, useRef } from "react";
import { Box, alpha, Typography } from "@mui/material";
import { getUserTokenFromStore, getCurrentWorkspace } from "@/utils/user";
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

  const uploadFile = async (file: File, type: string): Promise<IFile | null> => {
    const token = getUserTokenFromStore();
    const workspace = getCurrentWorkspace();

    if (!token || !workspace) {
      toast.error("Authentication token or workspace not found. Cannot upload file.");
      return null;
    }

    try {
      const fileData = await readFileAsDataURL(file);
      const metadata = {
        targetPath: `chat-uploads/${file.name}`,
      };

      const response = await window.electron.fileSystem.uploadFile({
        workspaceId: workspace.id,
        fileData,
        fileName: file.name,
        token,
        metadata
      });

      if (response.error) {
        toast.error(`Upload failed for ${file.name}: ${response.error}`);
        return null;
      }

      if (response.operationId) {
        // Poll for completion
        return new Promise((resolve) => {
          const checkStatus = async () => {
            try {
              const status = await window.electron.fileSystem.getStatus(response.operationId);
              if (status?.status === 'completed' && status.result) {
                const uploadedFile: IFile = {
                  id: status.result.id,
                  workspace_id: workspace.id,
                  name: file.name,
                  size: file.size,
                  mime_type: file.type,
                  path: status.result.path || metadata.targetPath,
                  created_at: new Date().toISOString(),
                  metadata,
                  logicalPath: metadata.targetPath
                };
                toast.success(`Upload completed: ${file.name}`);
                resolve(uploadedFile);
              } else if (status?.status === 'failed') {
                toast.error(`Upload failed: ${status.error || 'Unknown error'}`);
                resolve(null);
              } else {
                setTimeout(checkStatus, 1000);
              }
            } catch (error) {
              toast.error(`Upload monitoring failed: ${error}`);
              resolve(null);
            }
          };
          checkStatus();
        });
      }
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      toast.error(`Failed to upload ${file.name}: ${error}`);
    }

    return null;
  };

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

      // Don't show upload toast here since ChatInput will handle it
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

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Divider,
  Paper
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import { FormattedMessage, useIntl } from "react-intl";
import { useFileExplorerStore, selectors, FileNode } from "@/renderer/stores/File/FileExplorerStore";
import { useEffect, useState } from "react";
import { IFile } from "@/../../types/File/File";
import { getUserTokenFromStore } from "@/utils/user";
import { toast } from "@/utils/toast";
import { useToastStore } from "@/renderer/stores/Notification/ToastStore";
import FilePreview from "@/renderer/scenes/Main/FileExplorer/FileRenderer";

interface FileClickDialogProps {
  open: boolean;
  onClose: () => void;
  nodeId: string;
}

export default function FileClickDialog({
  open,
  onClose,
  nodeId
}: FileClickDialogProps) {
  const intl = useIntl();
  const node = useFileExplorerStore(selectors.selectNodeById(nodeId));
  const [fileDetails, setFileDetails] = useState<IFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadToastId, setDownloadToastId] = useState<string | null>(null);

  const nodeDisplayNameFromStore = node?.label || node?.name || "Unknown Item";

  // Check if file is an image that should show preview
  const isImageFile = (fileName: string): boolean => {
    if (!fileName) return false;
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico'];
    return imageExts.includes(ext);
  };

  useEffect(() => {
    const fetchDetails = async () => {
      if (!open || !node) {
        setFileDetails(null);
        setIsLoading(false);
        return;
      }

      if (node.source === 'remote' && node.type === 'file' && node.workspaceId && node.fileDbId) {
        setIsLoading(true);
        setFileDetails(null);
        const token = getUserTokenFromStore();
        if (!token) {
          console.warn("FileClickDialog: No token found for fetching file metadata.");
          setIsLoading(false);
          return;
        }
        try {
          const result = await window.electron.fileSystem.getFileMetadata({
            workspaceId: node.workspaceId,
            fileId: node.fileDbId,
            token,
          });
          if (result && result.data) {
            setFileDetails(result.data as IFile);
          } else {
            console.warn("FileClickDialog: Metadata not found or error in response for node:", node.id, result);
          }
        } catch (error) {
          console.error("Error fetching file metadata for click dialog:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setFileDetails(null);
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [open, node]);

  const handleDownload = async () => {
    if (!node || node.type !== 'file' || !node.workspaceId || !node.fileDbId) {
      toast.error("Cannot download: Invalid file information");
      return;
    }

    const token = getUserTokenFromStore();
    if (!token) {
      toast.error("Authentication token not found");
      return;
    }

    setIsDownloading(true);
    try {
      // Open save dialog to let user choose download location
      const result = await window.electron.ipcRenderer.invoke('dialog:showSaveDialog', {
        defaultPath: fileDetails?.name || node.name,
        filters: [
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        setIsDownloading(false);
        return;
      }

      // Create progress toast
      const toastId = useToastStore.getState().addToast(`Downloading: ${fileDetails?.name || node.name}`, "info", 0);
      setDownloadToastId(toastId);

      // Start download
      const downloadResult = await window.electron.fileSystem.download(
        node.workspaceId,
        node.fileDbId,
        result.filePath,
        token
      );

      if (downloadResult.operationId) {
        // Monitor download progress
        const progressUnsubscribe = window.electron.fileSystem.onProgress((data) => {
          if (data.operationId === downloadResult.operationId && toastId) {
            // Update toast progress
            useToastStore.getState().updateToastProgress(toastId, data.progress);
          }
        });

        // Check status periodically
        const checkStatus = async () => {
          const status = await window.electron.fileSystem.getStatus(downloadResult.operationId);
          if (status?.status === 'completed') {
            if (toastId) {
              useToastStore.getState().updateToastProgress(toastId, 100);
              // Remove the progress toast and show success
              setTimeout(() => {
                useToastStore.getState().removeToast(toastId);
                toast.success(`Download completed: ${fileDetails?.name || node.name}`);
              }, 1000);
            }
            progressUnsubscribe();
            setIsDownloading(false);
            setDownloadToastId(null);
          } else if (status?.status === 'failed') {
            if (toastId) {
              useToastStore.getState().removeToast(toastId);
            }
            toast.error(`Download failed: ${status.error || 'Unknown error'}`);
            progressUnsubscribe();
            setIsDownloading(false);
            setDownloadToastId(null);
          } else {
            // Still in progress, check again
            setTimeout(checkStatus, 1000);
          }
        };

        checkStatus();
      }
    } catch (error) {
      console.error("Download error:", error);
      if (downloadToastId) {
        useToastStore.getState().removeToast(downloadToastId);
      }
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDownloading(false);
      setDownloadToastId(null);
    }
  };

  let displayPath: string | null = "N/A";
  if (node) {
    if (node.source === 'local') {
      displayPath = node.path;
    } else if (node.source === 'remote' && node.workspaceId) {
      if (node.type === 'file') {
        const parentDir = node.path.includes('/') ? node.path.substring(0, node.path.lastIndexOf('/')) : '';
        const logicalFileName = fileDetails?.name || node.name;
        const fullLogicalPath = parentDir ? `${parentDir}/${logicalFileName}` : logicalFileName;
        displayPath = `/storage/${node.workspaceId}/${fullLogicalPath}`;
      } else {
        displayPath = `/storage/${node.workspaceId}${node.path ? `/${node.path}` : ''}`;
      }
    } else {
      displayPath = node.path;
    }
  }

  const finalDisplayName = fileDetails?.name || nodeDisplayNameFromStore;
  const canDownload = node?.type === 'file' && node?.source === 'remote' && node?.workspaceId && node?.fileDbId;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            <FormattedMessage id="dialog.item.click.title" defaultMessage="Item Details" />
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box mt={1}>
          <Typography variant="body1" gutterBottom>
            <FormattedMessage
              id="dialog.item.click.info"
              defaultMessage="Selected: {item}"
              values={{
                item: <Box component="span" fontWeight="bold">{finalDisplayName}</Box>
              }}
            />
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Path: {displayPath}
          </Typography>
          {node && node.source === 'remote' && node.workspaceId && (
            <Typography variant="caption" display="block">
              Type: {node.type === 'file' ? 'Remote File' : 'Remote Directory'} (Workspace: {node.workspaceId})
            </Typography>
          )}
          {node && node.source === 'local' && (
            <Typography variant="caption" display="block">
              Type: {node.type === 'file' ? 'Local File' : 'Local Directory'}
            </Typography>
          )}
          {node?.fileDbId && (
            <Typography variant="caption" display="block">
              File DB ID: {node.fileDbId}
            </Typography>
          )}

          {isLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, justifyContent: 'center' }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">Loading details...</Typography>
            </Box>
          )}

          {fileDetails && !isLoading && (
            <Box mt={2} p={1.5} border={1} borderColor="divider" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>File Metadata Details:</Typography>
              <Typography variant="caption" display="block">Server Logical Path: {fileDetails.logicalPath || 'N/A'}</Typography>
              <Typography variant="caption" display="block">Size: {fileDetails.size} bytes</Typography>
              <Typography variant="caption" display="block">MIME Type: {fileDetails.mime_type}</Typography>
              <Typography variant="caption" display="block">Created: {new Date(fileDetails.created_at).toLocaleString()}</Typography>
              {fileDetails.updated_at && (
                <Typography variant="caption" display="block">Modified: {new Date(fileDetails.updated_at).toLocaleString()}</Typography>
              )}
            </Box>
          )}
          {node && node.type === 'directory' && !isLoading && (
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>This is a directory.</Typography>
          )}
          {node && node.type === 'file' && node.source === 'local' && !isLoading && (
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>This is a local file.</Typography>
          )}
          {node && node.type === 'file' && node.source === 'remote' && !fileDetails && !isLoading && (
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }} color="text.secondary">
              Could not load full metadata for this remote file.
            </Typography>
          )}

          {/* Image preview for image files */}
          {node && node.type === 'file' && isImageFile(node.name) && (
            <Box mt={2}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" gutterBottom>Preview:</Typography>
              <FilePreview node={node} />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {canDownload && (
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            startIcon={isDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
            variant="outlined"
            color="primary"
          >
            {isDownloading ? (
              <FormattedMessage id="dialog.file.downloading" defaultMessage="Downloading..." />
            ) : (
              <FormattedMessage id="dialog.file.download" defaultMessage="Download" />
            )}
          </Button>
        )}
        <Button onClick={onClose}>
          <FormattedMessage id="common.close" defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
}

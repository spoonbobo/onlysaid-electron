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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FormattedMessage, useIntl } from "react-intl";
import { useFileExplorerStore, selectors } from "@/renderer/stores/File/FileExplorerStore";
import { useEffect, useState } from "react";
import { IFile } from "@/../../types/File/File";
import { getUserTokenFromStore } from "@/utils/user";

interface FileDropDialogProps {
  open: boolean;
  onClose: () => void;
  sourceNodeId: string | null;
  targetNodeId: string;
  externalFileDetails?: {
    count: number;
    names: string[];
  } | null;
}

export interface FileClickDialogProps {
  open: boolean;
  onClose: () => void;
  nodeId: string;
}

export default function FileDropDialog({
  open,
  onClose,
  sourceNodeId,
  targetNodeId,
  externalFileDetails
}: FileDropDialogProps) {
  const intl = useIntl();
  const sourceNode = useFileExplorerStore(selectors.selectNodeById(sourceNodeId));
  const targetNode = useFileExplorerStore(selectors.selectNodeById(targetNodeId));

  const [sourceFileDetails, setSourceFileDetails] = useState<IFile | null>(null);
  const [targetFileDetails, setTargetFileDetails] = useState<IFile | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const targetNameString = targetNode?.label || targetNode?.name || intl.formatMessage({ id: "dialog.file.unknownTarget", defaultMessage: "Unknown Target" });
  let sourceNameDisplay: string;
  let sourcePathDisplay: string | null = null;
  let targetPathDisplay: string | null = null;

  const isExternalDrop = !sourceNodeId && externalFileDetails;

  if (isExternalDrop && externalFileDetails) {
    const fileNamesSample = externalFileDetails.names.join(", ");
    sourceNameDisplay = intl.formatMessage({ 
      id: "dialog.file.externalFiles", 
      defaultMessage: "External Files ({fileNames})" 
    }, { 
      fileNames: fileNamesSample + (externalFileDetails.count > externalFileDetails.names.length ? '...' : '') 
    });
    sourcePathDisplay = externalFileDetails.names.join(", ") + (externalFileDetails.count > externalFileDetails.names.length ? ` ${intl.formatMessage({ id: "dialog.file.andMore", defaultMessage: "and {count} more" }, { count: externalFileDetails.count - externalFileDetails.names.length })}` : "");
  } else if (sourceNode) {
    sourceNameDisplay = sourceNode.label || sourceNode.name || intl.formatMessage({ id: "dialog.file.unknownSource", defaultMessage: "Unknown Source" });
    if (sourceNode.source === 'local') {
      sourcePathDisplay = sourceNode.path;
    } else if (sourceNode.source === 'remote' && sourceNode.workspaceId) {
      if (sourceNode.type === 'file') {
        const parentDir = sourceNode.path.includes('/') ? sourceNode.path.substring(0, sourceNode.path.lastIndexOf('/')) : '';
        const logicalFileName = sourceNode.name; // Already original name from FileExplorerStore
        const fullLogicalPath = parentDir ? `${parentDir}/${logicalFileName}` : logicalFileName;
        sourcePathDisplay = `/storage/${sourceNode.workspaceId}/${fullLogicalPath}`;
      } else { // directory
        sourcePathDisplay = `/storage/${sourceNode.workspaceId}${sourceNode.path ? `/${sourceNode.path}` : ''}`;
      }
    } else if (sourceNode.source === 'remote') {
      sourcePathDisplay = sourceNode.path === '' ? sourceNode.name : sourceNode.path;
    }
  } else {
    sourceNameDisplay = intl.formatMessage({ id: "dialog.file.unknownSource", defaultMessage: "Unknown Source" });
  }

  if (targetNode) {
    if (targetNode.source === 'local') {
      targetPathDisplay = targetNode.path;
    } else if (targetNode.source === 'remote' && targetNode.workspaceId) {
      if (targetNode.type === 'file') {
        const parentDir = targetNode.path.includes('/') ? targetNode.path.substring(0, targetNode.path.lastIndexOf('/')) : '';
        const logicalFileName = targetNode.name; // Already original name
        const fullLogicalPath = parentDir ? `${parentDir}/${logicalFileName}` : logicalFileName;
        targetPathDisplay = `/storage/${targetNode.workspaceId}/${fullLogicalPath}`;
      } else { // directory
        targetPathDisplay = `/storage/${targetNode.workspaceId}${targetNode.path ? `/${targetNode.path}` : ''}`;
      }
    } else if (targetNode.source === 'remote') {
      targetPathDisplay = targetNode.path === '' ? targetNode.name : targetNode.path;
    }
  }

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!open) return;

      setIsLoadingMetadata(true);
      setSourceFileDetails(null);
      setTargetFileDetails(null);
      const token = getUserTokenFromStore();

      if (!token) {
        console.warn("FileDropDialog: No token found for fetching metadata.");
        setIsLoadingMetadata(false);
        return;
      }

      try {
        if (sourceNode && sourceNode.source === 'remote' && sourceNode.type === 'file' && sourceNode.workspaceId && sourceNode.fileDbId) {
          const result = await window.electron.fileSystem.getFileMetadata({
            workspaceId: sourceNode.workspaceId,
            fileId: sourceNode.fileDbId, // Use fileDbId
            token,
          });
          if (result && result.data) {
            setSourceFileDetails(result.data as IFile);
          }
        }

        if (targetNode && targetNode.source === 'remote' && targetNode.type === 'file' && targetNode.workspaceId && targetNode.fileDbId) {
          const result = await window.electron.fileSystem.getFileMetadata({
            workspaceId: targetNode.workspaceId,
            fileId: targetNode.fileDbId, // Use fileDbId
            token,
          });
          if (result && result.data) {
            setTargetFileDetails(result.data as IFile);
          }
        }
      } catch (error) {
        console.error("Error fetching file metadata:", error);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    fetchMetadata();
  }, [open, sourceNode, targetNode]);

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
            <FormattedMessage id="dialog.file.drop.title" defaultMessage="Item Dropped" />
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
              id="dialog.file.drop.info"
              defaultMessage="Item {source} was dropped onto {target}"
              values={{
                source: <Box component="span" fontWeight="bold">{sourceFileDetails?.name || sourceNameDisplay}</Box>,
                target: <Box component="span" fontWeight="bold">{targetFileDetails?.name || targetNameString}</Box>
              }}
            />
          </Typography>

          {sourcePathDisplay && (
            <Typography variant="caption" display="block" gutterBottom>
              Source path: {sourcePathDisplay}
            </Typography>
          )}
          {targetPathDisplay && (
            <Typography variant="caption" display="block">
              Target path: {targetPathDisplay}
            </Typography>
          )}

          {isLoadingMetadata && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">Loading file details...</Typography>
            </Box>
          )}

          {sourceFileDetails && (
            <Box mt={2} p={1.5} border={1} borderColor="divider" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>Source File Details ({sourceFileDetails.name}):</Typography>
              <Typography variant="caption" display="block">Size: {sourceFileDetails.size} bytes</Typography>
              <Typography variant="caption" display="block">Type: {sourceFileDetails.mime_type}</Typography>
              <Typography variant="caption" display="block">Created: {new Date(sourceFileDetails.created_at).toLocaleString()}</Typography>
              {sourceFileDetails.updated_at && <Typography variant="caption" display="block">Modified: {new Date(sourceFileDetails.updated_at).toLocaleString()}</Typography>}
            </Box>
          )}

          {targetFileDetails && (
            <Box mt={1.5} p={1.5} border={1} borderColor="divider" borderRadius={1}>
              <Typography variant="subtitle2" gutterBottom>Target File Details ({targetFileDetails.name}):</Typography>
              <Typography variant="caption" display="block">Size: {targetFileDetails.size} bytes</Typography>
              <Typography variant="caption" display="block">Type: {targetFileDetails.mime_type}</Typography>
              <Typography variant="caption" display="block">Created: {new Date(targetFileDetails.created_at).toLocaleString()}</Typography>
              {targetFileDetails.updated_at && <Typography variant="caption" display="block">Modified: {new Date(targetFileDetails.updated_at).toLocaleString()}</Typography>}
            </Box>
          )}

          {isExternalDrop && (
            <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', fontSize: '0.75rem' }} color="text.secondary">
              <FormattedMessage
                id="dialog.externalFile.drop.functional_note"
                defaultMessage="Note: Dropping external files here is for informational display. Actual file upload functionality is not yet implemented."
              />
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          <FormattedMessage id="common.close" defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function FileClickDialog(props: FileClickDialogProps) {
  console.warn("FileClickDialog should be imported from its own module.");
  return null;
}

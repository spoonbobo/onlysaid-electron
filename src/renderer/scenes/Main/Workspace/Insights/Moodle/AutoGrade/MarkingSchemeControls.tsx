import React from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
} from '@mui/material';
import {
  FolderOpen as FolderOpenIcon,
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  FileDownload as FileDownloadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { MarkingScheme } from './types';

interface MarkingSchemeControlsProps {
  selectedAssignment: string;
  selectedKbId: string;
  currentMarkingScheme?: MarkingScheme;
  uploading: boolean;
  onLoadScheme: () => void;
  onUploadScheme: () => void;
  onDownloadScheme: () => void;
  onRemoveScheme: () => void;
}

export default function MarkingSchemeControls({
  selectedAssignment,
  selectedKbId,
  currentMarkingScheme,
  uploading,
  onLoadScheme,
  onUploadScheme,
  onDownloadScheme,
  onRemoveScheme
}: MarkingSchemeControlsProps) {
  const intl = useIntl();

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
      <Button
        variant="outlined"
        startIcon={<FolderOpenIcon />}
        onClick={onLoadScheme}
        disabled={!selectedAssignment || !selectedKbId}
      >
        {intl.formatMessage({ id: "workspace.insights.moodle.autograde.loadMarkingScheme", defaultMessage: "Load Marking Scheme" })}
      </Button>
      
      <Button
        variant="outlined"
        startIcon={<CloudUploadIcon />}
        onClick={onUploadScheme}
        disabled={!selectedKbId || uploading}
      >
        {uploading
          ? intl.formatMessage({ id: "workspace.insights.moodle.autograde.uploading", defaultMessage: "Uploading..." })
          : intl.formatMessage({ id: "workspace.insights.moodle.autograde.uploadToKB", defaultMessage: "Upload to KB" })}
      </Button>
      
      {currentMarkingScheme && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            icon={<DescriptionIcon />}
            label={currentMarkingScheme.fileName}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ maxWidth: 200 }}
          />
          <IconButton
            size="small"
            onClick={onDownloadScheme}
            title={intl.formatMessage({ id: "workspace.insights.moodle.autograde.downloadScheme", defaultMessage: "Download" })}
          >
            <FileDownloadIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={onRemoveScheme}
            title={intl.formatMessage({ id: "workspace.insights.moodle.autograde.removeScheme", defaultMessage: "Remove" })}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
} 
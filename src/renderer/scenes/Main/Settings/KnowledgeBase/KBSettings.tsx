import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Button,
  Stack,
  Alert
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { IKnowledgeBase } from '@/../../types/KnowledgeBase/KnowledgeBase';

interface KBSettingsProps {
  knowledgeBase: IKnowledgeBase;
  onEdit: () => void;
  onDelete: () => void;
}

export default function KBSettings({
  knowledgeBase,
  onEdit,
  onDelete
}: KBSettingsProps) {
  return (
    <Box>
      {/* Section Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <FormattedMessage id="kb.settings.title" />
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage id="kb.settings.description" />
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Settings Sections */}
      <Stack spacing={3}>
        {/* Configuration Settings */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">
                <FormattedMessage id="kb.settings.configuration" defaultMessage="Configuration" />
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              <FormattedMessage 
                id="kb.settings.configuration.description" 
                defaultMessage="Modify knowledge base settings, embedding model, and other configuration options." 
              />
            </Typography>

            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={onEdit}
              sx={{ mt: 1 }}
            >
              <FormattedMessage id="kb.settings.edit" defaultMessage="Edit Settings" />
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card variant="outlined" sx={{ borderColor: 'error.main', bgcolor: 'error.lighter' }}>
          <CardContent>
            <Typography variant="h6" color="error.main" gutterBottom>
              <FormattedMessage id="kb.settings.dangerZone" defaultMessage="Danger Zone" />
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <FormattedMessage 
                id="kb.settings.deleteWarning" 
                defaultMessage="Deleting a knowledge base is permanent and cannot be undone. All documents and data will be lost." 
              />
            </Alert>

            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={onDelete}
            >
              <FormattedMessage id="kb.settings.delete" defaultMessage="Delete Knowledge Base" />
            </Button>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}

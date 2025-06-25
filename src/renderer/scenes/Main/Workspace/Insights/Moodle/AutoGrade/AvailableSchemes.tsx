import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Cancel as CancelIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { MarkingScheme, KnowledgeBase } from './types';

interface AvailableSchemesProps {
  show: boolean;
  onClose: () => void;
  loadingSchemes: boolean;
  availableSchemes: any[];
  currentMarkingScheme?: MarkingScheme;
  knowledgeBases: KnowledgeBase[];
  selectedKbId: string;
  onSelectScheme: (scheme: any) => void;
}

export default function AvailableSchemes({
  show,
  onClose,
  loadingSchemes,
  availableSchemes,
  currentMarkingScheme,
  knowledgeBases,
  selectedKbId,
  onSelectScheme
}: AvailableSchemesProps) {
  if (!show) return null;

  const selectedKB = knowledgeBases.find(kb => kb.id === selectedKbId);

  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 3, 
        bgcolor: 'background.default',
        border: 1,
        borderColor: 'divider'
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" color="text.primary">
          Available Marking Schemes in {selectedKB?.name}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CancelIcon />
        </IconButton>
      </Box>
      
      {loadingSchemes ? (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      ) : availableSchemes.length === 0 ? (
        <Alert severity="info">
          No marking schemes found. Upload files to this KB first.
        </Alert>
      ) : (
        <Box>
          {availableSchemes.map((scheme) => (
            <Box 
              key={scheme.id}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2, 
                p: 1,
                cursor: 'pointer',
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
                border: currentMarkingScheme?.fileId === scheme.id ? 1 : 1,
                borderColor: currentMarkingScheme?.fileId === scheme.id ? 'primary.main' : 'transparent',
                bgcolor: currentMarkingScheme?.fileId === scheme.id ? 'action.selected' : 'transparent'
              }}
              onClick={() => onSelectScheme(scheme)}
            >
              <DescriptionIcon color="primary" fontSize="small" />
              <Typography variant="body2" sx={{ flex: 1 }} color="text.primary">
                {scheme.title}
              </Typography>
              {currentMarkingScheme?.fileId === scheme.id && (
                <Chip 
                  label="Loaded" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
} 
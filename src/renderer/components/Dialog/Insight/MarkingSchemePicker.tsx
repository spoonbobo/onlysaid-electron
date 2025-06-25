import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  InputAdornment,
  TextField,
  Divider,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as DescriptionIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  FilePresent as FilePresentIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { MarkingScheme, KnowledgeBase } from '@/renderer/scenes/Main/Workspace/Insights/Moodle/AutoGrade/types';

interface MarkingSchemePickerProps {
  open: boolean;
  onClose: () => void;
  loadingSchemes: boolean;
  availableSchemes: any[];
  currentMarkingScheme?: MarkingScheme;
  knowledgeBases: KnowledgeBase[];
  selectedKbId: string;
  onSelectScheme: (scheme: any) => void;
}

export default function MarkingSchemePicker({
  open,
  onClose,
  loadingSchemes,
  availableSchemes,
  currentMarkingScheme,
  knowledgeBases,
  selectedKbId,
  onSelectScheme
}: MarkingSchemePickerProps) {
  const intl = useIntl();
  const [searchTerm, setSearchTerm] = useState('');

  const selectedKB = knowledgeBases.find(kb => kb.id === selectedKbId);

  // Filter schemes based on search term
  const filteredSchemes = availableSchemes.filter(scheme =>
    scheme.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectScheme = (scheme: any) => {
    onSelectScheme(scheme);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'txt':
      case 'md':
        return <DescriptionIcon color="primary" />;
      case 'doc':
      case 'docx':
        return <FilePresentIcon color="info" />;
      default:
        return <DescriptionIcon color="action" />;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          maxHeight: '800px',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" component="div">
              {intl.formatMessage({ 
                id: 'workspace.insights.moodle.autograde.dialog.selectMarkingScheme', 
                defaultMessage: 'Select Marking Scheme' 
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ 
                id: 'workspace.insights.moodle.autograde.dialog.fromKnowledgeBase', 
                defaultMessage: 'From Knowledge Base:' 
              })} <strong>{selectedKB?.name}</strong>
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Search Bar */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={intl.formatMessage({ 
              id: 'workspace.insights.moodle.autograde.dialog.searchSchemes', 
              defaultMessage: 'Search marking schemes...' 
            })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Current Selection */}
        {currentMarkingScheme && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {intl.formatMessage({ 
                id: 'workspace.insights.moodle.autograde.dialog.currentSelection', 
                defaultMessage: 'Current Selection:' 
              })}
            </Typography>
            <Box sx={{
              p: 2,
              bgcolor: 'action.selected',
              borderRadius: 1,
              border: 1,
              borderColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              {getFileIcon(currentMarkingScheme.fileName)}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight="medium">
                  {currentMarkingScheme.fileName}
                </Typography>
                {currentMarkingScheme.fileSize && (
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(currentMarkingScheme.fileSize)}
                  </Typography>
                )}
              </Box>
              <Chip 
                label={intl.formatMessage({ 
                  id: 'workspace.insights.moodle.autograde.dialog.loaded', 
                  defaultMessage: 'Loaded' 
                })}
                size="small" 
                color="primary"
                icon={<CheckCircleIcon />}
              />
            </Box>
            <Divider sx={{ mt: 2, mb: 2 }} />
          </Box>
        )}

        {/* Schemes List */}
        <Box sx={{ minHeight: 300 }}>
          {loadingSchemes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                {intl.formatMessage({ 
                  id: 'workspace.insights.moodle.autograde.dialog.loadingSchemes', 
                  defaultMessage: 'Loading marking schemes...' 
                })}
              </Typography>
            </Box>
          ) : filteredSchemes.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {searchTerm ? (
                intl.formatMessage({ 
                  id: 'workspace.insights.moodle.autograde.dialog.noSchemesFound', 
                  defaultMessage: 'No marking schemes found matching your search.' 
                })
              ) : (
                intl.formatMessage({ 
                  id: 'workspace.insights.moodle.autograde.dialog.noSchemesAvailable', 
                  defaultMessage: 'No marking schemes found. Upload files to this knowledge base first.' 
                })
              )}
            </Alert>
          ) : (
            <List sx={{ py: 0 }}>
              {filteredSchemes.map((scheme, index) => {
                const isSelected = currentMarkingScheme?.fileId === scheme.id;
                
                return (
                  <React.Fragment key={scheme.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemButton
                        onClick={() => handleSelectScheme(scheme)}
                        selected={isSelected}
                        sx={{
                          borderRadius: 1,
                          border: 1,
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          mb: 1,
                          '&:hover': {
                            borderColor: 'primary.main',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'action.selected',
                            '&:hover': {
                              bgcolor: 'action.selected',
                            },
                          },
                        }}
                      >
                        <ListItemIcon>
                          {getFileIcon(scheme.title)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {scheme.title}
                              </Typography>
                              {isSelected && (
                                <Chip 
                                  label={intl.formatMessage({ 
                                    id: 'workspace.insights.moodle.autograde.dialog.loaded', 
                                    defaultMessage: 'Loaded' 
                                  })}
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                              {scheme.size && (
                                <Typography variant="caption" color="text.secondary">
                                  {formatFileSize(scheme.size)}
                                </Typography>
                              )}
                            </Stack>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < filteredSchemes.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {filteredSchemes.length} {intl.formatMessage({ 
              id: 'workspace.insights.moodle.autograde.dialog.schemesFound', 
              defaultMessage: 'schemes found' 
            })}
          </Typography>
          <Button onClick={onClose} variant="outlined">
            {intl.formatMessage({ 
              id: 'common.close', 
              defaultMessage: 'Close' 
            })}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

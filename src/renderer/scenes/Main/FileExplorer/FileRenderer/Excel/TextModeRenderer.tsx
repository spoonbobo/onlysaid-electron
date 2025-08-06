import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  GridView as TableIcon,
  Save as SaveIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { ExcelDocumentData } from './types';
import { worksheetsToText, textToWorksheets } from './utils';

interface ExcelTextModeRendererProps {
  documentData: ExcelDocumentData;
  fontSize?: number;
  maxHeight?: number;
  isEditable?: boolean;
  onRenderModeChange?: (mode: 'table' | 'text') => void;
  onContentChange?: (content: string) => void;
  externalContent?: string;
  showDiff?: boolean;
  diff?: any;
}

export default function ExcelTextModeRenderer({
  documentData,
  fontSize = 14,
  maxHeight = 600,
  isEditable = false,
  onRenderModeChange,
  onContentChange,
  externalContent,
  showDiff = false,
  diff
}: ExcelTextModeRendererProps) {
  
  // Convert worksheets to text format
  const originalText = worksheetsToText(documentData.worksheets);
  const displayContent = externalContent ?? originalText;
  
  const [localContent, setLocalContent] = useState(displayContent);
  const [hasChanges, setHasChanges] = useState(false);

  const handleContentChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setLocalContent(newContent);
    setHasChanges(newContent !== displayContent);
    
    if (onContentChange) {
      onContentChange(newContent);
    }
  }, [displayContent, onContentChange]);

  const handleUndo = () => {
    setLocalContent(displayContent);
    setHasChanges(false);
    if (onContentChange) {
      onContentChange(displayContent);
    }
  };

  const previewChanges = () => {
    try {
      const newWorksheets = textToWorksheets(localContent);
      return {
        success: true,
        worksheets: newWorksheets,
        worksheetCount: newWorksheets.length
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const changePreview = previewChanges();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box mb={2} display="flex" alignItems="center" justifyContent="between" gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          {onRenderModeChange && (
            <Tooltip title="Switch to table view">
              <IconButton size="small" onClick={() => onRenderModeChange('table')}>
                <TableIcon />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h6" component="h3">
            <FormattedMessage 
              id="excel.textMode" 
              defaultMessage="Excel Text Editor" 
            />
          </Typography>
        </Box>
        
        {isEditable && hasChanges && (
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Undo changes">
              <IconButton size="small" onClick={handleUndo}>
                <UndoIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="caption" color="warning.main">
              <FormattedMessage 
                id="excel.unsavedChanges" 
                defaultMessage="Unsaved changes" 
              />
            </Typography>
          </Box>
        )}
      </Box>

      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <FormattedMessage 
            id="excel.textModeInstructions" 
            defaultMessage="Edit the Excel content in text format. Each worksheet is separated by === headers. Use tabs or commas to separate cell values." 
          />
        </Typography>
      </Alert>

      {/* Text editor */}
      <Paper 
        variant="outlined"
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[900] : 'inherit'
        }}
      >
        {isEditable ? (
          <TextField
            multiline
            fullWidth
            value={localContent}
            onChange={handleContentChange}
            placeholder="Enter Excel content..."
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                height: '100%',
                '& fieldset': {
                  border: 'none',
                },
                '& textarea': {
                  fontFamily: 'monospace',
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.4,
                  height: '100% !important',
                  resize: 'none'
                }
              }
            }}
            InputProps={{
              sx: {
                fontFamily: 'monospace',
                fontSize: `${fontSize}px`,
                lineHeight: 1.4,
                height: '100%'
              }
            }}
            variant="outlined"
          />
        ) : (
          <Box
            sx={{
              p: 2,
              flex: 1,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: `${fontSize}px`,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[900] : '#f9f9f9'
            }}
          >
            {displayContent}
          </Box>
        )}
      </Paper>

      {/* Change preview */}
      {isEditable && hasChanges && (
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>
            <FormattedMessage 
              id="excel.changePreview" 
              defaultMessage="Change Preview:" 
            />
          </Typography>
          
          {changePreview.success ? (
            <Alert severity="success">
              <Typography variant="body2">
                <FormattedMessage 
                  id="excel.validChanges" 
                  defaultMessage="Valid changes detected: {count} worksheet(s) will be updated"
                  values={{ count: changePreview.worksheetCount }}
                />
              </Typography>
            </Alert>
          ) : (
            <Alert severity="error">
              <Typography variant="body2">
                <FormattedMessage 
                  id="excel.invalidChanges" 
                  defaultMessage="Invalid format: {error}"
                  values={{ error: changePreview.error }}
                />
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* Format help */}
      <Box mt={2}>
        <Typography variant="caption" color="textSecondary">
          <FormattedMessage 
            id="excel.formatHelp" 
            defaultMessage="Format: Use === Worksheet Name === to separate worksheets. Separate cells with tabs or commas. First row after worksheet name should contain column headers (A, B, C, etc.)." 
          />
        </Typography>
      </Box>
    </Box>
  );
}
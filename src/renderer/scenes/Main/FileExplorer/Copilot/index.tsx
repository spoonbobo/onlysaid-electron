import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  Button
} from '@mui/material';
import { toast } from '@/utils/toast';
import {
  Close as CloseIcon,
  AutoAwesome as CopilotIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Save as SaveIcon,
  Article as TextModeIcon,
  TableChart as ViewModeIcon,
  AutoFixHigh as EnhancedReaderIcon,
  TextFields as BasicReaderIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { FileNode } from '@/renderer/stores/File/FileExplorerStore';
import FilePreview from '../FileRenderer';
import Chat from '../../Chat';
import { useCurrentTopicContext } from '@/renderer/stores/Topic/TopicStore';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';
import {
  FiberManualRecord as UnsavedIcon
} from '@mui/icons-material';

interface CopilotProps {
  node: FileNode;
  onClose: () => void;
}

export default function Copilot({ node, onClose }: CopilotProps) {
  // Get state from store instead of local state
  const { 
    splitRatio, 
    setSplitRatio, 
    setCurrentDocument, 
    hasUnsavedChanges,
    setHasUnsavedChanges 
  } = useCopilotStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [documentData, setDocumentData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Document view mode controls (for DOCX and Excel files)
  const [renderMode, setRenderMode] = useState<'text' | 'view'>('view');
  const [useEnhancedReader, setUseEnhancedReader] = useState(true);
  const { setSelectedContext } = useCurrentTopicContext();

  // Compute unsaved changes state
  const computedHasUnsavedChanges = useMemo(() => {
    return editedContent !== lastSavedContent && editedContent.trim().length > 0;
  }, [editedContent, lastSavedContent]);

  // Update store when unsaved changes state changes
  useEffect(() => {
    setHasUnsavedChanges(computedHasUnsavedChanges);
  }, [computedHasUnsavedChanges, setHasUnsavedChanges]);

  // Set current document in store when component mounts
  useEffect(() => {
    setCurrentDocument(node);
    
    // Create a local copilot context for this document
    const copilotContext = {
      id: `copilot-${node.id}`,
      name: `Copilot: ${node.name}`,
      type: 'copilot' as const,
      section: 'local:copilot'
    };

    setSelectedContext(copilotContext);

    // Cleanup when component unmounts
    return () => {
      setCurrentDocument(null);
    };
  }, [node, setSelectedContext, setCurrentDocument]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = document.getElementById('copilot-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
    
    // Clamp between 20% and 80%
    setSplitRatio(Math.max(20, Math.min(80, newRatio)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Font control functions
  const handleFontSizeIncrease = () => setFontSize(prev => Math.min(prev + 2, 24));
  const handleFontSizeDecrease = () => setFontSize(prev => Math.max(prev - 2, 10));
  
  // Helper functions to check file types
  const isDOCXFile = (fileName: string): boolean => {
    if (!fileName) return false;
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return ['.docx', '.doc'].includes(ext);
  };
  
  const isExcelFile = (fileName: string): boolean => {
    if (!fileName) return false;
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return ['.xlsx', '.xls', '.xlsm', '.xlsb'].includes(ext);
  };

  // Check if file supports structured viewing (DOCX/Excel)
  const supportsStructuredView = (fileName: string): boolean => {
    return isDOCXFile(fileName) || isExcelFile(fileName);
  };

  // Mode control handlers
  const handleRenderModeChange = (mode: 'text' | 'view') => {
    setRenderMode(mode);
  };

  const handleReaderTypeChange = (useEnhanced: boolean) => {
    setUseEnhancedReader(useEnhanced);
  };

  // Save function
  const handleSave = async () => {
    if (!node || !editedContent.trim()) return;
    
    setIsSaving(true);
    try {
      let result;
      
      if (isDOCXFile(node.name)) {
        // Use DOCX-specific save handler
        if (!window.electron?.fileSystem?.saveDocxTextContent) {
          throw new Error('DOCX save function is not available. Please restart the application.');
        }
        result = await window.electron.fileSystem.saveDocxTextContent(node.path, editedContent);
      } else if (isExcelFile(node.name)) {
        // Use Excel-specific save handler
        if (!window.electron?.fileSystem?.saveExcelTextContent) {
          throw new Error('Excel save function is not available. Please restart the application.');
        }
        result = await window.electron.fileSystem.saveExcelTextContent(node.path, editedContent);
      } else {
        // Use regular text save for other file types
        if (!window.electron?.fileSystem?.saveDocumentText) {
          throw new Error('saveDocumentText function is not available. Please restart the application.');
        }
        result = await window.electron.fileSystem.saveDocumentText(node.path, editedContent);
      }
      
      if (result?.success) {
        // Update document data to reflect the saved content
        setDocumentData((prev: any) => ({ ...prev, text: editedContent }));
        setLastSavedContent(editedContent);
        toast.success('File saved successfully!');
        console.log('File saved successfully');
      } else {
        toast.error(`Failed to save file: ${result?.error || 'Unknown error'}`);
        console.error('Failed to save file:', result?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred while saving');
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save function
  const autoSave = async () => {
    if (!node || !editedContent.trim()) return;
    
    // Only auto-save if content has changed since last save
    if (editedContent === lastSavedContent) return;
    
    try {
      let result;
      
      if (isDOCXFile(node.name)) {
        // Use DOCX-specific save handler
        if (!window.electron?.fileSystem?.saveDocxTextContent) {
          console.error('Auto-save failed: DOCX save function not available');
          return;
        }
        result = await window.electron.fileSystem.saveDocxTextContent(node.path, editedContent);
      } else if (isExcelFile(node.name)) {
        // Use Excel-specific save handler
        if (!window.electron?.fileSystem?.saveExcelTextContent) {
          console.error('Auto-save failed: Excel save function not available');
          return;
        }
        result = await window.electron.fileSystem.saveExcelTextContent(node.path, editedContent);
      } else {
        // Use regular text save for other file types
        if (!window.electron?.fileSystem?.saveDocumentText) {
          console.error('Auto-save failed: saveDocumentText function not available');
          return;
        }
        result = await window.electron.fileSystem.saveDocumentText(node.path, editedContent);
      }
      
      if (result?.success) {
        // Update document data to reflect the saved content
        setDocumentData((prev: any) => ({ ...prev, text: editedContent }));
        setLastSavedContent(editedContent);
        // Don't show toast for auto-save to avoid spam
        console.log('Auto-saved file');
      } else {
        console.error('Auto-save failed:', result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Handle content changes with auto-save
  const handleContentChange = (content: string) => {
    setEditedContent(content);
    
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    // Set new timer for auto-save (3 seconds after last change)
    const timer = setTimeout(() => {
      autoSave();
    }, 3000);
    
    setAutoSaveTimer(timer);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Keyboard shortcut for save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editedContent, node]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  return (
    <Paper 
      sx={{ 
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {(() => {
                // Remove file extension from display name
                const lastDotIndex = node.name.lastIndexOf('.');
                return lastDotIndex > 0 ? node.name.substring(0, lastDotIndex) : node.name;
              })()}
            </Typography>
            
            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <Tooltip title="Unsaved changes">
                <UnsavedIcon 
                  sx={{ 
                    fontSize: 8, 
                    color: 'warning.main',
                    ml: 0.5
                  }} 
                />
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Decrease Font Size">
            <IconButton size="small" onClick={handleFontSizeDecrease} disabled={fontSize <= 10}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '32px', textAlign: 'center', fontSize: '11px' }}>
            {fontSize}px
          </Typography>
          
          <Tooltip title="Increase Font Size">
            <IconButton size="small" onClick={handleFontSizeIncrease} disabled={fontSize >= 24}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          
          {/* Document controls - only show for structured documents (DOCX/Excel) */}
          {supportsStructuredView(node.name) && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20 }} />
              
              {/* View mode controls */}
              <Tooltip title="View Mode">
                <IconButton
                  size="small"
                  onClick={() => handleRenderModeChange(renderMode === 'text' ? 'view' : 'text')}
                  sx={{
                    color: renderMode === 'view' ? 'primary.main' : 'inherit'
                  }}
                >
                  {renderMode === 'view' ? <ViewModeIcon /> : <TextModeIcon />}
                </IconButton>
              </Tooltip>
              
              {/* Enhanced reader toggle */}
              <Tooltip title={useEnhancedReader ? "Enhanced Reader" : "Basic Reader"}>
                <IconButton
                  size="small"
                  onClick={() => handleReaderTypeChange(!useEnhancedReader)}
                  sx={{
                    color: useEnhancedReader ? 'success.main' : 'inherit'
                  }}
                >
                  {useEnhancedReader ? <EnhancedReaderIcon /> : <BasicReaderIcon />}
                </IconButton>
              </Tooltip>
            </>
          )}
          
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20 }} />
          
          <Tooltip title={hasUnsavedChanges ? "Save File (Ctrl+S) - Unsaved changes" : "Save File (Ctrl+S)"}>
            <IconButton 
              size="small" 
              onClick={handleSave} 
              disabled={!documentData?.text || isSaving}
              sx={{
                color: hasUnsavedChanges ? 'warning.main' : 'inherit'
              }}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Close Copilot">
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Divider />

      {/* Main Content */}
      <Box 
        id="copilot-container"
        sx={{ 
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'col-resize' : 'default'
        }}
      >
        {/* Document Panel */}
        <Box 
          sx={{ 
            width: `${splitRatio}%`,
            display: 'flex',
            flexDirection: 'column',
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'hidden'
          }}
        >
          {/* Document Content */}
          <Box sx={{ flex: 1, overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, height: '100%' }}>
              <FilePreview 
                node={node} 
                fontSize={fontSize}
                hideControls={true}
                isEditable={renderMode === 'text'}
                onDocumentLoad={(data) => {
                  setDocumentData(data);
                  setEditedContent(data.text);
                  setLastSavedContent(data.text);
                }}
                onContentChange={handleContentChange}
                renderMode={supportsStructuredView(node.name) ? renderMode : undefined}
                useEnhancedReader={supportsStructuredView(node.name) ? useEnhancedReader : undefined}
                onRenderModeChange={supportsStructuredView(node.name) ? handleRenderModeChange : undefined}
                onReaderTypeChange={supportsStructuredView(node.name) ? handleReaderTypeChange : undefined}
              />
            </Box>
          </Box>
        </Box>

        {/* Resizer */}
        <Box
          sx={{
            width: '2px',
            bgcolor: 'divider',
            cursor: 'col-resize',
            position: 'relative',
            '&:hover': {
              width: '4px',
              bgcolor: 'primary.main',
            },
            transition: 'all 0.2s ease'
          }}
          onMouseDown={handleMouseDown}
        />

        {/* Chat Panel */}
        <Box 
          sx={{ 
            width: `${100 - splitRatio}%`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Chat Content */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Chat />
          </Box>
        </Box>
      </Box>

      {/* Footer/Status Bar */}
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          minHeight: '32px'
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <FormattedMessage 
            id="copilot.status" 
            defaultMessage="AI Copilot is ready to help with your document"
          />
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Document: {splitRatio.toFixed(0)}% | Chat: {(100 - splitRatio).toFixed(0)}%
          </Typography>
          
          <Button 
            size="small" 
            onClick={() => setSplitRatio(50)}
            sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
          >
            Reset Split
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

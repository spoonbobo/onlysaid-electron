import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { ExcelPreviewProps, ExcelDocumentData } from './types';
import { isSupportedExcelDocument } from './utils';
import ExcelDocumentLoader from './DocumentLoader';
import ExcelRenderer from './ExcelRenderer';
import ExcelViewRenderer from './ExcelViewRenderer';
import ExcelTextModeRenderer from './TextModeRenderer';

export default function ExcelPreview({ 
  node, 
  maxHeight = 500, 
  fontSize: externalFontSize, 
  hideControls = false, 
  isEditable = false,
  onDocumentLoad,
  onContentChange,
  externalContent,
  // Add diff props
  showDiff = false,
  diff,
  onApplyDiffBlock,
  onDeclineDiffBlock,
  // External control props
  renderMode: externalRenderMode,
  useEnhancedReader: externalUseEnhancedReader,
  onRenderModeChange,
  onReaderTypeChange
}: ExcelPreviewProps) {
  
  const [documentData, setDocumentData] = useState<ExcelDocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [internalRenderMode, setInternalRenderMode] = useState<'table' | 'text'>('table');
  const [internalUseEnhancedReader, setInternalUseEnhancedReader] = useState(true);
  const [internalFontSize, setInternalFontSize] = useState(14);
  const [editableContent, setEditableContent] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');

  // Use external controls if provided, otherwise use internal state
  const renderMode = externalRenderMode ?? internalRenderMode;
  const useEnhancedReader = externalUseEnhancedReader ?? internalUseEnhancedReader;
  const fontSize = externalFontSize ?? internalFontSize;

  const updateRenderMode = (mode: 'table' | 'text') => {
    if (onRenderModeChange) {
      onRenderModeChange(mode);
    } else {
      setInternalRenderMode(mode);
    }
  };
  
  const updateUseEnhancedReader = (useEnhanced: boolean) => {
    if (onReaderTypeChange) {
      onReaderTypeChange(useEnhanced);
    } else {
      setInternalUseEnhancedReader(useEnhanced);
    }
  };

  // Use external content if provided, otherwise use internal state
  const displayContent = externalContent ?? editableContent;

  // Update internal content when external content changes
  useEffect(() => {
    if (externalContent !== undefined && externalContent !== editableContent) {
      setEditableContent(externalContent);
    }
  }, [externalContent]);

  const handleDocumentLoad = (data: ExcelDocumentData) => {
    setDocumentData(data);
    // Initialize editable content with text representation
    const textContent = data.worksheets.length > 0 ? 
      data.worksheets.map(ws => `=== ${ws.name} ===\n\n(Excel data)`).join('\n\n') : 
      'No data';
    setEditableContent(textContent);
    setLastSavedContent(textContent);
    // Call onDocumentLoad callback if provided
    if (onDocumentLoad) {
      onDocumentLoad(data);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditableContent(newContent);

    if (onContentChange) {
      onContentChange(newContent);
    }
  };

  const docInfo = isSupportedExcelDocument(node.name);

  if (!docInfo.isSupported) {
    return (
      <Alert severity="info">
        <FormattedMessage 
          id="file.preview.notSupported" 
          defaultMessage="Excel preview not supported for this file type" 
        />
      </Alert>
    );
  }

  // Show loading state or error from DocumentLoader
  if (!documentData || error) {
    return (
      <ExcelDocumentLoader
        node={node}
        useEnhancedReader={useEnhancedReader}
        hideControls={hideControls}
        onDocumentLoad={handleDocumentLoad}
        onError={handleError}
        onReaderTypeChange={updateUseEnhancedReader}
      />
    );
  }

  const renderContent = () => {
    if (renderMode === 'text') {
      return (
        <ExcelTextModeRenderer
          documentData={documentData}
          fontSize={fontSize}
          maxHeight={maxHeight}
          isEditable={isEditable}
          onRenderModeChange={!hideControls ? updateRenderMode : undefined}
          onContentChange={onContentChange}
          externalContent={externalContent}
          showDiff={showDiff}
          diff={diff}
        />
      );
    }

    // Use ExcelRenderer for editable mode, ExcelViewRenderer for view-only
    if (isEditable) {
      return (
        <ExcelRenderer
          documentData={documentData}
          fontSize={fontSize}
          maxHeight={maxHeight}
          renderMode={renderMode}
          onRenderModeChange={!hideControls ? updateRenderMode : undefined}
          showDiff={showDiff}
          diff={diff}
          onApplyDiffBlock={onApplyDiffBlock}
          onDeclineDiffBlock={onDeclineDiffBlock}
        />
      );
    }

    return (
      <ExcelViewRenderer
        documentData={documentData}
        fontSize={fontSize}
        maxHeight={maxHeight}
        renderMode={renderMode}
        onRenderModeChange={!hideControls ? updateRenderMode : undefined}
        showDiff={showDiff}
        diff={diff}
        onApplyDiffBlock={onApplyDiffBlock}
        onDeclineDiffBlock={onDeclineDiffBlock}
      />
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderContent()}
    </Box>
  );
}
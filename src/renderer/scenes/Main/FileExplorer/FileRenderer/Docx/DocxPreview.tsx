import React, { useState, useEffect } from 'react';
import { Box, Alert } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { DocumentData, DocxPreviewProps } from './types';
import { isSupportedDocument } from './utils';
import DocumentLoader from './DocumentLoader';
import DocxRenderer from './DocxRenderer';
import TextModeRenderer from './TextModeRenderer';
import DiffOverlay from './DiffOverlay';
import DocumentInfo from './DocumentInfo';

export default function DocxPreview({ 
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
}: DocxPreviewProps) {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [internalFontSize, setInternalFontSize] = useState(14);
  const [editableContent, setEditableContent] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [internalRenderMode, setInternalRenderMode] = useState<'text' | 'view'>('view');
  const [internalUseEnhancedReader, setInternalUseEnhancedReader] = useState(true);
  
  // Use external props if provided, otherwise use internal state
  const renderMode = externalRenderMode ?? internalRenderMode;
  const useEnhancedReader = externalUseEnhancedReader ?? internalUseEnhancedReader;
  const fontSize = externalFontSize ?? internalFontSize;
  
  // Helper functions to update render mode and reader type
  const updateRenderMode = (mode: 'text' | 'view') => {
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

  const handleDocumentLoad = (data: DocumentData) => {
    setDocumentData(data);
    // Initialize editable content
    setEditableContent(data.text);
    setLastSavedContent(data.text);
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

  const docInfo = isSupportedDocument(node.name);

  if (!docInfo.isSupported) {
    return (
      <Alert severity="info">
        <FormattedMessage 
          id="file.preview.notSupported" 
          defaultMessage="DOCX preview not supported for this file type" 
        />
      </Alert>
    );
  }

  // Show loading state or error from DocumentLoader
  if (!documentData || error) {
    return (
      <DocumentLoader
        node={node}
        useEnhancedReader={useEnhancedReader}
        hideControls={hideControls}
        onDocumentLoad={handleDocumentLoad}
        onError={handleError}
        onReaderTypeChange={updateUseEnhancedReader}
      />
    );
  }

  const renderEditableContent = () => {
    if (!isEditable) {
      return null;
    }

    // For DOCX files, we want to show the structured view even when editable
    // Only switch to raw text editing if the user specifically chooses text mode
    return (
      <Box 
        sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}
        data-diff-container // Help floating buttons find this container in edit mode
      >
        <DiffOverlay
          showDiff={showDiff}
          diff={diff}
          documentData={documentData}
          renderMode={renderMode}
          onApplyDiffBlock={onApplyDiffBlock}
          onDeclineDiffBlock={onDeclineDiffBlock}
        />
        
        {renderMode === 'text' ? (
          // Raw text editing mode with diff support
          <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <TextModeRenderer
              displayContent={displayContent}
              fontSize={fontSize}
              showDiff={showDiff}
              diff={diff}
              isEditable={isEditable}
              onContentChange={handleContentChange}
            />
          </Box>
        ) : (
          // Word-like structured view (read-only in editable mode for better UX)
          <Box sx={{ position: 'relative', cursor: 'text', flex: 1, height: '100%' }}>
            <DocxRenderer
              documentData={documentData}
              renderMode={renderMode}
              fontSize={fontSize}
              displayContent={displayContent}
            />
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box 
      sx={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}
      data-diff-container // Help floating buttons find this container
    >
      {isEditable ? (
        renderEditableContent()
      ) : (
        <Box sx={{ position: 'relative' }}>
          <DiffOverlay
            showDiff={showDiff}
            diff={diff}
            documentData={documentData}
            renderMode={renderMode}
            onApplyDiffBlock={onApplyDiffBlock}
            onDeclineDiffBlock={onDeclineDiffBlock}
          />
          
          {renderMode === 'text' ? (
            <TextModeRenderer
              displayContent={displayContent}
              fontSize={fontSize}
              showDiff={showDiff}
              diff={diff}
              isEditable={false}
            />
          ) : (
            <DocxRenderer
              documentData={documentData}
              renderMode={renderMode}
              fontSize={fontSize}
              displayContent={displayContent}
            />
          )}
        </Box>
      )}
      
      {/* Microsoft Office-style document info - show for all view modes */}
      <DocumentInfo
        documentData={documentData}
        renderMode={renderMode}
        isEditable={isEditable}
      />
    </Box>
  );
}
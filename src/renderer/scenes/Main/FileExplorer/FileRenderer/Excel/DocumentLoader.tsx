import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Alert, IconButton, Tooltip } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { getUserTokenFromStore } from '@/utils/user';
import { ExcelDocumentData } from './types';
import { isSupportedExcelDocument, getCellCount } from './utils';

interface ExcelDocumentLoaderProps {
  node: FileNode;
  useEnhancedReader: boolean;
  hideControls?: boolean;
  onDocumentLoad: (data: ExcelDocumentData) => void;
  onError: (error: string) => void;
  onReaderTypeChange: (useEnhanced: boolean) => void;
}

export default function ExcelDocumentLoader({
  node,
  useEnhancedReader,
  hideControls = false,
  onDocumentLoad,
  onError,
  onReaderTypeChange
}: ExcelDocumentLoaderProps) {
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadDocument();
  }, [node.path, useEnhancedReader]);

  const loadDocument = async () => {
    const docInfo = isSupportedExcelDocument(node.name);
    if (!docInfo.isSupported) {
      const errorMsg = 'Excel document format not supported';
      setError(errorMsg);
      onError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (node.source === 'local') {
        // For local Excel files, try enhanced reader first, then fallback if needed
        if (useEnhancedReader) {
          console.log('[ExcelDocumentLoader] Attempting to read Excel document with enhanced reader:', node.path);
          
          // Check if the function exists
          if (typeof (window.electron as any).fileSystem.readExcelDocument !== 'function') {
            console.error('[ExcelDocumentLoader] readExcelDocument function not available, falling back to standard extractor');
            onReaderTypeChange(false); // Disable enhanced reader for future attempts
          } else {
            try {
              const result = await (window.electron as any).fileSystem.readExcelDocument(node.path);
              console.log('[ExcelDocumentLoader] Excel read result:', result);
            
              if (result.success && result.document) {
                const document = result.document;
                const cellCount = getCellCount(document.worksheets);
                
                // Generate HTML from structure for display
                let htmlContent = '';
                if (document.worksheets && document.worksheets.length > 0) {
                  const htmlResult = await (window.electron as any).fileSystem.excelStructureToHtml(document.worksheets);
                  if (htmlResult.success) {
                    htmlContent = htmlResult.html;
                  }
                }
                
                const processedData: ExcelDocumentData = {
                  worksheets: document.worksheets,
                  metadata: {
                    cellCount,
                    ...document.metadata
                  },
                  success: true,
                  type: 'excel'
                };
                
                onDocumentLoad(processedData);
                console.log('[ExcelDocumentLoader] Successfully loaded Excel using enhanced reader');
                setIsLoading(false);
                return;
              } else {
                const errorMsg = `Enhanced Excel reader failed: ${result.error}`;
                console.error('[ExcelDocumentLoader] Enhanced Excel reader failed:', result.error);
                setError(errorMsg);
                onError(errorMsg);
                
                // Don't fallback automatically, let user choose
                setIsLoading(false);
                return;
              }
            } catch (enhancedError: any) {
              console.error('[ExcelDocumentLoader] Enhanced Excel reader failed with error:', enhancedError);
              
              const errorMsg = `Enhanced reader failed: ${enhancedError.message}`;
              setError(errorMsg);
              onError(errorMsg);
              setIsLoading(false);
              return;
            }
          }
        }
        
        // If enhanced reader is disabled or failed, use the fallback extractor
        if (!useEnhancedReader) {
          console.log('[ExcelDocumentLoader] Using fallback document extractor for Excel:', node.path);
          const fallbackResult = await (window.electron as any).fileSystem.extractDocumentText(node.path);
          
          if (fallbackResult.success) {
            const cellCount = fallbackResult.text ? fallbackResult.text.split('\n').filter((line: string) => line.trim()).length : 0;
            const processedData: ExcelDocumentData = {
              worksheets: [], // No structure from fallback
              metadata: {
                cellCount,
                ...fallbackResult.metadata
              },
              success: true,
              type: 'excel'
            };
            
            onDocumentLoad(processedData);
            console.log('[ExcelDocumentLoader] Successfully loaded Excel using fallback extractor');
          } else {
            const errorMsg = `Fallback extractor failed: ${fallbackResult.error}`;
            setError(errorMsg);
            onError(errorMsg);
          }
        }
      } else if (node.source === 'remote' && node.workspaceId && node.fileDbId) {
        // For remote Excel files, try extraction handler for remote files
        const token = getUserTokenFromStore();
        if (!token) {
          const errorMsg = 'Authentication required for remote files';
          setError(errorMsg);
          onError(errorMsg);
          setIsLoading(false);
          return;
        }

        const result = await (window.electron as any).fileSystem.extractRemoteDocumentText({
          workspaceId: node.workspaceId,
          fileId: node.fileDbId,
          token: token,
          fileName: node.name
        });
        
        if (result.success) {
          const cellCount = result.text ? result.text.split('\n').filter((line: string) => line.trim()).length : 0;
          const processedData: ExcelDocumentData = {
            worksheets: [], // No structure from remote extraction
            metadata: {
              cellCount,
              ...result.metadata
            },
            success: true,
            type: 'excel'
          };
          
          onDocumentLoad(processedData);
          console.log('[ExcelDocumentLoader] Successfully loaded remote Excel file');
        } else {
          const errorMsg = `Failed to load remote Excel file: ${result.error}`;
          setError(errorMsg);
          onError(errorMsg);
        }
      } else {
        const errorMsg = 'Invalid file source or missing required information';
        setError(errorMsg);
        onError(errorMsg);
      }
    } catch (error: any) {
      const errorMsg = `Failed to load Excel document: ${error.message}`;
      console.error('[ExcelDocumentLoader] Error loading Excel document:', error);
      setError(errorMsg);
      onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight={200}
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="textSecondary">
          <FormattedMessage 
            id="excel.loading" 
            defaultMessage="Loading Excel document..." 
          />
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert 
          severity="error" 
          action={
            !hideControls && useEnhancedReader ? (
              <Tooltip title="Try basic text extraction instead">
                <IconButton
                  size="small"
                  onClick={() => onReaderTypeChange(false)}
                >
                  <Typography variant="caption">Try Fallback</Typography>
                </IconButton>
              </Tooltip>
            ) : null
          }
        >
          <Typography variant="body2">
            {error}
          </Typography>
          {!hideControls && (
            <Typography variant="caption" display="block" mt={1}>
              <FormattedMessage 
                id="excel.errorHint" 
                defaultMessage="Try using the fallback reader if the enhanced reader fails." 
              />
            </Typography>
          )}
        </Alert>
      </Box>
    );
  }

  return null;
}
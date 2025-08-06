import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Alert, IconButton, Tooltip } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { getUserTokenFromStore } from '@/utils/user';
import { DocumentData } from './types';
import { isSupportedDocument, getWordCount } from './utils';

interface DocumentLoaderProps {
  node: FileNode;
  useEnhancedReader: boolean;
  hideControls?: boolean;
  onDocumentLoad: (data: DocumentData) => void;
  onError: (error: string) => void;
  onReaderTypeChange: (useEnhanced: boolean) => void;
}

export default function DocumentLoader({
  node,
  useEnhancedReader,
  hideControls = false,
  onDocumentLoad,
  onError,
  onReaderTypeChange
}: DocumentLoaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const token = getUserTokenFromStore();

  const loadDocument = async () => {
    const docInfo = isSupportedDocument(node.name);
    if (!docInfo.isSupported) {
      const errorMsg = 'Document format not supported';
      setError(errorMsg);
      onError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (node.source === 'local') {
        // For local DOCX files, try enhanced reader first, then fallback if needed
        if (useEnhancedReader) {
          console.log('[DocumentLoader] Attempting to read DOCX document with enhanced reader:', node.path);
          
          // Check if the function exists
          if (typeof (window.electron as any).fileSystem.readDocxDocument !== 'function') {
            console.error('[DocumentLoader] readDocxDocument function not available, falling back to standard extractor');
            onReaderTypeChange(false); // Disable enhanced reader for future attempts
          } else {
                        try {
              const result = await (window.electron as any).fileSystem.readDocxDocument(node.path);
              console.log('[DocumentLoader] DOCX read result:', result);
            
              if (result.success && result.document) {
                const document = result.document;
                const wordCount = document.metadata?.words || getWordCount(document.content);
                
                // Generate HTML from structure for display
                let htmlContent = '';
                if (document.structure && document.structure.length > 0) {
                  const htmlResult = await (window.electron as any).fileSystem.structureToHtml(document.structure);
                  if (htmlResult.success) {
                    htmlContent = htmlResult.html;
                  }
                }
                
                const processedData = {
                  text: document.content,
                  structure: document.structure,
                  htmlContent: htmlContent,
                  metadata: {
                    wordCount,
                    ...document.metadata
                  },
                  success: true,
                  type: docInfo.type
                };
                
                onDocumentLoad(processedData);
                return; // Successfully loaded, exit function
              } else {
                // Enhanced reader returned failure, fall through to fallback
                console.log('[DocumentLoader] Enhanced DOCX reader failed:', result.error);
                throw new Error(`Enhanced reader failed: ${result.error}`);
              }
            } catch (enhancedError: any) {
              // Enhanced reader threw error or returned failure, try fallback
              console.log('[DocumentLoader] Enhanced DOCX reader failed with error, trying fallback extractor...', enhancedError.message);
              
              try {
                const fallbackResult = await (window.electron as any).fileSystem.extractDocumentText(node.path);
                
                if (fallbackResult.success) {
                  const wordCount = getWordCount(fallbackResult.text);
                  const processedData = {
                    text: fallbackResult.text,
                    structure: [], // No structure from fallback
                    htmlContent: '',
                    metadata: {
                      wordCount,
                      ...fallbackResult.metadata
                    },
                    success: true,
                    type: docInfo.type
                  };
                  
                  onDocumentLoad(processedData);
                  console.log('[DocumentLoader] Successfully loaded DOCX using fallback extractor');
                  return; // Successfully loaded with fallback
                } else {
                  throw new Error(`Fallback also failed: ${fallbackResult.error}`);
                }
              } catch (fallbackError: any) {
                console.error('[DocumentLoader] Both enhanced and fallback extraction failed:', fallbackError);
                
                // Check if this looks like a ZIP/DOCX format issue
                const isZipError = enhancedError.message?.includes('ZIP signature') || 
                                  enhancedError.message?.includes('zip file') ||
                                  enhancedError.message?.includes('truncated') ||
                                  fallbackError.message?.includes('ZIP signature') ||
                                  fallbackError.message?.includes('zip file');
                
                if (isZipError) {
                  const errorMsg = `This file doesn't appear to be a valid DOCX document. It may be corrupted, in an older format (like .doc), or not a Word document. Please try:\n• Opening the file in Microsoft Word and saving as .docx\n• Checking the file isn't corrupted\n• Verifying this is actually a Word document`;
                  setError(errorMsg);
                  onError(errorMsg);
                } else {
                  const errorMsg = `Failed to read document. Enhanced reader: ${enhancedError.message}. Fallback: ${fallbackError.message}`;
                  setError(errorMsg);
                  onError(errorMsg);
                }
                return;
              }
            }
          }
        }
        
        // If enhanced reader is disabled or failed, use the fallback extractor
        if (!useEnhancedReader) {
          console.log('[DocumentLoader] Using fallback document extractor for DOCX:', node.path);
          const fallbackResult = await (window.electron as any).fileSystem.extractDocumentText(node.path);
          
          if (fallbackResult.success) {
            const wordCount = getWordCount(fallbackResult.text);
            const processedData = {
              text: fallbackResult.text,
              structure: [], // No structure from fallback
              htmlContent: '',
              metadata: {
                wordCount,
                ...fallbackResult.metadata
              },
              success: true,
              type: docInfo.type
            };
            
            onDocumentLoad(processedData);
            console.log('[DocumentLoader] Successfully loaded DOCX using fallback extractor');
          } else {
            const errorMsg = `Fallback extractor failed: ${fallbackResult.error}`;
            setError(errorMsg);
            onError(errorMsg);
          }
        }
      } else if (node.source === 'remote' && node.workspaceId && node.fileDbId && token) {
        // For remote DOCX files, try extraction handler for remote files
        const result = await (window.electron as any).fileSystem.extractRemoteDocumentText({
          workspaceId: node.workspaceId,
          fileId: node.fileDbId,
          token: token,
          fileName: node.name
        });
        
        if (result.success) {
          const wordCount = getWordCount(result.text);
          const processedData = {
            text: result.text,
            metadata: {
              wordCount,
              ...result.metadata
            },
            success: true,
            type: docInfo.type
          };
          onDocumentLoad(processedData);
        } else {
          const errorMsg = result.error || 'Failed to extract remote DOCX text';
          setError(errorMsg);
          onError(errorMsg);
        }
      } else {
        const errorMsg = 'Invalid file source or missing required data';
        setError(errorMsg);
        onError(errorMsg);
      }
    } catch (err: any) {
      console.error('Error loading DOCX document:', err);
      const errorMsg = err.message || 'Failed to load DOCX document';
      setError(errorMsg);
      onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const docInfo = isSupportedDocument(node.name);
    if (docInfo.isSupported) {
      loadDocument();
    } else {
      const errorMsg = 'DOCX document format not supported';
      setError(errorMsg);
      onError(errorMsg);
    }
  }, [node, token, useEnhancedReader]);

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

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: 200,
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          <FormattedMessage id="file.preview.extracting" defaultMessage="Extracting DOCX document text..." />
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        
        {!hideControls && (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2 }}>
            <Tooltip title="Try Alternative Reader">
              <IconButton 
                onClick={() => {
                  onReaderTypeChange(!useEnhancedReader);
                  setError(null);
                  loadDocument();
                }}
                sx={{ 
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: 'primary.main'
                }}
              >
                {useEnhancedReader ? '⚡' : '📄'}
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    );
  }

  return null; // Document loaded successfully, parent will handle rendering
}
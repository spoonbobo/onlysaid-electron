import React, { useState, useEffect, CSSProperties } from 'react';
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  useTheme
} from '@mui/material';
import {
  Check as AcceptIcon,
  Close as DeclineIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { getUserTokenFromStore } from '@/utils/user';
import { CodeDiff, DiffBlock } from '@/utils/codeDiff';

interface DocxPreviewProps {
  node: FileNode;
  maxHeight?: number;
  fontSize?: number;
  hideControls?: boolean;
  isEditable?: boolean;
  onDocumentLoad?: (data: DocumentData) => void;
  onContentChange?: (content: string) => void;
  externalContent?: string;
  // Add diff props
  showDiff?: boolean;
  diff?: CodeDiff;
  onApplyDiffBlock?: (block: DiffBlock) => void;
  onDeclineDiffBlock?: (block: DiffBlock) => void;
  // External control props
  renderMode?: 'text' | 'html' | 'structured';
  useEnhancedReader?: boolean;
  onRenderModeChange?: (mode: 'text' | 'html' | 'structured') => void;
  onReaderTypeChange?: (useEnhanced: boolean) => void;
}

interface DocumentData {
  text: string;
  structure?: DocxElement[];
  htmlContent?: string;
  metadata?: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
    modified?: Date | string;
    created?: Date | string;
  };
  success: boolean;
  error?: string;
  type: string;
}

interface DocxElement {
  type: 'paragraph' | 'heading' | 'table' | 'image' | 'list';
  content: string;
  formatting?: DocxFormatting;
  level?: number;
  children?: DocxElement[];
}

interface DocxFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  pageBreak?: boolean;
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalFontSize, setInternalFontSize] = useState(14);
  const [editableContent, setEditableContent] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [internalRenderMode, setInternalRenderMode] = useState<'text' | 'html' | 'structured'>('structured');
  const [internalUseEnhancedReader, setInternalUseEnhancedReader] = useState(true);
  
  // Use external props if provided, otherwise use internal state
  const renderMode = externalRenderMode ?? internalRenderMode;
  const useEnhancedReader = externalUseEnhancedReader ?? internalUseEnhancedReader;
  
  // Helper functions to update render mode and reader type
  const updateRenderMode = (mode: 'text' | 'html' | 'structured') => {
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
  
  // Add state for diff display content
  const [diffDisplayContent, setDiffDisplayContent] = useState<string>('');

  // Use external font size if provided, otherwise use internal state
  const fontSize = externalFontSize ?? internalFontSize;
  
  // Get theme for dark mode styling
  const theme = useTheme();
  
  const token = getUserTokenFromStore();

  // Check if file is a supported DOCX document
  const isSupportedDocument = (fileName: string): { isSupported: boolean; type: string } => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    // Microsoft Office formats - specifically DOCX and DOC
    const officeExts = ['.docx', '.doc'];
    if (officeExts.includes(ext)) {
      return { isSupported: true, type: 'office' };
    }
    
    return { isSupported: false, type: 'unknown' };
  };

  // Get file size in human readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get word count estimate
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Estimate lines for an element (more accurate than character count)
  const estimateElementLines = (element: DocxElement): number => {
    if (!element.content.trim()) return 1;
    
    // Base calculation: assume ~80 characters per line (standard Word width)
    const CHARS_PER_LINE = 80;
    const baseLines = Math.ceil(element.content.length / CHARS_PER_LINE);
    
    switch (element.type) {
      case 'heading':
        // Headings typically use more space due to spacing
        return Math.max(2, baseLines + 1);
      
      case 'paragraph':
        // Paragraphs with normal spacing
        return Math.max(1, baseLines);
      
      case 'table':
        // Tables: estimate based on row count
        const rows = element.content.split('\n').length;
        return Math.max(3, rows + 2); // Extra space for table borders
      
      case 'list':
        // Lists: count items
        const items = element.content.split('\n').filter(item => item.trim()).length;
        return Math.max(items, baseLines);
      
      case 'image':
        // Images typically take several lines
        return 5;
      
      default:
        return Math.max(1, baseLines);
    }
  };

  const loadDocument = async () => {
    const docInfo = isSupportedDocument(node.name);
    if (!docInfo.isSupported) {
      setError('Document format not supported');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (node.source === 'local') {
        // For local DOCX files, try enhanced reader first, then fallback if needed
        if (useEnhancedReader) {
          console.log('[DocxPreview] Attempting to read DOCX document with enhanced reader:', node.path);
          
          // Check if the function exists
          if (typeof (window.electron as any).fileSystem.readDocxDocument !== 'function') {
            console.error('[DocxPreview] readDocxDocument function not available, falling back to standard extractor');
            updateUseEnhancedReader(false); // Disable enhanced reader for future attempts
          } else {
            const result = await (window.electron as any).fileSystem.readDocxDocument(node.path);
            console.log('[DocxPreview] DOCX read result:', result);
            
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
          
          setDocumentData(processedData);
          // Initialize editable content
          setEditableContent(processedData.text);
          setLastSavedContent(processedData.text);
          // Call onDocumentLoad callback if provided
          if (onDocumentLoad) {
            onDocumentLoad(processedData);
          }
        } else {
          // If enhanced DOCX reader fails, fallback to the generic document extractor
          console.log('[DocxPreview] Enhanced DOCX reader failed, trying fallback extractor...');
          
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
              
              setDocumentData(processedData);
              setEditableContent(processedData.text);
              setLastSavedContent(processedData.text);
              
              if (onDocumentLoad) {
                onDocumentLoad(processedData);
              }
              
              console.log('[DocxPreview] Successfully loaded DOCX using fallback extractor');
            } else {
              setError(`Enhanced reader failed: ${result.error}. Fallback also failed: ${fallbackResult.error}`);
            }
          } catch (fallbackError: any) {
            console.error('[DocxPreview] Fallback extraction also failed:', fallbackError);
            setError(`Both enhanced and fallback readers failed. Enhanced: ${result.error}. Fallback: ${fallbackError.message}`);
          }
        }
          }
        }
        
        // If enhanced reader is disabled or failed, use the fallback extractor
        if (!useEnhancedReader) {
          console.log('[DocxPreview] Using fallback document extractor for DOCX:', node.path);
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
            
            setDocumentData(processedData);
            setEditableContent(processedData.text);
            setLastSavedContent(processedData.text);
            
            if (onDocumentLoad) {
              onDocumentLoad(processedData);
            }
            
            console.log('[DocxPreview] Successfully loaded DOCX using fallback extractor');
          } else {
            setError(`Fallback extractor failed: ${fallbackResult.error}`);
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
          setDocumentData(processedData);
          // Initialize editable content
          setEditableContent(processedData.text);
          setLastSavedContent(processedData.text);
          // Call onDocumentLoad callback if provided
          if (onDocumentLoad) {
            onDocumentLoad(processedData);
          }
        } else {
          setError(result.error || 'Failed to extract remote DOCX text');
        }
      } else {
        setError('Invalid file source or missing required data');
      }
    } catch (err: any) {
      console.error('Error loading DOCX document:', err);
      setError(err.message || 'Failed to load DOCX document');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const docInfo = isSupportedDocument(node.name);
    if (docInfo.isSupported) {
      loadDocument();
    } else {
      setError('DOCX document format not supported');
    }
  }, [node, token]);

  // Use external content if provided, otherwise use internal state
  const displayContent = externalContent ?? editableContent;

  // Update internal content when external content changes
  useEffect(() => {
    if (externalContent !== undefined && externalContent !== editableContent) {
      setEditableContent(externalContent);
    }
  }, [externalContent]);

  // Create function to generate diff display content
  const createDiffDisplayContent = (originalContent: string, diff: CodeDiff) => {
    const lines = originalContent.split('\n');
    let result = [...lines];
    
    // Apply diff blocks to create a display version
    diff.blocks.forEach(block => {
      const removedLines = block.lines.filter(line => line.type === 'removed');
      const addedLines = block.lines.filter(line => line.type === 'added');
      
      // Replace lines in the result array for display purposes
      const startIdx = block.startLine - 1;
      const endIdx = block.endLine - 1;
      
      for (let i = startIdx; i <= endIdx && i < result.length; i++) {
        // Mark lines that will be changed
        result[i] = `[CHANGED] ${result[i]}`;
      }
    });
    
    return result.join('\n');
  };

  // Update diff display content when diff changes
  useEffect(() => {
    if (showDiff && diff && diff.hasChanges) {
      const diffContent = createDiffDisplayContent(displayContent, diff);
      setDiffDisplayContent(diffContent);
    } else {
      setDiffDisplayContent('');
    }
  }, [showDiff, diff, displayContent]);

  // Font size is now controlled externally via props from CopilotView

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
                  updateUseEnhancedReader(!useEnhancedReader);
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

  if (!documentData) {
    return (
      <Alert severity="warning">
        <FormattedMessage id="file.preview.noData" defaultMessage="No DOCX preview data available" />
      </Alert>
    );
  }

  // Calculate line positions for diff overlay
  const getLinePosition = (lineNumber: number) => {
    const lineHeight = fontSize * 1.5; // Approximate line height
    return (lineNumber - 1) * lineHeight + 20; // 20px padding offset
  };

  const renderDiffOverlay = () => {
    if (!showDiff || !diff || !diff.hasChanges) {
      return null;
    }

    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        {diff.blocks.map((block, blockIndex) => (
          <Box
            key={block.id}
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: getLinePosition(block.startLine),
              height: (block.endLine - block.startLine + 1) * fontSize * 1.5,
              border: '2px solid',
              borderColor: 'warning.main',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              borderRadius: 1,
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              p: 0.5,
              gap: 0.5
            }}
          >
            <Tooltip title="Apply Changes">
              <IconButton
                size="small"
                onClick={() => onApplyDiffBlock?.(block)}
                sx={{
                  backgroundColor: 'success.main',
                  color: 'success.contrastText',
                  '&:hover': {
                    backgroundColor: 'success.dark',
                  },
                  width: 24,
                  height: 24
                }}
              >
                <AcceptIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Decline Changes">
              <IconButton
                size="small"
                onClick={() => onDeclineDiffBlock?.(block)}
                sx={{
                  backgroundColor: 'error.main',
                  color: 'error.contrastText',
                  '&:hover': {
                    backgroundColor: 'error.dark',
                  },
                  width: 24,
                  height: 24
                }}
              >
                <DeclineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}
      </Box>
    );
  };

  const renderDiffHighlights = () => {
    if (!showDiff || !diff || !diff.hasChanges) {
      return null;
    }

    const lines = displayContent.split('\n');
    
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      let isInDiffBlock = false;
      let diffType: 'added' | 'removed' | 'unchanged' = 'unchanged';
      
      // Check if this line is part of any diff block
      for (const block of diff.blocks) {
        if (lineNumber >= block.startLine && lineNumber <= block.endLine) {
          isInDiffBlock = true;
          
          // Determine if this specific line is added, removed, or unchanged
          const blockLine = block.lines.find(l => l.lineNumber === lineNumber);
          if (blockLine) {
            diffType = blockLine.type;
          }
          break;
        }
      }
      
      const backgroundColor = isInDiffBlock 
        ? diffType === 'added' 
          ? 'rgba(76, 175, 80, 0.2)' // Light green for added lines
          : diffType === 'removed'
          ? 'rgba(244, 67, 54, 0.2)' // Light red for removed lines
          : 'rgba(255, 193, 7, 0.1)' // Light yellow for unchanged lines in diff blocks
        : 'transparent';
      
      return (
        <Box
          key={index}
          sx={{
            backgroundColor,
            padding: '2px 4px',
            margin: '1px 0',
            borderRadius: '2px',
            minHeight: fontSize * 1.5,
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            '&:hover': {
              backgroundColor: isInDiffBlock 
                ? backgroundColor 
                : theme.palette.action.hover
            }
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: `${fontSize}px`,
              fontFamily: 'monospace',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              width: '100%'
            }}
          >
            {line || '\u00A0'} {/* Non-breaking space for empty lines */}
          </Typography>
        </Box>
      );
    });
  };

  const getStyledDiffContent = (content: string, diff: CodeDiff) => {
    if (!showDiff || !diff.hasChanges) {
      return content;
    }
    
    // This is a simplified version - in a real implementation,
    // you might want to use a more sophisticated diff highlighting library
    return content;
  };

  const renderEditableContent = () => {
    if (!isEditable) {
      return null;
    }

    // For DOCX files, we want to show the structured view even when editable
    // Only switch to raw text editing if the user specifically chooses text mode
    return (
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {showDiff && renderDiffOverlay()}
        
        {renderMode === 'text' ? (
          // Raw text editing mode
          <textarea
            value={displayContent}
            onChange={handleContentChange}
            style={{
              width: '100%',
              flex: 1,
              fontSize: `${fontSize}px`,
              fontFamily: '"Times New Roman", Times, serif', // Keep Word font even in edit mode
              lineHeight: 1.15,
              border: 'none',
              outline: 'none',
              resize: 'none',
              backgroundColor: 'transparent',
              color: theme.palette.text.primary,
              padding: '16px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
            placeholder="DOCX content will appear here..."
          />
        ) : (
          // Word-like structured view (read-only in editable mode for better UX)
          <Box sx={{ position: 'relative', cursor: 'text', flex: 1, height: '100%' }}>
            {renderContent()}
          </Box>
        )}
      </Box>
    );
  };

  const renderStructuredContent = () => {
    if (!documentData?.structure) {
      return renderTextContent();
    }

    // More accurate page grouping based on Office document standards
    const pages: DocxElement[][] = [];
    let currentPage: DocxElement[] = [];
    let currentPageLines = 0;
    
    // Office standards: ~50-55 lines per page with 1" margins, 11pt font
    const LINES_PER_PAGE = 50;
    
    for (const element of documentData.structure) {
      // Explicit page break - always respect these
      if (element.formatting?.pageBreak && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [element];
        currentPageLines = estimateElementLines(element);
      } 
      else {
        const elementLines = estimateElementLines(element);
        
        // Check if adding this element would exceed page limit
        if (currentPageLines + elementLines > LINES_PER_PAGE && currentPage.length > 0) {
          // Don't break in the middle of a heading or short paragraph
          if (element.type === 'heading' || 
              (element.type === 'paragraph' && element.content.length < 200)) {
            // Start new page with this element
            pages.push(currentPage);
            currentPage = [element];
            currentPageLines = elementLines;
          } else {
            // Add to current page if it's a long content block
            currentPage.push(element);
            currentPageLines += elementLines;
          }
        } else {
          currentPage.push(element);
          currentPageLines += elementLines;
        }
      }
    }
    
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    // Fallback: if no structure, put everything on one page
    if (pages.length === 0 && documentData.structure.length > 0) {
      pages.push(documentData.structure);
    }

    return (
      <Box sx={{ 
        p: 3,
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.grey[900] 
          : theme.palette.grey[50], // Office-like workspace background that respects dark mode
        minHeight: '100%',
        display: 'block',
        overflow: 'auto'
      }}>


        {/* Pages */}
        {pages.map((page, pageIndex) => (
          <Box
            key={pageIndex}
            sx={{
              // Enhanced Microsoft Word page styling
              backgroundColor: theme.palette.background.paper,
              minHeight: pages.length > 1 ? '11in' : 'auto', // Only enforce page height if multiple pages
              width: '100%', // Use full width instead of fixed width
              maxWidth: '8.5in', // Max width for readability
              margin: '0 auto 30px auto', // Increased spacing between pages
              padding: '20px', // Simplified padding
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 4px 20px rgba(0,0,0,0.3)' 
                : '0 4px 20px rgba(0,0,0,0.15)', // Enhanced shadow
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '4px', // Slightly more rounded
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: `${fontSize}px`,
              lineHeight: 1.15,
              position: 'relative',
              transition: 'box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 6px 25px rgba(0,0,0,0.4)' 
                  : '0 6px 25px rgba(0,0,0,0.2)'
              },
              '@media print': {
                boxShadow: 'none',
                border: 'none',
                margin: 0,
                borderRadius: 0,
                maxWidth: 'none',
                width: '8.5in'
              }
            }}
          >
            {/* Page header - show page number at top for multi-page docs */}
            {pages.length > 1 && (
              <>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '10px',
                    right: '20px',
                    fontSize: '11px',
                    color: theme.palette.text.disabled,
                    fontFamily: '"Times New Roman", Times, serif',
                    userSelect: 'none'
                  }}
                >
                  {pageIndex + 1}
                </Box>
                
                {/* Page separator line for visual clarity */}
                {pageIndex > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: '20px',
                      right: '20px',
                      height: '1px',
                      backgroundColor: theme.palette.divider,
                      opacity: 0.3
                    }}
                  />
                )}
              </>
            )}
            
            {/* Page content */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              {page.map((element, elementIndex) => renderDocxElement(element, elementIndex + pageIndex * 1000))}
            </Box>

            {/* Page footer - enhanced page numbering */}
            {pages.length > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  color: theme.palette.text.secondary,
                  fontFamily: '"Times New Roman", Times, serif',
                  textAlign: 'center',
                  userSelect: 'none',
                  borderTop: `1px solid ${theme.palette.divider}`,
                  paddingTop: '8px',
                  width: '200px'
                }}
              >
                Page {pageIndex + 1} of {pages.length}
              </Box>
            )}

            {/* Page break indicator for development */}
            {pageIndex < pages.length - 1 && process.env.NODE_ENV === 'development' && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '8px',
                  color: theme.palette.warning.main,
                  backgroundColor: theme.palette.background.paper,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: `1px solid ${theme.palette.warning.main}`,
                  opacity: 0.7,
                  userSelect: 'none'
                }}
              >
                PAGE BREAK
              </Box>
            )}
          </Box>
        ))}


      </Box>
    );
  };

  const renderDocxElement = (element: DocxElement, index: number) => {
    // Enhanced Microsoft Word-like styling
    const elementStyle: CSSProperties = {
      fontSize: element.formatting?.fontSize ? `${element.formatting.fontSize * (fontSize / 12)}px` : `${fontSize}px`,
      fontWeight: element.formatting?.bold ? 'bold' : 'normal',
      fontStyle: element.formatting?.italic ? 'italic' : 'normal',
      textDecoration: element.formatting?.underline ? 'underline' : 'none',
      fontFamily: element.formatting?.fontFamily || '"Times New Roman", Times, serif', // Default to Times New Roman like Word
      color: element.formatting?.color || theme.palette.text.primary,
      textAlign: element.formatting?.alignment as any || 'left',
      marginBottom: '12px', // Standard Word paragraph spacing
      lineHeight: 1.6, // Better line height for readability
      wordBreak: 'break-word',
      hyphens: 'auto'
    };

    // Add page break styling if needed
    if (element.formatting?.pageBreak) {
      elementStyle.pageBreakBefore = 'always';
      elementStyle.borderTop = '1px dashed #ccc';
      elementStyle.paddingTop = '20px';
      elementStyle.marginTop = '20px';
    }

    switch (element.type) {
      case 'heading':
        const level = element.level || 1;
        
        // Microsoft Word heading styles
        const headingStyles = {
          1: { fontSize: '20px', fontWeight: 'bold', marginBottom: '18px', marginTop: '24px' },
          2: { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', marginTop: '20px' },
          3: { fontSize: '16px', fontWeight: 'bold', marginBottom: '14px', marginTop: '18px' },
          4: { fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', marginTop: '16px' },
          5: { fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', marginTop: '14px' },
          6: { fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', marginTop: '12px' },
        };
        
        const headingStyle = {
          ...elementStyle,
          ...headingStyles[level as keyof typeof headingStyles] || headingStyles[1],
        };
        
        switch (level) {
          case 1:
            return <h1 key={index} style={headingStyle}>{element.content}</h1>;
          case 2:
            return <h2 key={index} style={headingStyle}>{element.content}</h2>;
          case 3:
            return <h3 key={index} style={headingStyle}>{element.content}</h3>;
          case 4:
            return <h4 key={index} style={headingStyle}>{element.content}</h4>;
          case 5:
            return <h5 key={index} style={headingStyle}>{element.content}</h5>;
          case 6:
            return <h6 key={index} style={headingStyle}>{element.content}</h6>;
          default:
            return <h1 key={index} style={headingStyle}>{element.content}</h1>;
        }
      
      case 'paragraph':
        return (
          <Typography
            key={index}
            component="p"
            sx={elementStyle}
          >
            {element.content}
          </Typography>
        );
      
      case 'table':
        // Enhanced table rendering similar to Word
        const tableRows = element.content.split('\n').filter(row => row.trim());
        return (
          <Box 
            key={index}
            sx={{ 
              mb: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 0, // Word tables have sharp corners
              overflow: 'hidden'
            }}
          >
            <table 
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: elementStyle.fontFamily,
                fontSize: elementStyle.fontSize,
                backgroundColor: theme.palette.background.paper
              }}
            >
              <tbody>
                {tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.split(' | ').map((cell, cellIndex) => (
                      <td 
                        key={cellIndex}
                        style={{
                          border: '1px solid #ccc',
                          padding: '8px 12px',
                          textAlign: 'left',
                          verticalAlign: 'top',
                          backgroundColor: rowIndex === 0 ? theme.palette.grey[50] : 'transparent' // Header row styling
                        }}
                      >
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        );
      
      case 'list':
        // Enhanced list rendering with proper Word-like styling
        const listItems = element.content.split('\n').filter(item => item.trim());
        return (
          <Box key={index} sx={{ mb: 2, pl: 2 }}>
            {listItems.map((item, itemIndex) => (
              <Box 
                key={itemIndex}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  mb: 0.5,
                  fontFamily: elementStyle.fontFamily,
                  fontSize: elementStyle.fontSize,
                  lineHeight: elementStyle.lineHeight
                }}
              >
                <Typography 
                  component="span" 
                  sx={{ 
                    mr: 1, 
                    minWidth: '20px',
                    color: theme.palette.text.primary
                  }}
                >
                  •
                </Typography>
                <Typography 
                  component="span"
                  sx={{
                    ...elementStyle,
                    marginBottom: 0,
                    textIndent: 0
                  }}
                >
                  {item.replace(/^•\s*/, '')}
                </Typography>
              </Box>
            ))}
          </Box>
        );
      
      case 'image':
        return (
          <Paper key={index} sx={{ p: 1, mb: 1, backgroundColor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary">Image:</Typography>
            <Typography sx={elementStyle}>{element.content}</Typography>
          </Paper>
        );
      
      default:
        return (
          <Typography key={index} sx={elementStyle}>
            {element.content}
          </Typography>
        );
    }
  };

  const renderHtmlContent = () => {
    if (!documentData?.htmlContent) {
      return renderTextContent();
    }

    return (
      <Box 
        sx={{ 
          p: 2, 
          fontSize: `${fontSize}px`,
          height: '100%',
          overflow: 'auto',
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
        }}
        dangerouslySetInnerHTML={{ __html: documentData.htmlContent }}
      />
    );
  };

  const renderTextContent = () => {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          height: '100%',
          overflow: 'auto'
        }}
      >
        {showDiff && diff ? (
          <Box sx={{ position: 'relative' }}>
            {renderDiffHighlights()}
          </Box>
        ) : (
          <Typography
            component="pre"
            sx={{
              fontSize: `${fontSize}px`,
              fontFamily: 'monospace',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
              color: theme.palette.text.primary
            }}
          >
            {displayContent}
          </Typography>
        )}
      </Paper>
    );
  };

  const renderContent = () => {
    switch (renderMode) {
      case 'structured':
        return renderStructuredContent();
      case 'html':
        return renderHtmlContent();
      case 'text':
      default:
        return renderTextContent();
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
      {isEditable ? (
        renderEditableContent()
      ) : (
        <Box sx={{ position: 'relative' }}>
          {showDiff && renderDiffOverlay()}
          {renderContent()}
        </Box>
      )}
    </Box>
  );
}

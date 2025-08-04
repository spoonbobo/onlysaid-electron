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
  renderMode?: 'text' | 'view';
  useEnhancedReader?: boolean;
  onRenderModeChange?: (mode: 'text' | 'view') => void;
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
  const [internalRenderMode, setInternalRenderMode] = useState<'text' | 'view'>('view');
  const [internalUseEnhancedReader, setInternalUseEnhancedReader] = useState(true);
  
  // Use external props if provided, otherwise use internal state
  const renderMode = externalRenderMode ?? internalRenderMode;
  const useEnhancedReader = externalUseEnhancedReader ?? internalUseEnhancedReader;
  
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



  // Update diff display content when diff changes (for view mode)
  useEffect(() => {
    if (showDiff && diff && diff.hasChanges && renderMode === 'view') {
      // For view mode, we'll handle diff display differently
      setDiffDisplayContent('');
    } else {
      setDiffDisplayContent('');
    }
  }, [showDiff, diff, displayContent, renderMode]);

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

  // Calculate line positions for diff overlay based on render mode
  const getLinePosition = (lineNumber: number) => {
    if (renderMode === 'text') {
      // Text mode: uniform line height calculation
      const lineHeight = fontSize * 1.6; // Match textarea line height
      return (lineNumber - 1) * lineHeight + 16; // 16px padding offset for textarea
    } else {
      // View mode: need to map line numbers to actual document elements
      // This is more complex because elements have variable heights
      return mapLineToViewPosition(lineNumber);
    }
  };

  // Map line numbers to actual positions in view mode
  const mapLineToViewPosition = (lineNumber: number) => {
    if (!documentData?.structure) {
      const lineHeight = fontSize * 1.6;
      return (lineNumber - 1) * lineHeight + 20;
    }

    // Calculate cumulative height based on document structure
    let currentLine = 1;
    let cumulativeHeight = 0;
    
    for (const element of documentData.structure) {
      const elementLines = Math.ceil(element.content.length / 80) || 1; // Estimate lines per element
      const elementHeight = getElementHeight(element);
      
      if (lineNumber >= currentLine && lineNumber <= currentLine + elementLines - 1) {
        // Line is within this element
        const relativeLinePosition = lineNumber - currentLine;
        const lineHeightInElement = elementHeight / elementLines;
        return cumulativeHeight + (relativeLinePosition * lineHeightInElement) + 20; // 20px page padding
      }
      
      currentLine += elementLines;
      cumulativeHeight += elementHeight;
      
      if (currentLine > lineNumber) break;
    }
    
    return cumulativeHeight + 20;
  };

  // Get the visual height of a document element
  const getElementHeight = (element: DocxElement): number => {
    const baseLineHeight = fontSize * 1.6;
    
    switch (element.type) {
      case 'heading':
        const level = element.level || 1;
        const headingMultipliers = { 1: 2.0, 2: 1.8, 3: 1.6, 4: 1.4, 5: 1.2, 6: 1.1 };
        return baseLineHeight * (headingMultipliers[level as keyof typeof headingMultipliers] || 1.5) + 24; // Extra margin for headings
      case 'paragraph':
        const lines = Math.ceil(element.content.length / 80) || 1;
        return (baseLineHeight * lines) + 12; // Standard paragraph spacing
      case 'table':
        const tableRows = element.content.split('\n').length;
        return (baseLineHeight * tableRows) + 16; // Table row height
      case 'list':
        const listItems = element.content.split('\n').length;
        return (baseLineHeight * listItems) + 8; // List item spacing
      default:
        return baseLineHeight + 12;
    }
  };

  const renderDiffOverlay = () => {
    if (!showDiff || !diff || !diff.hasChanges) {
      return null;
    }

    // Only show diff overlay in text mode, not in view mode
    if (renderMode === 'text') {
      return renderTextModeDiffOverlay();
    } else {
      // No diff overlay in view mode - diff is handled inline in the content
      return null;
    }
  };

  // Diff overlay for text mode - only show apply/decline buttons, no highlighting
  const renderTextModeDiffOverlay = () => {
    if (!showDiff || !diff) return null;

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
        {diff.blocks.map((block) => {
          // Position buttons at the first line of each diff block
          const startLinePosition = (block.startLine - 1) * fontSize * 1.6 + 16; // 16px for padding
          
          return (
            <Box
              key={block.id}
              sx={{
                position: 'absolute',
                top: startLinePosition,
                right: 8,
                display: 'flex',
                gap: 0.5,
                pointerEvents: 'auto',
                zIndex: 3
              }}
            >
              <IconButton
                size="small"
                onClick={() => onApplyDiffBlock?.(block)}
                sx={{
                  backgroundColor: '#2ea043',
                  color: 'white',
                  '&:hover': { backgroundColor: '#2c974b' },
                  width: 18,
                  height: 18,
                  minWidth: 18,
                  borderRadius: '3px',
                  boxShadow: 2
                }}
              >
                <AcceptIcon sx={{ fontSize: 11 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDeclineDiffBlock?.(block)}
                sx={{
                  backgroundColor: '#f85149',
                  color: 'white',
                  '&:hover': { backgroundColor: '#e5484d' },
                  width: 18,
                  height: 18,
                  minWidth: 18,
                  borderRadius: '3px',
                  boxShadow: 2
                }}
              >
                <DeclineIcon sx={{ fontSize: 11 }} />
              </IconButton>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Diff overlay for structured view mode
  const renderViewModeDiffOverlay = () => {
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
        {diff!.blocks.map((block) => {
          const topPosition = getLinePosition(block.startLine);
          const bottomPosition = getLinePosition(block.endLine + 1);
          const blockHeight = Math.max(bottomPosition - topPosition, fontSize * 1.6);
          
          return (
            <Box
              key={block.id}
              sx={{
                position: 'absolute',
                left: '50px', // Account for page margins
                right: '50px',
                top: topPosition,
                height: blockHeight,
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
                    '&:hover': { backgroundColor: 'success.dark' },
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
                    '&:hover': { backgroundColor: 'error.dark' },
                    width: 24,
                    height: 24
                  }}
                >
                  <DeclineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
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

  // Create function to generate diff display content for text mode
  const createDiffDisplayContent = (originalContent: string, diff: CodeDiff) => {
    const originalLines = originalContent.split('\n');
    const result: string[] = [];
    let currentLineIndex = 0;
    
    // Sort blocks by start line
    const sortedBlocks = [...diff.blocks].sort((a, b) => a.startLine - b.startLine);
    
    for (const block of sortedBlocks) {
      // Add original lines before this block
      while (currentLineIndex < block.startLine - 1) {
        result.push(originalLines[currentLineIndex]);
        currentLineIndex++;
      }
      
      // Add diff lines from this block
      for (const line of block.lines) {
        if (line.type === 'removed') {
          result.push(`- ${line.content}`);
        } else if (line.type === 'added') {
          result.push(`+ ${line.content}`);
        }
      }
      
      // Skip the original lines that were replaced
      currentLineIndex = block.endLine;
    }
    
    // Add remaining original lines
    while (currentLineIndex < originalLines.length) {
      result.push(originalLines[currentLineIndex]);
      currentLineIndex++;
    }
    
    return result.join('\n');
  };

  // Add function to apply line styling for text mode diff display
  const getStyledDiffLines = (content: string, diff: CodeDiff) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('- ')) {
        return { content: line, type: 'removed', index };
      } else if (line.startsWith('+ ')) {
        return { content: line, type: 'added', index };
      }
      return { content: line, type: 'normal', index };
    });
  };

  // Render text mode content with diff support
  const renderTextModeContent = () => {
    if (showDiff && diff && diff.hasChanges) {
      // Show styled diff view
      const diffContent = createDiffDisplayContent(displayContent, diff);
      const styledLines = getStyledDiffLines(diffContent, diff);
      
      return (
        <Box
          sx={{
            width: '100%',
            flex: 1,
            fontSize: `${fontSize}px`,
            lineHeight: 1.6,
            fontFamily: '"Times New Roman", Times, serif',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: theme.palette.text.primary,
            padding: '16px',
            margin: 0,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            cursor: 'default',
            position: 'relative'
          }}
        >
          {styledLines.map((line, index) => (
            <Box
              key={index}
              sx={{
                minHeight: `${fontSize * 1.6}px`,
                display: 'block',
                backgroundColor: 
                  line.type === 'added' ? 'rgba(46, 160, 67, 0.2)' :
                  line.type === 'removed' ? 'rgba(248, 81, 73, 0.2)' : 
                  'transparent',
                borderLeft: line.type !== 'normal' ? '3px solid' : 'none',
                borderLeftColor:
                  line.type === 'added' ? '#2ea043' :
                  line.type === 'removed' ? '#f85149' : 'transparent',
                color:
                  line.type === 'added' ? '#2ea043' :
                  line.type === 'removed' ? '#f85149' : theme.palette.text.primary,
                fontWeight: line.type !== 'normal' ? 'bold' : 'normal',
                paddingLeft: line.type !== 'normal' ? '8px' : '0px'
              }}
            >
              {line.content}
            </Box>
          ))}
        </Box>
      );
    }
    
    // Normal text editing when not showing diff
    return (
      <textarea
        value={displayContent}
        onChange={handleContentChange}
        style={{
          width: '100%',
          flex: 1,
          fontSize: `${fontSize}px`,
          fontFamily: '"Times New Roman", Times, serif',
          lineHeight: 1.6, // Match the diff view line height
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
    );
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
          // Raw text editing mode with diff support
          <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {renderTextModeContent()}
          </Box>
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
            <Box sx={{ 
              position: 'relative', 
              zIndex: 1,
              paddingLeft: renderMode === 'view' ? '70px' : '0px', // Add space for element info in view mode
              transition: 'padding-left 0.2s ease'
            }}>
              {page.map((element, elementIndex) => {
                const globalIndex = elementIndex + pageIndex * 1000;
                return (
                  <Box 
                    key={globalIndex}
                    sx={{ 
                      position: 'relative',
                      '&:hover .element-label': {
                        opacity: 0.7
                      }
                    }}
                  >

                    {renderDocxElement(element, globalIndex)}
                  </Box>
                );
              })}
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

    // Helper function to create element info text
    const getElementInfo = (element: DocxElement, index: number): string => {
      switch (element.type) {
        case 'heading':
          return `H${element.level || 1}[${index}]`;
        case 'paragraph':
          return `P[${index}]`;
        case 'table':
          return `T[${index}]`;
        case 'list':
          return `L[${index}]`;
        case 'image':
          return `I[${index}]`;
        default:
          return `E[${index}]`;
      }
    };

    // Helper function to wrap element with info text in view mode
    const wrapWithInfo = (content: React.ReactNode, element: DocxElement, index: number) => {
      if (renderMode !== 'view') {
        return content;
      }
      
      return (
        <Box sx={{ position: 'relative', '&:hover .element-info': { opacity: 1 } }}>
          <Box
            className="element-info"
            sx={{
              position: 'absolute',
              left: -60,
              top: 0,
              fontSize: '10px',
              color: 'text.secondary',
              opacity: 0.3,
              transition: 'opacity 0.2s ease',
              fontFamily: 'monospace',
              minWidth: '50px',
              textAlign: 'right',
              paddingRight: '8px',
              userSelect: 'none',
              zIndex: 1
            }}
          >
            {getElementInfo(element, index)}
          </Box>
          {content}
        </Box>
      );
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
            return wrapWithInfo(
              <h1 key={index} style={headingStyle}>
                {element.content}
              </h1>,
              element,
              index
            );
          case 2:
            return wrapWithInfo(
              <h2 key={index} style={headingStyle}>
                {element.content}
              </h2>,
              element,
              index
            );
          case 3:
            return wrapWithInfo(
              <h3 
                key={index} 
                style={headingStyle}
              >
                {element.content}
              </h3>,
              element,
              index
            );
          case 4:
            return wrapWithInfo(
              <h4 
                key={index} 
                style={headingStyle}
              >
                {element.content}
              </h4>,
              element,
              index
            );
          case 5:
            return wrapWithInfo(
              <h5 
                key={index} 
                style={headingStyle}
              >
                {element.content}
              </h5>,
              element,
              index
            );
          case 6:
            return wrapWithInfo(
              <h6 
                key={index} 
                style={headingStyle}
              >
                {element.content}
              </h6>,
              element,
              index
            );
          default:
            return wrapWithInfo(
              <h1 
                key={index} 
                style={headingStyle}
              >
                {element.content}
              </h1>,
              element,
              index
            );
        }
      
      case 'paragraph':
        return wrapWithInfo(
          <Typography
            key={index}
            component="p"
            sx={elementStyle}
          >
            {element.content}
          </Typography>,
          element,
          index
        );
      
      case 'table':
        // Enhanced table rendering similar to Word
        const tableRows = element.content.split('\n').filter(row => row.trim());
        return wrapWithInfo(
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
          </Box>,
          element,
          index
        );
      
      case 'list':
        // Enhanced list rendering with proper Word-like styling
        const listItems = element.content.split('\n').filter(item => item.trim());
        return wrapWithInfo(
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
          </Box>,
          element,
          index
        );
      
      case 'image':
        return wrapWithInfo(
          <Paper key={index} sx={{ p: 1, mb: 1, backgroundColor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary">Image:</Typography>
            <Typography sx={elementStyle}>{element.content}</Typography>
          </Paper>,
          element,
          index
        );
      
      default:
        return wrapWithInfo(
          <Typography key={index} sx={elementStyle}>
            {element.content}
          </Typography>,
          element,
          index
        );
    }
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
      case 'view':
        return renderStructuredContent();
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
      
      {/* Microsoft Office-style document info - show for all view modes */}
      {documentData && !isEditable && (
        <Box
          sx={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(0, 0, 0, 0.8)' 
              : 'rgba(255, 255, 255, 0.9)',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '12px',
            color: theme.palette.text.primary,
            fontFamily: '"Segoe UI", system-ui, sans-serif',
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 2px 8px rgba(0,0,0,0.5)' 
              : '0 2px 8px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(8px)',
            userSelect: 'none',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {/* Document icon */}
          <Box sx={{ 
            fontSize: '14px', 
            color: theme.palette.primary.main,
            display: 'flex',
            alignItems: 'center'
          }}>
            📄
          </Box>
          
          <Typography variant="caption" sx={{ fontSize: '12px', fontWeight: 500 }}>
            {renderMode === 'view' && documentData?.structure ? (
              // For view mode, show calculated pages
              (() => {
                const pages: any[][] = [];
                let currentPage: any[] = [];
                let currentPageLines = 0;
                const LINES_PER_PAGE = 50;
                
                for (const element of documentData.structure) {
                  const elementLines = Math.ceil(element.content.length / 80);
                  if (currentPageLines + elementLines > LINES_PER_PAGE && currentPage.length > 0) {
                    pages.push(currentPage);
                    currentPage = [element];
                    currentPageLines = elementLines;
                  } else {
                    currentPage.push(element);
                    currentPageLines += elementLines;
                  }
                }
                if (currentPage.length > 0) pages.push(currentPage);
                
                const pageCount = Math.max(pages.length, 1);
                return `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`;
              })()
            ) : (
              // For text view, estimate pages from text length
              (() => {
                const textLength = documentData.text?.length || 0;
                const estimatedPages = Math.max(Math.ceil(textLength / 2500), 1); // ~2500 chars per page
                return `~${estimatedPages} ${estimatedPages === 1 ? 'page' : 'pages'}`;
              })()
            )}
            {documentData?.metadata?.wordCount && (
              <span style={{ opacity: 0.7, marginLeft: '8px' }}>
                • {documentData.metadata.wordCount.toLocaleString()} words
              </span>
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

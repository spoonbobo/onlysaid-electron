import React, { useState, useEffect } from 'react';
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
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Check as AcceptIcon,
  Close as DeclineIcon
} from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';
import { FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { getUserTokenFromStore } from '@/utils/user';
import { CodeDiff, DiffBlock } from '@/utils/codeDiff';

interface TextPreviewProps {
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
}

interface DocumentData {
  text: string;
  metadata?: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
  };
  success: boolean;
  error?: string;
  type: string;
}

export default function TextPreview({ 
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
  onDeclineDiffBlock
}: TextPreviewProps) {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalFontSize, setInternalFontSize] = useState(14);
  const [editableContent, setEditableContent] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');
  
  // Add state for diff display content
  const [diffDisplayContent, setDiffDisplayContent] = useState<string>('');

  // Use external font size if provided, otherwise use internal state
  const fontSize = externalFontSize ?? internalFontSize;
  
  // Get theme for dark mode styling
  const theme = useTheme();
  
  const token = getUserTokenFromStore();

  // Check if file is a supported text document
  const isSupportedTextDocument = (fileName: string): { isSupported: boolean; type: string } => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    // Text formats
    const textExts = ['.txt', '.md', '.markdown', '.csv'];
    if (textExts.includes(ext)) {
      return { isSupported: true, type: 'text' };
    }
    
    // PDF format (text extraction)
    if (ext === '.pdf') {
      return { isSupported: true, type: 'pdf' };
    }
    
    // OpenDocument text formats (text extraction)
    const odTextExts = ['.odt', '.ods', '.odp'];
    if (odTextExts.includes(ext)) {
      return { isSupported: true, type: 'opendocument' };
    }
    
    // Rich text and web formats
    const richTextExts = ['.rtf', '.html', '.htm', '.xml'];
    if (richTextExts.includes(ext)) {
      return { isSupported: true, type: 'richtext' };
    }
    
    // Legacy Office formats (Excel/PowerPoint only - Word is handled by DocxPreview)
    const legacyOfficeExts = ['.xlsx', '.xls', '.pptx', '.ppt'];
    if (legacyOfficeExts.includes(ext)) {
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



  const loadDocument = async () => {
    const docInfo = isSupportedTextDocument(node.name);
    if (!docInfo.isSupported) {
      setError('Document format not supported');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (node.source === 'local') {
        // For local files, use the document extraction handler
        const result = await (window.electron as any).fileSystem.extractDocumentText(node.path);
        
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
          setError(result.error || 'Failed to extract document text');
        }
      } else if (node.source === 'remote' && node.workspaceId && node.fileDbId && token) {
        // For remote files, we might need to download and then extract
        // For now, let's try reading as text and see if it works
        const response = await window.electron.fileSystem.readTextFile({
          workspaceId: node.workspaceId,
          fileId: node.fileDbId,
          token: token
        });

        if (response.success && response.content) {
          const wordCount = getWordCount(response.content);
          const processedData = {
            text: response.content,
            metadata: {
              wordCount
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
          // If direct text reading fails, try using the extraction handler for remote files
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
            setError(result.error || 'Failed to extract document text');
          }
        }
      } else {
        setError('Invalid file source or missing required data');
      }
    } catch (err: any) {
      console.error('Error loading document:', err);
      setError(err.message || 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const docInfo = isSupportedTextDocument(node.name);
    if (docInfo.isSupported) {
      loadDocument();
    } else {
      setError('Document format not supported');
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

  // Update the display content when diff changes
  useEffect(() => {
    if (showDiff && diff) {
      const newDiffContent = createDiffDisplayContent(displayContent, diff);
      setDiffDisplayContent(newDiffContent);
    } else {
      setDiffDisplayContent('');
    }
  }, [showDiff, diff, displayContent]);

  const handleFontSizeIncrease = () => setInternalFontSize(prev => Math.min(prev + 2, 24));
  const handleFontSizeDecrease = () => setInternalFontSize(prev => Math.max(prev - 2, 10));

  // Handle content changes in editable mode
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEditableContent(newContent);
    if (onContentChange) {
      onContentChange(newContent);
    }
  };
  
  const handleCopyText = async () => {
    if (documentData?.text) {
      try {
        await navigator.clipboard.writeText(documentData.text);
        // You might want to show a toast notification here
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  };

  const handleDownload = () => {
    if (documentData?.text) {
      const blob = new Blob([documentData.text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${node.name.substring(0, node.name.lastIndexOf('.'))}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };



  const docInfo = isSupportedTextDocument(node.name);

  if (!docInfo.isSupported) {
    return (
      <Alert severity="info">
        <FormattedMessage 
          id="file.preview.notSupported" 
          defaultMessage="Preview not supported for this file type" 
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
          <FormattedMessage id="file.preview.extracting" defaultMessage="Extracting document text..." />
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  if (!documentData) {
    return (
      <Alert severity="warning">
        <FormattedMessage id="file.preview.noData" defaultMessage="No preview data available" />
      </Alert>
    );
  }

  // Calculate line positions for diff overlay
  const getLinePosition = (lineNumber: number) => {
    const lineHeight = fontSize * 1.6;
    return (lineNumber - 1) * lineHeight;
  };

  // Render diff overlay
  const renderDiffOverlay = () => {
    if (!showDiff || !diff || !isEditable) return null;

    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 2,
          overflow: 'hidden'
        }}
      >
        {diff.blocks.map((block) => {
          const startLinePosition = (block.startLine - 1) * fontSize * 1.6;
          let currentPosition = startLinePosition;
          
          return (
            <Box key={block.id}>
              {block.lines.map((line, lineIndex) => {
                // Skip unchanged lines in the overlay
                if (line.type === 'unchanged') return null;
                
                const lineTop = currentPosition;
                // Move position down for next line (this creates the "pushing down" effect)
                currentPosition += fontSize * 1.6;
                
                return (
                  <Box
                    key={`${block.id}-${lineIndex}`}
                    sx={{
                      position: 'absolute',
                      top: lineTop,
                      left: 0,
                      right: 0,
                      height: fontSize * 1.6,
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  >
                    {/* Background highlight - only colored background, no white */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '100%',
                        bgcolor: 
                          line.type === 'added' ? 'rgba(46, 160, 67, 0.25)' :
                          line.type === 'removed' ? 'rgba(248, 81, 73, 0.25)' : 
                          'transparent',
                        borderLeft: 3,
                        borderLeftColor:
                          line.type === 'added' ? '#2ea043' :
                          line.type === 'removed' ? '#f85149' : 'transparent'
                      }}
                    />
                    
                    {/* Diff indicator - no white background */}
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.6,
                        color: 
                          line.type === 'added' ? '#2ea043' :
                          line.type === 'removed' ? '#f85149' : 'transparent',
                        fontWeight: 'bold',
                        minWidth: '20px',
                        paddingLeft: '4px',
                        zIndex: 2,
                        position: 'relative'
                      }}
                    >
                      {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ''}
                    </Typography>
                    
                    {/* Line content overlay - no white background */}
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.6,
                        color: 
                          line.type === 'added' ? '#2ea043' :
                          line.type === 'removed' ? '#f85149' : theme.palette.text.primary,
                        fontWeight: 'bold',
                        padding: '0 4px',
                        whiteSpace: 'pre',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 'calc(100% - 80px)', // Leave space for buttons
                        zIndex: 2,
                        position: 'relative',
                        // Add text shadow for better readability without white background
                        textShadow: 
                          line.type === 'added' ? '0 0 3px rgba(255,255,255,0.8)' :
                          line.type === 'removed' ? '0 0 3px rgba(255,255,255,0.8)' : 'none'
                      }}
                    >
                      {line.content}
                    </Typography>
                  </Box>
                );
              })}
              
              {/* Accept/Decline buttons positioned at the first line of each block */}
              <Box
                sx={{
                  position: 'absolute',
                  top: startLinePosition + 2,
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
                    bgcolor: '#2ea043', 
                    color: 'white',
                    '&:hover': { bgcolor: '#2c974b' },
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
                    bgcolor: '#f85149', 
                    color: 'white',
                    '&:hover': { bgcolor: '#e5484d' },
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

              {/* Create spacing for the lines that follow (push down effect) */}
              <Box
                sx={{
                  position: 'absolute',
                  top: currentPosition,
                  left: 0,
                  right: 0,
                  height: (block.lines.filter(l => l.type !== 'unchanged').length - 1) * fontSize * 1.6,
                  backgroundColor: 'transparent',
                  pointerEvents: 'none'
                }}
              />
            </Box>
          );
        })}
      </Box>
    );
  };

  // Create a simple overlay for highlighting and buttons only
  const renderDiffHighlights = () => {
    if (!showDiff || !diff || !isEditable) return null;

    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 2
        }}
      >
        {diff.blocks.map((block, blockIndex) => {
          // Calculate position based on the line number in the diff display
          let linePosition = 0;
          let lineCount = 0;
          
          // Count lines before this block
          for (let i = 0; i < blockIndex; i++) {
            const prevBlock = diff.blocks[i];
            lineCount += prevBlock.lines.filter(l => l.type !== 'unchanged').length;
          }
          
          linePosition = (block.startLine - 1 + lineCount) * fontSize * 1.6;
          
          return (
            <Box
              key={block.id}
              sx={{
                position: 'absolute',
                top: linePosition + 2,
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
                  bgcolor: '#2ea043', 
                  color: 'white',
                  '&:hover': { bgcolor: '#2c974b' },
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
                  bgcolor: '#f85149', 
                  color: 'white',
                  '&:hover': { bgcolor: '#e5484d' },
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

  // Add function to apply line styling
  const getStyledDiffContent = (content: string, diff: CodeDiff) => {
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

  // Update the renderDiffTextarea function
  const renderDiffTextarea = () => {
    const content = showDiff && diff ? diffDisplayContent : displayContent;
    
    // When showing diff, render the styled view
    if (showDiff && diff) {
      const styledLines = getStyledDiffContent(content, diff);
      
      return (
        <Box
          sx={{
            width: '100%',
            flex: 1,
            fontSize: `${fontSize}px`,
            lineHeight: 1.6,
            fontFamily: 'monospace',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: theme.palette.text.primary,
            padding: 0,
            margin: 0,
            paddingRight: hideControls ? 0 : '48px',
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
    
    // When not showing diff, use regular textarea
    return (
      <textarea
        value={displayContent}
        onChange={handleContentChange}
        style={{
          width: '100%',
          flex: 1,
          fontSize: `${fontSize}px`,
          lineHeight: 1.6,
          fontFamily: 'monospace',
          border: 'none',
          outline: 'none',
          resize: 'none',
          background: 'transparent',
          color: theme.palette.text.primary,
          padding: 0,
          margin: 0,
          paddingRight: hideControls ? 0 : '48px'
        }}
      />
    );
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
      {isEditable ? (
        // Editable mode - fill full height like Docx.tsx
        <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {renderDiffTextarea()}
          {showDiff && diff && renderDiffHighlights()}
        </Box>
      ) : (
        // Read-only mode with Paper container
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 3,
            minHeight: maxHeight ? maxHeight : '100%',
            bgcolor: 'background.paper',
            position: 'relative'
          }}
        >
          {!hideControls && (
            <Box 
              sx={{ 
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 0.5,
                bgcolor: 'background.paper',
                borderRadius: 1,
                boxShadow: 1,
                p: 0.5,
                zIndex: 1
              }}
            >
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
              
              <Tooltip title="Copy Text">
                <IconButton size="small" onClick={handleCopyText}>
                  <CopyIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Download as Text">
                <IconButton size="small" onClick={handleDownload}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          <Typography
            variant="body1"
            sx={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              wordBreak: 'break-word',
              pr: hideControls ? 0 : 12
            }}
          >
            {documentData.text}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

import React, { CSSProperties } from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import { DocumentData, DocxElement } from './types';
import { estimateElementLines, getElementHeight } from './utils';

interface DocxRendererProps {
  documentData: DocumentData;
  renderMode: 'text' | 'view';
  fontSize: number;
  displayContent: string;
}

export default function DocxRenderer({
  documentData,
  renderMode,
  fontSize,
  displayContent
}: DocxRendererProps) {
  const theme = useTheme();

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
                // Calculate proper global index across all pages
                let globalIndex = 0;
                for (let p = 0; p < pageIndex; p++) {
                  globalIndex += pages[p].length;
                }
                globalIndex += elementIndex;
                return (
                  <Box 
                    key={globalIndex}
                    sx={{ 
                      position: 'relative',
                      '&:hover .element-label': {
                        opacity: 0.7
                      }
                    }}
                    data-element-index={globalIndex} // Help floating buttons find elements by index
                    data-element-type={element.type}
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
        
        const HeadingComponent = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        
        return wrapWithInfo(
          <HeadingComponent key={index} style={headingStyle}>
            {element.content}
          </HeadingComponent>,
          element,
          index
        );
      
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

  return renderContent();
}
import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { DocumentData } from './types';

interface DocumentInfoProps {
  documentData: DocumentData;
  renderMode: 'text' | 'view';
  isEditable: boolean;
}

export default function DocumentInfo({
  documentData,
  renderMode,
  isEditable
}: DocumentInfoProps) {
  const theme = useTheme();

  if (isEditable) {
    return null; // Don't show info in editable mode
  }

  return (
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
  );
}
import React, { useEffect, useState, useRef } from 'react';
import { Box, IconButton, Paper, Chip } from '@mui/material';
import { Check as AcceptIcon, Close as DeclineIcon } from '@mui/icons-material';
import { CodeDiff, DiffBlock } from '@/utils/codeDiff';

interface OverlayDiffProps {
  diff: CodeDiff;
  fontSize: number;
  onApplyBlock: (block: DiffBlock) => void;
  onDeclineBlock: (block: DiffBlock) => void;
  onClose: () => void;
}

export default function OverlayDiff({
  diff,
  fontSize,
  onApplyBlock,
  onDeclineBlock,
  onClose
}: OverlayDiffProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate line height based on font size (similar to typical code editors)
  const lineHeight = fontSize * 1.4;

  // Listen for scroll events from the parent container
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('document-content') || target.closest('.document-content')) {
        setScrollTop(target.scrollTop);
      }
    };

    document.addEventListener('scroll', handleScroll, true);
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, []);

  // Calculate the top position for a specific line number
  const getLineTopPosition = (lineNumber: number) => {
    // Assuming the document starts from line 1 and accounting for padding
    const paddingTop = 16; // DocumentPreview padding
    return paddingTop + ((lineNumber - 1) * lineHeight) - scrollTop;
  };

  return (
    <Box
      ref={overlayRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none', // Allow interaction with underlying content
        zIndex: 5
      }}
    >
      {diff.blocks.map((block) => {
        const topPosition = getLineTopPosition(block.startLine);
        
        // Only render blocks that are visible in the viewport
        if (topPosition < -100 || topPosition > window.innerHeight + 100) {
          return null;
        }

        return (
          <Paper
            key={block.id}
            elevation={8}
            sx={{
              position: 'absolute',
              top: topPosition,
              left: 8,
              right: 24,
              pointerEvents: 'auto', // Enable interaction for the diff block
              bgcolor: 'background.paper',
              border: 2,
              borderColor: 
                block.type === 'addition' ? 'success.main' :
                block.type === 'deletion' ? 'error.main' : 'warning.main',
              borderRadius: 1,
              overflow: 'hidden',
              boxShadow: 4
            }}
          >
            {/* Block header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                bgcolor: 
                  block.type === 'addition' ? 'success.light' :
                  block.type === 'deletion' ? 'error.light' : 'warning.light'
              }}
            >
              <Chip 
                label={`${block.type} at line ${block.startLine}`}
                size="small"
                color={
                  block.type === 'addition' ? 'success' :
                  block.type === 'deletion' ? 'error' : 'warning'
                }
              />
              
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => onApplyBlock(block)}
                  sx={{ 
                    bgcolor: 'success.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'success.dark' },
                    width: 24,
                    height: 24
                  }}
                >
                  <AcceptIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDeclineBlock(block)}
                  sx={{ 
                    bgcolor: 'error.main', 
                    color: 'white',
                    '&:hover': { bgcolor: 'error.dark' },
                    width: 24,
                    height: 24
                  }}
                >
                  <DeclineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
            
            {/* Block content */}
            <Box sx={{ p: 1, maxHeight: 200, overflow: 'auto' }}>
              {block.lines.map((line, lineIndex) => (
                <Box
                  key={lineIndex}
                  sx={{
                    display: 'flex',
                    fontFamily: 'monospace',
                    fontSize: `${fontSize}px`, // Use the same font size as the original
                    lineHeight: 1.4,
                    bgcolor: 
                      line.type === 'added' ? 'success.light' :
                      line.type === 'removed' ? 'error.light' : 
                      'transparent',
                    px: 1,
                    py: 0.1
                  }}
                >
                  <Box
                    component="span"
                    sx={{ 
                      minWidth: '16px', 
                      color: 'text.secondary',
                      fontSize: `${fontSize * 0.8}px`,
                      mr: 1,
                      flexShrink: 0
                    }}
                  >
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </Box>
                  <Box
                    component="span"
                    sx={{ 
                      whiteSpace: 'pre', 
                      flex: 1,
                      wordBreak: 'break-all'
                    }}
                  >
                    {line.content}
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        );
      })}

      {/* Close overlay backdrop */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.1)',
          pointerEvents: 'auto',
          zIndex: -1
        }}
        onClick={onClose}
      />
    </Box>
  );
} 
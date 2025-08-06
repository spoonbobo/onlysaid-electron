import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  Check as AcceptIcon,
  Close as DeclineIcon,
  HourglassEmpty as LoadingIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';
import { CodeDiff, DiffBlock } from '@/utils/codeDiff';
import { DocumentData } from './types';

interface DiffOverlayProps {
  showDiff: boolean;
  diff?: CodeDiff;
  documentData?: DocumentData;
  renderMode: 'text' | 'view';
  onApplyDiffBlock?: (block: DiffBlock) => void;
  onDeclineDiffBlock?: (block: DiffBlock) => void;
}

export default function DiffOverlay({
  showDiff,
  diff,
  documentData,
  renderMode,
  onApplyDiffBlock,
  onDeclineDiffBlock
}: DiffOverlayProps) {
  const { getDiffBlockState, setDiffBlockState } = useCopilotStore();
  const theme = useTheme();

  if (!showDiff || !diff || !diff.hasChanges) {
    return null;
  }

  // Only show diff overlay in text (edit) mode for clarity and simplicity
  if (renderMode !== 'text') {
    return null;
  }

  // Handle apply - let parent component handle state management
  const handleApplyBlock = async (block: DiffBlock) => {
    const blockId = block.id;
    
    try {
      // Set applying state
      setDiffBlockState(blockId, { status: 'applying' });
      
      // Call the original apply function - it will handle success/error states
      await onApplyDiffBlock?.(block);
      
      console.log(`✅ Successfully applied diff block ${blockId}`);
    } catch (error) {
      // Set error state only if parent didn't handle it
      setDiffBlockState(blockId, { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      console.error(`❌ Failed to apply diff block ${blockId}:`, error);
    }
  };

  // Handle decline with state tracking
  const handleDeclineBlock = (block: DiffBlock) => {
    const blockId = block.id;
    setDiffBlockState(blockId, { status: 'declined' });
    onDeclineDiffBlock?.(block);
    console.log(`🚫 Declined diff block ${blockId}`);
  };

  // Get status-specific styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return theme.palette.success.main;
      case 'declined': return theme.palette.error.main;
      case 'applying': return theme.palette.warning.main;
      case 'error': return theme.palette.error.main;
      default: return theme.palette.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <AcceptIcon sx={{ fontSize: 12 }} />;
      case 'declined': return <DeclineIcon sx={{ fontSize: 12 }} />;
      case 'applying': return <LoadingIcon sx={{ fontSize: 12 }} />;
      case 'error': return <ErrorIcon sx={{ fontSize: 12 }} />;
      default: return null;
    }
  };

  // Simple approach: put buttons at top-right with simple stacking
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 100,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        pointerEvents: 'auto',
        zIndex: 1000
      }}
    >
      {diff.blocks.map((block, index) => {
        const elementIndex = (block as any).elementIndex;
        const targetElement = documentData?.structure?.[elementIndex];
        const previewContent = targetElement?.content?.substring(0, 30) || 'Change';
        const blockState = getDiffBlockState(block.id);
        
        console.log(`📍 Rendering diff block ${index}:`, {
          blockId: block.id,
          elementIndex,
          previewContent,
          status: blockState.status
        });
        
        return (
          <Box
            key={block.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: theme.palette.mode === 'dark' 
                ? 'rgba(18, 18, 18, 0.95)' 
                : 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              padding: '8px',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 4px 12px rgba(0,0,0,0.6)'
                : '0 4px 12px rgba(0,0,0,0.15)',
              border: `1px solid ${blockState.status === 'applied' 
                ? theme.palette.success.main
                : blockState.status === 'declined' 
                ? theme.palette.error.main
                : blockState.status === 'applying'
                ? theme.palette.warning.main
                : blockState.status === 'error'
                ? theme.palette.error.main
                : theme.palette.divider}`,
              maxWidth: '320px',
              opacity: blockState.status === 'applied' || blockState.status === 'declined' ? 0.8 : 1,
              transition: 'all 0.3s ease-in-out'
            }}
          >
            {/* Status indicator */}
            {blockState.status !== 'pending' && (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
                {getStatusIcon(blockState.status)}
              </Box>
            )}
            
            {/* Show preview of what's changing */}
            <Typography
              variant="body2"
              sx={{
                fontSize: '11px',
                color: getStatusColor(blockState.status),
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
                fontWeight: blockState.status !== 'pending' ? 'bold' : 'normal'
              }}
            >
              #{elementIndex}: {previewContent}...
            </Typography>

            {/* Status chip */}
            {blockState.status !== 'pending' && (
              <Chip
                label={blockState.status.toUpperCase()}
                size="small"
                sx={{
                  height: '16px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  backgroundColor: getStatusColor(blockState.status),
                  color: 'white',
                  '& .MuiChip-label': {
                    px: 0.5
                  }
                }}
              />
            )}
            
            {/* Action buttons - only show if pending or error */}
            {(blockState.status === 'pending' || blockState.status === 'error') && (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Apply Changes" disableFocusListener disableHoverListener={false}>
                  <IconButton
                    size="small"
                    onClick={() => handleApplyBlock(block)}
                    sx={{
                      backgroundColor: theme.palette.success.main,
                      color: 'white',
                      '&:hover': { 
                        backgroundColor: theme.palette.success.dark,
                        transform: 'scale(1.05)'
                      },
                      width: 24,
                      height: 24,
                      minWidth: 24,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <AcceptIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Decline Changes" disableFocusListener disableHoverListener={false}>
                  <IconButton
                    size="small"
                    onClick={() => handleDeclineBlock(block)}
                    sx={{
                      backgroundColor: theme.palette.error.main,
                      color: 'white',
                      '&:hover': { 
                        backgroundColor: theme.palette.error.dark,
                        transform: 'scale(1.05)'
                      },
                      width: 24,
                      height: 24,
                      minWidth: 24,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <DeclineIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            
            {/* Show applying state */}
            {blockState.status === 'applying' && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={16} color="inherit" />
                <Typography variant="caption" sx={{ fontSize: '10px', color: theme.palette.warning.main }}>
                  Applying...
                </Typography>
              </Box>
            )}

            {/* Error message tooltip */}
            {blockState.status === 'error' && blockState.error && (
              <Tooltip title={blockState.error} arrow>
                <ErrorIcon sx={{ 
                  fontSize: 14, 
                  color: theme.palette.error.main,
                  cursor: 'help'
                }} />
              </Tooltip>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
import React from 'react';
import { Box, useTheme } from '@mui/material';
import { CodeDiff } from '@/utils/codeDiff';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';

interface TextModeRendererProps {
  displayContent: string;
  fontSize: number;
  showDiff: boolean;
  diff?: CodeDiff;
  isEditable: boolean;
  onContentChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export default function TextModeRenderer({
  displayContent,
  fontSize,
  showDiff,
  diff,
  isEditable,
  onContentChange
}: TextModeRendererProps) {
  const theme = useTheme();
  const { getDiffBlockState } = useCopilotStore();

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
        } else if (line.type === 'unchanged') {
          // Show unchanged lines as normal (without prefix)
          result.push(line.content);
        }
      }
      
      // Skip the original lines that were replaced (move to end of block)
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
      // Filter out applied diff blocks to show only pending changes
      const pendingBlocks = diff.blocks.filter(block => {
        const blockState = getDiffBlockState(block.id);
        return blockState.status === 'pending' || blockState.status === 'applying' || blockState.status === 'error';
      });
      
      // If no pending blocks, show normal content without diff
      if (pendingBlocks.length === 0) {
        // Show updated content without diff styling
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
              cursor: isEditable ? 'text' : 'default',
              position: 'relative'
            }}
          >
            {displayContent}
          </Box>
        );
      }
      
      // Create a modified diff with only pending blocks
      const filteredDiff = {
        ...diff,
        blocks: pendingBlocks,
        hasChanges: pendingBlocks.length > 0
      };
      
      // Show styled diff view with only pending blocks
      const diffContent = createDiffDisplayContent(displayContent, filteredDiff);
      const styledLines = getStyledDiffLines(diffContent, filteredDiff);
      
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
    if (isEditable) {
      return (
        <textarea
          value={displayContent}
          onChange={onContentChange}
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
    }

    // Read-only text display
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
        {displayContent}
      </Box>
    );
  };

  return renderTextModeContent();
}
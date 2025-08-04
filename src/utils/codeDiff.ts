interface DiffLine {
  content: string;
  type: 'unchanged' | 'added' | 'removed';
  lineNumber: number;
  originalLineNumber?: number;
}

export interface DiffBlock {
  id: string;
  type: 'addition' | 'deletion' | 'modification';
  startLine: number;
  endLine: number;
  lines: DiffLine[];
  newContent?: string[];
}

export interface CodeDiff {
  blocks: DiffBlock[];
  hasChanges: boolean;
}

/**
 * Simple line-based diff algorithm
 */
export function createCodeDiff(originalContent: string, newContent: string): CodeDiff {
  const originalLines = originalContent.split('\n');
  const newLines = newContent.split('\n');
  
  const diff = computeDiff(originalLines, newLines);
  const blocks = groupDiffIntoBlocks(diff);
  
  return {
    blocks,
    hasChanges: blocks.length > 0
  };
}

function computeDiff(original: string[], updated: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  let i = 0, j = 0;
  
  while (i < original.length || j < updated.length) {
    if (i >= original.length) {
      // Remaining lines are additions
      result.push({
        content: updated[j],
        type: 'added',
        lineNumber: j + 1
      });
      j++;
    } else if (j >= updated.length) {
      // Remaining lines are deletions
      result.push({
        content: original[i],
        type: 'removed',
        lineNumber: i + 1,
        originalLineNumber: i + 1
      });
      i++;
    } else if (original[i] === updated[j]) {
      // Lines are the same
      result.push({
        content: original[i],
        type: 'unchanged',
        lineNumber: i + 1,
        originalLineNumber: i + 1
      });
      i++;
      j++;
    } else {
      // Find the best match using LCS approach
      const lookahead = 5; // Look ahead 5 lines
      let bestMatch = findBestMatch(original, updated, i, j, lookahead);
      
      if (bestMatch) {
        // Handle deletions
        for (let k = i; k < bestMatch.originalIndex; k++) {
          result.push({
            content: original[k],
            type: 'removed',
            lineNumber: k + 1,
            originalLineNumber: k + 1
          });
        }
        
        // Handle additions
        for (let k = j; k < bestMatch.newIndex; k++) {
          result.push({
            content: updated[k],
            type: 'added',
            lineNumber: k + 1
          });
        }
        
        i = bestMatch.originalIndex;
        j = bestMatch.newIndex;
      } else {
        // No good match found, treat as deletion + addition
        result.push({
          content: original[i],
          type: 'removed',
          lineNumber: i + 1,
          originalLineNumber: i + 1
        });
        result.push({
          content: updated[j],
          type: 'added',
          lineNumber: j + 1
        });
        i++;
        j++;
      }
    }
  }
  
  return result;
}

function findBestMatch(
  original: string[], 
  updated: string[], 
  startI: number, 
  startJ: number, 
  lookahead: number
): { originalIndex: number; newIndex: number } | null {
  for (let distance = 1; distance <= lookahead; distance++) {
    // Check if there's a match in the updated array
    for (let j = startJ; j < Math.min(startJ + distance, updated.length); j++) {
      for (let i = startI; i < Math.min(startI + distance, original.length); i++) {
        if (original[i] === updated[j]) {
          return { originalIndex: i, newIndex: j };
        }
      }
    }
  }
  return null;
}

function groupDiffIntoBlocks(diff: DiffLine[]): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  let currentBlock: DiffBlock | null = null;
  
  for (let i = 0; i < diff.length; i++) {
    const line = diff[i];
    
    if (line.type === 'unchanged') {
      // End current block if it exists
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
    } else {
      // Start new block or continue current one
      if (!currentBlock) {
        currentBlock = {
          id: `block-${blocks.length}`,
          type: line.type === 'added' ? 'addition' : 'deletion',
          startLine: line.originalLineNumber || line.lineNumber,
          endLine: line.originalLineNumber || line.lineNumber,
          lines: [line]
        };
      } else {
        // Check if we need to change block type to modification
        if (
          (currentBlock.type === 'deletion' && line.type === 'added') ||
          (currentBlock.type === 'addition' && line.type === 'removed')
        ) {
          currentBlock.type = 'modification';
        }
        
        currentBlock.lines.push(line);
        currentBlock.endLine = line.originalLineNumber || line.lineNumber;
      }
    }
  }
  
  // Don't forget the last block
  if (currentBlock) {
    blocks.push(currentBlock);
  }
  
  return blocks;
}

/**
 * Apply a specific diff block to the original content
 */
export function applyDiffBlock(originalContent: string, block: DiffBlock): string {
  const lines = originalContent.split('\n');
  
  // Extract only the added lines from the block
  const newLines = block.lines
    .filter(line => line.type === 'added')
    .map(line => line.content);
  
  // Calculate the range to replace
  const startIndex = Math.max(0, block.startLine - 1);
  const deleteCount = block.lines.filter(line => line.type === 'removed').length;
  
  // Apply the change
  lines.splice(startIndex, deleteCount, ...newLines);
  
  return lines.join('\n');
} 
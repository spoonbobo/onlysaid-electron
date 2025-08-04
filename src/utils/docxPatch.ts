/**
 * Utility functions for parsing and applying DOCX document patches from AI responses
 */

export interface DocxPatch {
  target: string;
  action: 'replace' | 'insert' | 'delete' | 'modify';
  content: string;
  elementType?: 'heading' | 'paragraph' | 'table' | 'list';
  elementIndex?: number;
}

export interface DocxStructurePatch {
  elementIndex: number;
  action: 'replace' | 'insert' | 'delete' | 'modify';
  elementType?: 'heading' | 'paragraph' | 'table' | 'list';
  newElement?: DocxElement;
  insertPosition?: 'before' | 'after';
}

export interface DocxElement {
  type: 'paragraph' | 'heading' | 'table' | 'image' | 'list';
  content: string;
  formatting?: DocxFormatting;
  level?: number;
  children?: DocxElement[];
}

export interface DocxFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  pageBreak?: boolean;
}

export interface AnchorPatch {
  anchorStart: string;
  original: string;
  replacement: string;
  anchorEnd: string;
}

export interface DocxPatchResult {
  success: boolean;
  patches: DocxPatch[];
  modifiedContent?: string;
  error?: string;
}

/**
 * Parse AI response to extract DOCX patches
 */
export function parseDocxPatches(aiResponse: string): DocxPatch[] {
  const patches: DocxPatch[] = [];
  
  // Match docx-patch code blocks
  const patchRegex = /```docx-patch\s*\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = patchRegex.exec(aiResponse)) !== null) {
    const patchContent = match[1].trim();
    const patch = parseSinglePatch(patchContent);
    if (patch) {
      patches.push(patch);
    }
  }
  
  return patches;
}

/**
 * Parse a single patch block
 */
function parseSinglePatch(patchContent: string): DocxPatch | null {
  const lines = patchContent.split('\n');
  let target = '';
  let action: DocxPatch['action'] = 'replace';
  let content = '';
  let inContentSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('TARGET:')) {
      target = trimmedLine.substring(7).trim();
    } else if (trimmedLine.startsWith('ACTION:')) {
      const actionStr = trimmedLine.substring(7).trim().toLowerCase();
      if (['replace', 'insert', 'delete', 'modify'].includes(actionStr)) {
        action = actionStr as DocxPatch['action'];
      }
    } else if (trimmedLine === 'CONTENT:') {
      inContentSection = true;
    } else if (inContentSection) {
      content += (content ? '\n' : '') + line;
    }
  }
  
  if (!target) {
    return null;
  }
  
  // Extract element info from target
  const elementMatch = target.match(/(heading|paragraph|table|list)-(\d+)/i);
  let elementType: DocxPatch['elementType'];
  let elementIndex: number | undefined;
  
  if (elementMatch) {
    elementType = elementMatch[1].toLowerCase() as DocxPatch['elementType'];
    elementIndex = parseInt(elementMatch[2], 10);
  }
  
  return {
    target,
    action,
    content: content.trim(),
    elementType,
    elementIndex
  };
}

/**
 * Apply DOCX patches to content
 */
export function applyDocxPatches(originalContent: string, patches: DocxPatch[]): DocxPatchResult {
  let modifiedContent = originalContent;
  const appliedPatches: DocxPatch[] = [];
  
  try {
    for (const patch of patches) {
      const result = applySinglePatch(modifiedContent, patch);
      if (result.success) {
        modifiedContent = result.content;
        appliedPatches.push(patch);
      } else {
        console.warn(`Failed to apply patch: ${result.error}`, patch);
      }
    }
    
    return {
      success: true,
      patches: appliedPatches,
      modifiedContent
    };
  } catch (error) {
    return {
      success: false,
      patches: appliedPatches,
      error: error instanceof Error ? error.message : 'Unknown error applying patches'
    };
  }
}

/**
 * Apply a single patch to content
 */
function applySinglePatch(content: string, patch: DocxPatch): { success: boolean; content: string; error?: string } {
  const lines = content.split('\n');
  
  // Try to find the target by different methods
  let targetLineIndex = -1;
  
  // Method 1: Try to find by element index if available
  if (patch.elementIndex) {
    targetLineIndex = findElementByIndex(lines, patch.elementType, patch.elementIndex);
  }
  
  // Method 2: Try to find by content matching
  if (targetLineIndex === -1) {
    targetLineIndex = findElementByContent(lines, patch.target);
  }
  
  // Method 3: Try fuzzy matching
  if (targetLineIndex === -1) {
    targetLineIndex = findElementByFuzzyMatch(lines, patch.target);
  }
  
  if (targetLineIndex === -1) {
    return {
      success: false,
      content,
      error: `Target not found: ${patch.target}`
    };
  }
  
  // Apply the patch based on action
  switch (patch.action) {
    case 'replace':
      lines[targetLineIndex] = patch.content;
      break;
      
    case 'insert':
      lines.splice(targetLineIndex + 1, 0, patch.content);
      break;
      
    case 'delete':
      lines.splice(targetLineIndex, 1);
      break;
      
    case 'modify':
      // For modify, try to merge the content intelligently
      const originalLine = lines[targetLineIndex];
      const modifiedLine = mergeContent(originalLine, patch.content);
      lines[targetLineIndex] = modifiedLine;
      break;
      
    default:
      return {
        success: false,
        content,
        error: `Unknown action: ${patch.action}`
      };
  }
  
  return {
    success: true,
    content: lines.join('\n')
  };
}

/**
 * Find element by type and index
 */
function findElementByIndex(lines: string[], elementType?: string, elementIndex?: number): number {
  if (!elementType || !elementIndex) return -1;
  
  let currentIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    
    const isTargetType = isElementOfType(line, elementType);
    if (isTargetType) {
      currentIndex++;
      if (currentIndex === elementIndex) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Find element by content matching
 */
function findElementByContent(lines: string[], target: string): number {
  // Extract quoted content from target
  const quotedMatch = target.match(/"([^"]+)"/);
  if (quotedMatch) {
    const searchText = quotedMatch[1];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i;
      }
    }
  }
  
  // Try direct substring match
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(target.toLowerCase())) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Find element by fuzzy matching
 */
function findElementByFuzzyMatch(lines: string[], target: string): number {
  const targetWords = target.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  let bestMatch = -1;
  let bestScore = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    let score = 0;
    
    for (const word of targetWords) {
      if (line.includes(word)) {
        score++;
      }
    }
    
    const normalizedScore = score / targetWords.length;
    if (normalizedScore > bestScore && normalizedScore > 0.5) {
      bestScore = normalizedScore;
      bestMatch = i;
    }
  }
  
  return bestMatch;
}

/**
 * Check if a line is of a specific element type
 */
function isElementOfType(line: string, elementType: string): boolean {
  switch (elementType) {
    case 'heading':
      return line.length < 100 && (
        line === line.toUpperCase() || 
        /^[A-Z][^.]*$/.test(line) ||
        /^\d+\.?\s/.test(line) ||
        line.endsWith(':')
      );
    case 'paragraph':
      return line.length > 20 && !isElementOfType(line, 'heading');
    case 'table':
      return line.includes('|') || line.includes('\t');
    case 'list':
      return /^[-*•]\s/.test(line) || /^\d+\.\s/.test(line);
    default:
      return false;
  }
}

/**
 * Intelligently merge content for modify actions
 */
function mergeContent(original: string, modification: string): string {
  // For now, just replace, but this could be made more sophisticated
  // to preserve formatting, merge specific parts, etc.
  return modification || original;
}

/**
 * Validate a patch before applying
 */
export function validatePatch(patch: DocxPatch): { valid: boolean; error?: string } {
  if (!patch.target) {
    return { valid: false, error: 'Patch must have a target' };
  }
  
  if (!['replace', 'insert', 'delete', 'modify'].includes(patch.action)) {
    return { valid: false, error: 'Invalid action type' };
  }
  
  if (patch.action !== 'delete' && !patch.content) {
    return { valid: false, error: 'Patch must have content for non-delete actions' };
  }
  
  return { valid: true };
}

/**
 * Extract DOCX content blocks from AI response
 */
export function extractDocxContent(aiResponse: string): string | null {
  const contentRegex = /```docx-content\s*\n([\s\S]*?)\n```/;
  const match = aiResponse.match(contentRegex);
  return match ? match[1].trim() : null;
}

/**
 * Parse anchor-based patches from AI response
 */
export function parseAnchorPatches(aiResponse: string): AnchorPatch[] {
  const patches: AnchorPatch[] = [];
  
  // Match anchor-patch code blocks
  const patchRegex = /```anchor-patch\s*\n([\s\S]*?)\n```/g;
  let match;
  
  console.log('Searching for anchor patches in AI response...');
  console.log('AI Response preview:', aiResponse.substring(0, 500) + '...');
  
  // Check if there are malformed anchor patches (without proper code blocks)
  if (aiResponse.includes('anchor-patch') && !aiResponse.includes('```anchor-patch')) {
    console.warn('⚠️ Found "anchor-patch" text but no properly formatted ```anchor-patch code blocks!');
    console.warn('AI might have provided malformed patch format. Expected: ```anchor-patch ... ```');
  }
  
  while ((match = patchRegex.exec(aiResponse)) !== null) {
    const patchContent = match[1].trim();
    console.log('Found potential anchor patch block:', patchContent);
    
    const patch = parseSingleAnchorPatch(patchContent);
    if (patch) {
      // Validate the patch before adding
      const validation = validateAnchorPatch(patch);
      if (validation.valid) {
        patches.push(patch);
        console.log('✅ Successfully parsed and validated anchor patch');
      } else {
        console.warn(`❌ Invalid anchor patch: ${validation.error}`, patch);
      }
    } else {
      console.warn('❌ Failed to parse anchor patch from content:', patchContent);
    }
  }
  
  if (patches.length === 0) {
    console.log('ℹ️ No valid anchor patches found. AI might need to use proper ```anchor-patch format or provide full document content instead.');
    
    // Check if the response contains anchor patch keywords but wrong format
    if (aiResponse.includes('ANCHOR_START') || aiResponse.includes('ANCHOR_END')) {
      console.warn('⚠️ Found anchor patch keywords but not in proper ```anchor-patch code blocks!');
      console.warn('AI might have provided malformed anchor patch format.');
    }
  }
  
  console.log(`Found ${patches.length} valid anchor patches`);
  return patches;
}

/**
 * Parse a single anchor patch block
 */
function parseSingleAnchorPatch(patchContent: string): AnchorPatch | null {
  const lines = patchContent.split('\n');
  let anchorStart = '';
  let original = '';
  let replacement = '';
  let anchorEnd = '';
  let currentSection = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('ANCHOR_START:')) {
      anchorStart = trimmedLine.substring(13).trim();
      currentSection = '';
    } else if (trimmedLine === 'ORIGINAL:') {
      currentSection = 'original';
    } else if (trimmedLine === 'REPLACEMENT:') {
      currentSection = 'replacement';
    } else if (trimmedLine.startsWith('ANCHOR_END:')) {
      anchorEnd = trimmedLine.substring(11).trim();
      currentSection = '';
    } else if (currentSection === 'original') {
      original += (original ? '\n' : '') + line;
    } else if (currentSection === 'replacement') {
      replacement += (replacement ? '\n' : '') + line;
    }
  }
  
  // Debug logging
  console.log('Parsed anchor patch:', {
    anchorStart,
    original: original.trim(),
    replacement: replacement.trim(),
    anchorEnd
  });
  
  if (!anchorStart) {
    console.warn('Missing ANCHOR_START in patch');
    return null;
  }
  
  if (!anchorEnd) {
    console.warn('Missing ANCHOR_END in patch');
    return null;
  }
  
  return {
    anchorStart: anchorStart,
    original: original.trim(),
    replacement: replacement.trim(),
    anchorEnd: anchorEnd
  };
}

/**
 * Apply anchor-based patches to content
 */
export function applyAnchorPatches(originalContent: string, patches: AnchorPatch[]): { success: boolean; content: string; error?: string } {
  let modifiedContent = originalContent;
  
  try {
    for (const patch of patches) {
      const result = applySingleAnchorPatch(modifiedContent, patch);
      if (result.success) {
        modifiedContent = result.content;
      } else {
        console.warn(`Failed to apply anchor patch: ${result.error}`, patch);
        return {
          success: false,
          content: originalContent,
          error: result.error
        };
      }
    }
    
    return {
      success: true,
      content: modifiedContent
    };
  } catch (error) {
    return {
      success: false,
      content: originalContent,
      error: error instanceof Error ? error.message : 'Unknown error applying anchor patches'
    };
  }
}

/**
 * Apply a single anchor patch to content
 */
function applySingleAnchorPatch(content: string, patch: AnchorPatch): { success: boolean; content: string; error?: string } {
  // Find the start anchor
  const startIndex = content.indexOf(patch.anchorStart);
  if (startIndex === -1) {
    return {
      success: false,
      content,
      error: `Start anchor not found: "${patch.anchorStart}"`
    };
  }
  
  // Find the end anchor (search from after the start anchor)
  const searchFromIndex = startIndex + patch.anchorStart.length;
  const endIndex = content.indexOf(patch.anchorEnd, searchFromIndex);
  if (endIndex === -1) {
    return {
      success: false,
      content,
      error: `End anchor not found: "${patch.anchorEnd}"`
    };
  }
  
  // Calculate positions more carefully
  const beforeAnchorStart = content.substring(0, startIndex);
  const startAnchorText = content.substring(startIndex, startIndex + patch.anchorStart.length);
  const betweenAnchors = content.substring(startIndex + patch.anchorStart.length, endIndex);
  const endAnchorText = content.substring(endIndex, endIndex + patch.anchorEnd.length);
  const afterAnchorEnd = content.substring(endIndex + patch.anchorEnd.length);
  
  console.log('Anchor patch positions:', {
    startIndex,
    endIndex,
    startAnchor: startAnchorText,
    betweenAnchors: betweenAnchors.substring(0, 100) + '...',
    endAnchor: endAnchorText,
    originalToFind: patch.original.substring(0, 100) + '...'
  });
  
  // If original text is specified, find and replace only that text
  if (patch.original && patch.original.trim()) {
    const normalizedBetween = betweenAnchors.trim();
    const normalizedOriginal = patch.original.trim();
    
    if (!normalizedBetween.includes(normalizedOriginal)) {
      return {
        success: false,
        content,
        error: `Original text not found between anchors. Looking for: "${normalizedOriginal.substring(0, 50)}..." in: "${normalizedBetween.substring(0, 50)}..."`
      };
    }
    
    // Replace only the original text, keeping the rest
    const updatedBetween = betweenAnchors.replace(normalizedOriginal, patch.replacement);
    
    return {
      success: true,
      content: beforeAnchorStart + startAnchorText + updatedBetween + endAnchorText + afterAnchorEnd
    };
  } else {
    // If no original specified, replace entire content between anchors
    return {
      success: true,
      content: beforeAnchorStart + startAnchorText + patch.replacement + endAnchorText + afterAnchorEnd
    };
  }
}

/**
 * Validate an anchor patch
 */
export function validateAnchorPatch(patch: AnchorPatch): { valid: boolean; error?: string } {
  if (!patch.anchorStart) {
    return { valid: false, error: 'Anchor patch must have a start anchor' };
  }
  
  if (!patch.anchorEnd) {
    return { valid: false, error: 'Anchor patch must have an end anchor' };
  }
  
  if (patch.anchorStart === patch.anchorEnd) {
    return { valid: false, error: 'Start and end anchors cannot be identical' };
  }
  
  return { valid: true };
}

/**
 * Create a preview of what an anchor patch will do (for debugging)
 */
export function previewAnchorPatch(content: string, patch: AnchorPatch): string {
  const startIndex = content.indexOf(patch.anchorStart);
  const endIndex = content.indexOf(patch.anchorEnd, startIndex);
  
  if (startIndex === -1 || endIndex === -1) {
    return `❌ Cannot preview: anchors not found in content`;
  }
  
  const startPos = startIndex + patch.anchorStart.length;
  const endPos = endIndex;
  const sectionBetweenAnchors = content.substring(startPos, endPos);
  
  return `
📍 ANCHOR PATCH PREVIEW:
🎯 Start anchor: "${patch.anchorStart}"
🎯 End anchor: "${patch.anchorEnd}"
📝 Current content between anchors: "${sectionBetweenAnchors.trim()}"
${patch.original ? `🔍 Looking for: "${patch.original}"` : ''}
✏️ Will ${patch.original ? 'replace with' : 'insert'}: "${patch.replacement}"
  `.trim();
}

/**
 * Parse structure-based patches from AI response
 */
export function parseDocxStructurePatches(aiResponse: string): DocxStructurePatch[] {
  const patches: DocxStructurePatch[] = [];
  

  
  // Match docx-structure-patch code blocks (case-insensitive and very flexible)
  const patchRegex = /```\s*(?:docx[-\s]?structure[-\s]?patch|DOCX[-\s]?STRUCTURE[-\s]?PATCH)\s*\n([\s\S]*?)\n\s*```/gi;
  let match;
  
  console.log('Searching for structure patches in AI response...');
  
  while ((match = patchRegex.exec(aiResponse)) !== null) {
    const patchContent = match[1].trim();
    console.log('Found potential structure patch block:', patchContent);
    
    const patch = parseSingleStructurePatch(patchContent);
    if (patch) {
      patches.push(patch);
      console.log('✅ Successfully parsed structure patch');
    } else {
      console.warn('❌ Failed to parse structure patch from content:', patchContent);
    }
  }
  
  // No fallback - require proper formatting
  if (patches.length === 0) {
    console.log('No properly formatted ```docx-structure-patch code blocks found in AI response');
    
    // Check if AI attempted to provide patches but in wrong format
    const trimmedResponse = aiResponse.trim();
    if (trimmedResponse.startsWith('{') && trimmedResponse.endsWith('}')) {
      console.error('❌ AI provided raw JSON instead of proper ```docx-structure-patch code blocks!');
      console.error('Expected format: ```docx-structure-patch\\n{...}\\n```');
      console.error('Received format: Raw JSON object');
      throw new Error('AI response contains raw JSON instead of properly formatted docx-structure-patch code blocks. AI must use ```docx-structure-patch format.');
    }
    
    if (aiResponse.includes('elementIndex') || aiResponse.includes('action') || aiResponse.includes('newElement')) {
      console.error('❌ AI provided structure patch data but not in proper ```docx-structure-patch code blocks!');
      console.error('Expected format: ```docx-structure-patch\\n{...}\\n```');
      throw new Error('AI response contains patch-like content but not in proper ```docx-structure-patch code blocks. AI must use the correct format.');
    }
  }
  
  console.log(`Found ${patches.length} valid structure patches`);
  return patches;
}

/**
 * Parse a single structure patch block
 */
function parseSingleStructurePatch(patchContent: string): DocxStructurePatch | null {
  try {
    // Try to parse as JSON first
    const patchData = JSON.parse(patchContent);
    
    if (typeof patchData.elementIndex !== 'number' || !patchData.action) {
      console.warn('Invalid structure patch: missing elementIndex or action');
      return null;
    }
    
    return {
      elementIndex: patchData.elementIndex,
      action: patchData.action,
      elementType: patchData.elementType,
      newElement: patchData.newElement,
      insertPosition: patchData.insertPosition || 'after'
    };
  } catch (error) {
    console.warn('Failed to parse structure patch JSON:', error);
    return null;
  }
}

/**
 * Apply structure-based patches to DocxElement array
 */
export function applyDocxStructurePatches(elements: DocxElement[], patches: DocxStructurePatch[]): { success: boolean; elements: DocxElement[]; error?: string } {
  let modifiedElements = [...elements];
  
  try {
    // Sort patches by elementIndex in descending order to avoid index shifting issues
    const sortedPatches = [...patches].sort((a, b) => b.elementIndex - a.elementIndex);
    
    for (const patch of sortedPatches) {
      const result = applySingleStructurePatch(modifiedElements, patch);
      if (result.success) {
        modifiedElements = result.elements;
      } else {
        console.warn(`Failed to apply structure patch: ${result.error}`, patch);
        return {
          success: false,
          elements: elements,
          error: result.error
        };
      }
    }
    
    return {
      success: true,
      elements: modifiedElements
    };
  } catch (error) {
    return {
      success: false,
      elements: elements,
      error: error instanceof Error ? error.message : 'Unknown error applying structure patches'
    };
  }
}

/**
 * Apply a single structure patch to DocxElement array
 */
function applySingleStructurePatch(elements: DocxElement[], patch: DocxStructurePatch): { success: boolean; elements: DocxElement[]; error?: string } {
  const modifiedElements = [...elements];
  
  // Validate element index
  if (patch.elementIndex < 0 || patch.elementIndex >= elements.length) {
    return {
      success: false,
      elements: elements,
      error: `Element index ${patch.elementIndex} is out of range (0-${elements.length - 1})`
    };
  }
  
  switch (patch.action) {
    case 'replace':
      if (!patch.newElement) {
        return {
          success: false,
          elements: elements,
          error: 'Replace action requires newElement'
        };
      }
      modifiedElements[patch.elementIndex] = patch.newElement;
      break;
      
    case 'insert':
      if (!patch.newElement) {
        return {
          success: false,
          elements: elements,
          error: 'Insert action requires newElement'
        };
      }
      const insertIndex = patch.insertPosition === 'before' ? 
        patch.elementIndex : 
        patch.elementIndex + 1;
      modifiedElements.splice(insertIndex, 0, patch.newElement);
      break;
      
    case 'delete':
      modifiedElements.splice(patch.elementIndex, 1);
      break;
      
    case 'modify':
      if (!patch.newElement) {
        return {
          success: false,
          elements: elements,
          error: 'Modify action requires newElement'
        };
      }
      // Merge with existing element, preserving formatting if not overridden
      const existingElement = modifiedElements[patch.elementIndex];
      modifiedElements[patch.elementIndex] = {
        ...existingElement,
        ...patch.newElement,
        formatting: {
          ...existingElement.formatting,
          ...patch.newElement.formatting
        }
      };
      break;
      
    default:
      return {
        success: false,
        elements: elements,
        error: `Unknown action: ${patch.action}`
      };
  }
  
  return {
    success: true,
    elements: modifiedElements
  };
}

/**
 * Apply structure patches to original text content with minimal changes
 * This preserves the original formatting and only changes the specific elements
 */
export function applyStructurePatchesToText(originalText: string, originalStructure: DocxElement[], patches: DocxStructurePatch[]): { success: boolean; content: string; error?: string } {
  try {
    // Apply patches to structure first
    const structureResult = applyDocxStructurePatches(originalStructure, patches);
    if (!structureResult.success) {
      return { success: false, content: originalText, error: structureResult.error };
    }

    // For simple element replacements, try to do targeted text replacement
    if (patches.length === 1 && patches[0].action === 'replace' && patches[0].newElement) {
      const patch = patches[0];
      const elementIndex = patch.elementIndex;
      
      if (elementIndex >= 0 && elementIndex < originalStructure.length && patch.newElement) {
        const oldElement = originalStructure[elementIndex];
        const newElement = patch.newElement;
        
        // Try to replace just the content of this element in the original text
        const oldContent = oldElement.content;
        const newContent = newElement.content;
        
        if (oldContent && newContent && originalText.includes(oldContent)) {
          // Simple text replacement - preserve all other formatting
          const updatedText = originalText.replace(oldContent, newContent);
          return { success: true, content: updatedText };
        }
      }
    }
    
    // Fallback to full reconstruction for complex cases
    const newContent = docxElementsToText(structureResult.elements);
    return { success: true, content: newContent };
    
  } catch (error) {
    return {
      success: false,
      content: originalText,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Convert DocxElement array back to text representation
 * This tries to reconstruct the original document format as closely as possible
 */
export function docxElementsToText(elements: DocxElement[]): string {
  // Use minimal spacing to preserve original document structure
  return elements.map((element, index) => {
    const content = element.content;
    
    // Minimal formatting to avoid spacing differences
    switch (element.type) {
      case 'heading':
        // Simple heading format - just the content
        return content;
        
      case 'paragraph':
        // Paragraphs as-is
        return content;
        
      case 'table':
        // Tables without extra spacing
        return content;
        
      case 'list':
        // Lists as-is
        return content;
        
      case 'image':
        // Simple image placeholder
        return `[Image: ${content}]`;
        
      default:
        return content;
    }
  }).filter(content => content.trim().length > 0) // Remove empty elements
    .join('\n\n'); // Use consistent double newline separation
}
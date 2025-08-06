import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as mammoth from 'mammoth';
import os from 'os';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

interface DocxDocument {
  content: string;
  structure: DocxElement[];
  metadata: DocxMetadata;
}

interface DocxElement {
  type: 'paragraph' | 'heading' | 'table' | 'image' | 'list';
  content: string;
  formatting?: DocxFormatting;
  level?: number; // For headings and lists
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

interface DocxMetadata {
  title?: string;
  author?: string;
  subject?: string;
  description?: string;
  created?: Date;
  modified?: Date;
  pages?: number;
  words?: number;
  characters?: number;
}

// TODO: Install and import the docx library
// import { Document, Packer, Paragraph, TextRun } from 'docx';

/**
 * Enhanced DOCX processing using the docx library for proper document structure
 */
export function setupDocxHandlers() {
  console.log('[DocxHandlers] Setting up enhanced DOCX handlers...');
  
  // Handler to read DOCX file with full structure
  ipcMain.handle('docx:read-document', async (event, filePath: string) => {
    try {
      console.log(`[DocxReader] Starting DOCX document read: ${filePath}`);
      
      // Security check: ensure the path is not attempting path traversal
      const resolvedPath = path.resolve(filePath);
      
      // Check if file exists
      const fileExists = await fs.promises.access(resolvedPath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        return {
          success: false,
          error: `DOCX file not found: ${filePath}`
        };
      }

      // Check if it's actually a DOCX file
      const ext = path.extname(filePath).toLowerCase();
      if (!['.docx', '.doc'].includes(ext)) {
        return {
          success: false,
          error: `Invalid file type. Expected .docx or .doc, got ${ext}`
        };
      }

      // Read the file as buffer for docx library processing
      const buffer = await fs.promises.readFile(resolvedPath);
      
      // Basic validation: DOCX files are ZIP archives, check for ZIP signature
      if (buffer.length < 4) {
        return {
          success: false,
          error: 'File is too small to be a valid DOCX document'
        };
      }
      
      // Check for valid ZIP signatures - DOCX files can have multiple valid ZIP signatures
      const isValidZipSignature = isValidZipFile(buffer);
      if (!isValidZipSignature) {
        console.log(`[DocxReader] ZIP validation failed for file: ${filePath}`);
        console.log(`[DocxReader] Buffer length: ${buffer.length}, First 16 bytes:`, buffer.subarray(0, 16));
        
        // Check if this appears to be a text file with Chinese/Unicode characters
        const firstBytes = buffer.subarray(0, 32);
        const isLikelyTextFile = firstBytes.every(byte => 
          // UTF-8 continuation bytes or common ASCII chars
          (byte >= 0x80 && byte <= 0xFF) || // UTF-8 multi-byte chars
          (byte >= 0x20 && byte <= 0x7E) || // Printable ASCII
          byte === 0x0A || byte === 0x0D || byte === 0x09 // Line breaks, tabs
        );
        
        let errorMessage = 'File does not appear to be a valid DOCX document.';
        if (isLikelyTextFile) {
          errorMessage = 'This appears to be a text file that has been incorrectly named with a .docx extension. DOCX files are compressed archives, but this file contains plain text. Please verify the file format or rename it with the correct extension (.txt).';
        } else {
          errorMessage = 'File does not appear to be a valid DOCX document. This may be caused by file corruption, an older .doc format, or the file may not be a Word document. Try opening the file in Microsoft Word and saving it as a .docx file.';
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      let extractedText = '';
      let structure: DocxElement[] = [];
      let metadata: DocxMetadata = {};

      try {
        // Use mammoth to extract both text and structure
        const textResult = await mammoth.extractRawText({buffer: buffer});
        extractedText = textResult.value;
        
        if (!extractedText || !extractedText.trim()) {
          return {
            success: false,
            error: 'No content found in DOCX document'
          };
        }

        // Parse the DOCX structure using mammoth
        console.log('[DocxReader] Parsing DOCX structure...');
        structure = await parseDocxStructure(buffer);
        console.log(`[DocxReader] Parsed structure with ${structure.length} elements`);
        
        // Get file stats for metadata
        const stats = await fs.promises.stat(resolvedPath);
        metadata = {
          words: extractedText.trim().split(/\s+/).length,
          characters: extractedText.length,
          created: stats.birthtime,
          modified: stats.mtime,
          title: path.basename(resolvedPath, path.extname(resolvedPath))
        };

      } catch (parseError: any) {
        console.error('[DocxReader] Error parsing DOCX:', parseError);
        
        // Try a fallback approach for files that pass ZIP validation but have parsing issues
        try {
          console.log('[DocxReader] Attempting fallback text extraction...');
          const fallbackResult = await mammoth.extractRawText({buffer: buffer});
          if (fallbackResult.value && fallbackResult.value.trim()) {
            console.log('[DocxReader] Fallback extraction successful, returning basic document structure');
            
            const fallbackStructure = parseTextToStructure(fallbackResult.value);
            const stats = await fs.promises.stat(resolvedPath);
            
            return {
              success: true,
              document: {
                content: fallbackResult.value,
                structure: fallbackStructure,
                metadata: {
                  words: fallbackResult.value.trim().split(/\s+/).length,
                  characters: fallbackResult.value.length,
                  created: stats.birthtime,
                  modified: stats.mtime,
                  title: path.basename(resolvedPath, path.extname(resolvedPath))
                }
              },
              size: buffer.length,
              type: 'docx',
              note: 'Document opened in text mode due to structure parsing issues'
            };
          }
        } catch (fallbackError) {
          console.error('[DocxReader] Fallback extraction also failed:', fallbackError);
        }
        
        // Provide more specific error messages for common issues
        let errorMessage = parseError.message;
        if (parseError.message && parseError.message.includes('end of central directory')) {
          errorMessage = 'DOCX file appears to be corrupted or is not a valid ZIP archive. This can happen if the file was incompletely downloaded or corrupted during transfer.';
        } else if (parseError.message && parseError.message.includes('zip')) {
          errorMessage = 'Unable to read DOCX file structure. The file may be corrupted or in an unsupported format.';
        }
        
        return {
          success: false,
          error: `Failed to parse DOCX: ${errorMessage}`
        };
      }
      
      const document: DocxDocument = {
        content: extractedText,
        structure: structure,
        metadata: metadata
      };

      console.log(`[DocxReader] Successfully parsed DOCX with ${structure.length} elements`);
      
      return {
        success: true,
        document,
        size: buffer.length,
        type: 'docx'
      };
    } catch (error: any) {
      console.error(`[DocxReader] Error reading DOCX document ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        path: filePath
      };
    }
  });

  // Handler to write DOCX file with structure (with file locking retry logic)
  ipcMain.handle('docx:write-document', async (event, filePath: string, document: DocxDocument) => {
    try {
      console.log(`[DocxWriter] Writing DOCX document: ${filePath}`);
      
      // Security check: ensure the path is not attempting path traversal
      const resolvedPath = path.resolve(filePath);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(resolvedPath);
      await fs.promises.mkdir(dir, { recursive: true });
      
      // Create proper DOCX document using the docx library
      const docxDoc = createDocxFromStructure(document.structure || [], document.metadata);
      
      // Convert to buffer
      const buffer = await Packer.toBuffer(docxDoc);
      
      // Try to write the DOCX file with retry logic for file locking
      const writeResult = await writeFileWithRetry(resolvedPath, buffer);
      
      if (!writeResult.success) {
        return writeResult;
      }
      
      console.log(`[DocxWriter] Successfully saved DOCX document to ${resolvedPath}`);

      return {
        success: true,
        path: resolvedPath,
        size: buffer.length,
        note: 'Successfully created DOCX file with proper formatting.'
      };
    } catch (error: any) {
      console.error(`[DocxWriter] Error writing DOCX document ${filePath}:`, error);
      
      // Provide user-friendly error messages for common issues
      let userFriendlyError = error.message;
      if (error.code === 'EBUSY') {
        userFriendlyError = 'File is currently being used by another application (possibly Microsoft Word). Please close the file in other applications and try again.';
      } else if (error.code === 'EACCES') {
        userFriendlyError = 'Permission denied. Please check if you have write access to this location.';
      } else if (error.code === 'ENOENT') {
        userFriendlyError = 'The file path does not exist. Please check the file location.';
      }
      
      return {
        success: false,
        error: userFriendlyError,
        path: filePath,
        errorCode: error.code
      };
    }
  });

  // Handler to save DOCX text content with advanced file locking handling
  ipcMain.handle('docx:save-text-content', async (event, filePath: string, textContent: string) => {
    try {
      console.log(`[DocxTextSaver] Saving text content to DOCX: ${filePath}`);
      
      // Security check
      const resolvedPath = path.resolve(filePath);
      
      // Check if it's a DOCX file
      const ext = path.extname(filePath).toLowerCase();
      if (!['.docx', '.doc'].includes(ext)) {
        return {
          success: false,
          error: `Invalid file type. Expected .docx or .doc, got ${ext}`
        };
      }
      
      // Try to read existing document first to preserve structure
      let existingDocument: DocxDocument | null = null;
      try {
        const readResult = await fs.promises.readFile(resolvedPath);
        const readBuffer = Buffer.from(readResult);
        
        // Validate that it's a valid ZIP file before attempting to parse
        if (!isValidZipFile(readBuffer)) {
          console.log(`[DocxTextSaver] Existing file is not a valid ZIP/DOCX format, creating new document`);
          throw new Error('Invalid ZIP format');
        }
        
        // Try to parse existing structure
        const extractedText = await mammoth.extractRawText({buffer: readBuffer});
        const structure = await parseDocxStructure(readBuffer);
        
        existingDocument = {
          content: textContent, // Use new content
          structure: structure.length > 0 ? updateStructureWithText(structure, textContent) : parseTextToStructure(textContent),
          metadata: {
            title: path.basename(resolvedPath, path.extname(resolvedPath)),
            words: textContent.trim().split(/\s+/).length,
            characters: textContent.length,
            modified: new Date()
          }
        };
      } catch (readError) {
        console.log(`[DocxTextSaver] Could not read existing document, creating new one:`, readError);
        // Create new document structure from text
        existingDocument = {
          content: textContent,
          structure: parseTextToStructure(textContent),
          metadata: {
            title: path.basename(resolvedPath, path.extname(resolvedPath)),
            words: textContent.trim().split(/\s+/).length,
            characters: textContent.length,
            created: new Date(),
            modified: new Date()
          }
        };
      }
      
      // Create DOCX document
      const docxDoc = createDocxFromStructure(existingDocument.structure, existingDocument.metadata);
      const buffer = await Packer.toBuffer(docxDoc);
      
      // Write with retry logic
      const writeResult = await writeFileWithRetry(resolvedPath, buffer);
      
      if (!writeResult.success) {
        return writeResult;
      }
      
      console.log(`[DocxTextSaver] Successfully saved text content to DOCX: ${resolvedPath}`);
      
      return {
        success: true,
        path: resolvedPath,
        size: buffer.length,
        contentLength: textContent.length,
        note: 'Successfully saved text content to DOCX with preserved formatting.'
      };
      
    } catch (error: any) {
      console.error(`[DocxTextSaver] Error saving text to DOCX ${filePath}:`, error);
      
      let userFriendlyError = error.message;
      if (error.code === 'EBUSY') {
        userFriendlyError = 'File is currently being used by another application (possibly Microsoft Word). Please close the file in other applications and try again.';
      } else if (error.code === 'EACCES') {
        userFriendlyError = 'Permission denied. Please check if you have write access to this location.';
      }
      
      return {
        success: false,
        error: userFriendlyError,
        path: filePath,
        errorCode: error.code
      };
    }
  });

  // Handler to convert text content to DOCX structure
  ipcMain.handle('docx:text-to-structure', async (event, textContent: string) => {
    try {
      const structure = parseTextToStructure(textContent);
      
      return {
        success: true,
        structure,
        elementCount: structure.length
      };
    } catch (error: any) {
      console.error('[DocxParser] Error parsing text to structure:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Handler to render DOCX structure to HTML for display
  ipcMain.handle('docx:structure-to-html', async (event, structure: DocxElement[]) => {
    try {
      const html = renderStructureToHtml(structure);
      
      return {
        success: true,
        html,
        elementCount: structure.length
      };
    } catch (error: any) {
      console.error('[DocxRenderer] Error rendering structure to HTML:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[DocxHandlers] Enhanced DOCX handlers setup complete!');
}

/**
 * Parse DOCX buffer into document structure using mammoth library
 */
async function parseDocxStructure(buffer: Buffer): Promise<DocxElement[]> {
  try {
    // Enhanced mammoth configuration for better Word document conversion
    const result = await mammoth.convertToHtml({buffer: buffer}, {
      // Enhanced style mapping for better Word compatibility
      styleMap: [
        // Headings with proper styling
        "p[style-name='Heading 1'] => h1.heading1:fresh",
        "p[style-name='Heading 2'] => h2.heading2:fresh", 
        "p[style-name='Heading 3'] => h3.heading3:fresh",
        "p[style-name='Heading 4'] => h4.heading4:fresh",
        "p[style-name='Heading 5'] => h5.heading5:fresh",
        "p[style-name='Heading 6'] => h6.heading6:fresh",
        // Paragraph styles
        "p[style-name='Normal'] => p.normal:fresh",
        "p[style-name='Title'] => h1.title:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh",
        // List styles
        "p[style-name='List Paragraph'] => p.list-paragraph:fresh",
        // Table styles
        "table => table.word-table:fresh",
      ],
      // Include document breaks and page structure
      includeDefaultStyleMap: true,
      // Convert page breaks to special markup
      convertImage: mammoth.images.imgElement((image: any) => {
        return image.read('base64').then((imageBuffer: string) => {
          return {
            src: "data:" + image.contentType + ";base64," + imageBuffer,
            alt: image.altText || "Image"
          };
        });
      })
    });
    
    const html = result.value;
    const warnings = result.messages;
    
    // Log any conversion warnings for debugging
    if (warnings.length > 0) {
      console.log('[DocxParser] Conversion warnings:', warnings);
    }
    
    // Parse HTML using proper DOM parsing
    const structure = parseHtmlToStructure(html);
    
    return structure;
  } catch (error: any) {
    console.error('[DocxParser] Error parsing DOCX structure:', error);
    // Fallback to basic text parsing
    return [{
      type: 'paragraph',
      content: 'Error parsing document structure. Please try viewing in text mode.',
      formatting: {}
    }];
  }
}

/**
 * Parse HTML content into structured DocxElement array
 */
function parseHtmlToStructure(html: string): DocxElement[] {
  const structure: DocxElement[] = [];
  
  // Use simple regex-based parsing for HTML elements
  // In production, consider using a proper HTML parser like jsdom
  const htmlWithoutNewlines = html.replace(/\n\s*/g, ' ');
  
  // Match different element types with their content and styling
  const elementMatches = [
    // Page breaks (custom marker)
    { 
      regex: /<div[^>]*class="?page-break"?[^>]*>.*?<\/div>/gi,
      type: 'page-break' as const
    },
    // ALL heading tags (h1-h6) regardless of class
    {
      regex: /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi,
      type: 'heading' as const
    },
    // Tables (any table, not just with specific classes)
    {
      regex: /<table[^>]*>(.*?)<\/table>/gi,
      type: 'table' as const
    },
    // Lists (unordered and ordered)
    {
      regex: /<ul[^>]*>(.*?)<\/ul>/gi,
      type: 'list' as const
    },
    {
      regex: /<ol[^>]*>(.*?)<\/ol>/gi,
      type: 'list' as const
    },
    // Regular paragraphs (any p tag)
    {
      regex: /<p[^>]*>(.*?)<\/p>/gi,
      type: 'paragraph' as const
    }
  ];

  let processedHtml = htmlWithoutNewlines;
  const processedIndices: number[] = [];

  for (const pattern of elementMatches) {
    let match;
    pattern.regex.lastIndex = 0; // Reset regex

    while ((match = pattern.regex.exec(htmlWithoutNewlines)) !== null) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;
      
      // Skip if this area was already processed
      if (processedIndices.some(idx => idx >= startIndex && idx < endIndex)) {
        continue;
      }

      let content = '';
      let level: number | undefined;
      
      if (pattern.type === 'page-break') {
        content = '[PAGE BREAK]';
      } else if (pattern.type === 'heading') {
        // For headings, match[1] is the heading level (1-6), match[2] is the content
        level = parseInt(match[1]) || 1;
        content = stripHtmlTags(match[2] || '').trim();
      } else if (pattern.type === 'table') {
        content = extractTableContent(match[1] || '');
      } else if (pattern.type === 'list') {
        content = extractListContent(match[1] || '');
      } else {
        content = stripHtmlTags(match[1] || '').trim();
      }

      if (content) {
        const element: DocxElement = {
          type: pattern.type === 'page-break' ? 'paragraph' : pattern.type,
          content,
          formatting: extractInlineFormatting(match[0])
        };

        if (level !== undefined) {
          element.level = level;
        }

        // Add page break marker
        if (pattern.type === 'page-break') {
          element.formatting = { 
            ...element.formatting, 
            pageBreak: true 
          };
        }

        structure.push(element);
        
        // Mark this area as processed
        for (let i = startIndex; i < endIndex; i++) {
          processedIndices.push(i);
        }
      }
    }
  }

  // If no structured elements found, fallback to paragraph splitting
  if (structure.length === 0) {
    console.log('[DocxParser] No structured elements found, falling back to text parsing');
    const textContent = stripHtmlTags(html);
    const paragraphs = textContent.split(/\n\s*\n/).filter(p => p.trim());
    
    for (const paragraph of paragraphs) {
      structure.push({
        type: 'paragraph',
        content: paragraph.trim(),
        formatting: {}
      });
    }
  }

  console.log(`[DocxParser] Final structure has ${structure.length} elements:`, structure.map(el => ({
    type: el.type,
    content: el.content.substring(0, 50) + (el.content.length > 50 ? '...' : ''),
    level: el.level
  })));

  return structure;
}

/**
 * Extract table content from HTML table elements
 */
function extractTableContent(tableHtml: string): string {
  // Extract table rows and cells
  const rows = tableHtml.match(/<tr[^>]*>(.*?)<\/tr>/gi) || [];
  const tableData: string[] = [];
  
  for (const row of rows) {
    const cells = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi) || [];
    const rowData = cells.map(cell => stripHtmlTags(cell).trim()).join(' | ');
    if (rowData) {
      tableData.push(rowData);
    }
  }
  
  return tableData.join('\n') || 'Table content';
}

/**
 * Extract list content from HTML list elements
 */
function extractListContent(listHtml: string): string {
  const items = listHtml.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
  return items.map(item => `• ${stripHtmlTags(item).trim()}`).join('\n') || 'List item';
}

/**
 * Extract inline formatting from HTML element
 */
function extractInlineFormatting(htmlElement: string): DocxFormatting {
  const formatting: DocxFormatting = {};
  
  // Extract style attribute
  const styleMatch = htmlElement.match(/style="([^"]*)"/i);
  if (styleMatch) {
    const styles = styleMatch[1];
    
    if (styles.includes('font-weight:bold') || styles.includes('font-weight: bold')) {
      formatting.bold = true;
    }
    if (styles.includes('font-style:italic') || styles.includes('font-style: italic')) {
      formatting.italic = true;
    }
    if (styles.includes('text-decoration:underline') || styles.includes('text-decoration: underline')) {
      formatting.underline = true;
    }
    
    const fontSizeMatch = styles.match(/font-size:\s*(\d+(?:\.\d+)?)(px|pt|em)/i);
    if (fontSizeMatch) {
      formatting.fontSize = parseFloat(fontSizeMatch[1]);
    }
    
    const fontFamilyMatch = styles.match(/font-family:\s*([^;]+)/i);
    if (fontFamilyMatch) {
      formatting.fontFamily = fontFamilyMatch[1].replace(/["']/g, '').trim();
    }
    
    const colorMatch = styles.match(/color:\s*([^;]+)/i);
    if (colorMatch) {
      formatting.color = colorMatch[1].trim();
    }
    
    const alignMatch = styles.match(/text-align:\s*([^;]+)/i);
    if (alignMatch) {
      const align = alignMatch[1].trim() as 'left' | 'center' | 'right' | 'justify';
      formatting.alignment = align;
    }
  }
  
  // Extract formatting from element tags
  if (htmlElement.includes('<strong>') || htmlElement.includes('<b>')) {
    formatting.bold = true;
  }
  if (htmlElement.includes('<em>') || htmlElement.includes('<i>')) {
    formatting.italic = true;
  }
  if (htmlElement.includes('<u>')) {
    formatting.underline = true;
  }
  
  return formatting;
}

/**
 * Parse plain text into document structure
 * TODO: Replace with proper docx library parsing
 */
function parseTextToStructure(text: string): DocxElement[] {
  const lines = text.split('\n');
  const structure: DocxElement[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      // Skip empty lines
      continue;
    }
    
    // Detect headings (lines that are short and may be titles)
    if (line.length < 60 && (
      line.match(/^[A-Z][^.!?]*$/) || // All caps or title case without punctuation
      line.match(/^\d+\.?\s/) || // Numbered sections
      lines[i + 1] && lines[i + 1].trim() === '' // Followed by empty line
    )) {
      structure.push({
        type: 'heading',
        content: line,
        level: 1,
        formatting: {
          bold: true,
          fontSize: 16
        }
      });
    } else {
      // Regular paragraph
      structure.push({
        type: 'paragraph',
        content: line,
        formatting: {
          fontSize: 12
        }
      });
    }
  }
  
  return structure;
}

/**
 * Render document structure to HTML for display
 */
function renderStructureToHtml(structure: DocxElement[]): string {
  let html = '<div class="docx-document">';
  
  for (const element of structure) {
    html += renderElementToHtml(element);
  }
  
  html += '</div>';
  return html;
}

/**
 * Render individual element to HTML
 */
function renderElementToHtml(element: DocxElement): string {
  const style = formatToStyle(element.formatting);
  
  switch (element.type) {
    case 'heading':
      const level = element.level || 1;
      return `<h${level} style="${style}">${escapeHtml(element.content)}</h${level}>`;
    
    case 'paragraph':
      return `<p style="${style}">${escapeHtml(element.content)}</p>`;
    
    case 'table':
      // TODO: Implement table rendering
      return `<div class="table-placeholder" style="${style}">Table: ${escapeHtml(element.content)}</div>`;
    
    case 'list':
      // TODO: Implement list rendering
      return `<ul><li style="${style}">${escapeHtml(element.content)}</li></ul>`;
    
    case 'image':
      // TODO: Implement image rendering
      return `<div class="image-placeholder" style="${style}">Image: ${escapeHtml(element.content)}</div>`;
    
    default:
      return `<div style="${style}">${escapeHtml(element.content)}</div>`;
  }
}

/**
 * Convert formatting object to CSS style string
 */
function formatToStyle(formatting?: DocxFormatting): string {
  if (!formatting) return '';
  
  const styles: string[] = [];
  
  if (formatting.bold) styles.push('font-weight: bold');
  if (formatting.italic) styles.push('font-style: italic');
  if (formatting.underline) styles.push('text-decoration: underline');
  if (formatting.fontSize) styles.push(`font-size: ${formatting.fontSize}px`);
  if (formatting.fontFamily) styles.push(`font-family: "${formatting.fontFamily}"`);
  if (formatting.color) styles.push(`color: ${formatting.color}`);
  if (formatting.alignment) styles.push(`text-align: ${formatting.alignment}`);
  
  return styles.join('; ');
}

/**
 * Create DOCX document from structure using docx library
 */
function createDocxFromStructure(structure: DocxElement[], metadata?: DocxMetadata): Document {
  const children: (Paragraph)[] = [];
  
  for (const element of structure) {
    switch (element.type) {
      case 'heading':
        children.push(
          new Paragraph({
            text: element.content,
            heading: getHeadingLevel(element.level || 1),
            spacing: {
              after: 200,
            },
          })
        );
        break;
      
      case 'paragraph':
        const textRuns: TextRun[] = [];
        
        // Create text run with formatting
        textRuns.push(
          new TextRun({
            text: element.content,
            bold: element.formatting?.bold,
            italics: element.formatting?.italic,
            underline: element.formatting?.underline ? {} : undefined,
            size: element.formatting?.fontSize ? element.formatting.fontSize * 2 : 24, // Word uses half-points
            font: element.formatting?.fontFamily,
          })
        );
        
        children.push(
          new Paragraph({
            children: textRuns,
            spacing: {
              after: 120,
            },
          })
        );
        break;
      
      case 'table':
        // For now, render tables as paragraphs with special formatting
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Table] ${element.content}`,
                italics: true,
                size: 22,
              }),
            ],
            spacing: {
              after: 120,
            },
          })
        );
        break;
      
      case 'list':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${element.content}`,
                size: element.formatting?.fontSize ? element.formatting.fontSize * 2 : 24,
              }),
            ],
            spacing: {
              after: 120,
            },
          })
        );
        break;
      
      case 'image':
        // For now, render images as paragraphs with placeholders
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Image] ${element.content}`,
                italics: true,
                size: 22,
              }),
            ],
            spacing: {
              after: 120,
            },
          })
        );
        break;
      
      default:
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.content,
                size: 24,
              }),
            ],
            spacing: {
              after: 120,
            },
          })
        );
        break;
    }
  }
  
  // Create the document
  return new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
    title: metadata?.title,
    creator: metadata?.author || 'OnlySaid DOCX Editor',
    description: metadata?.description,
  });
}

/**
 * Convert heading level to Word heading level
 */
function getHeadingLevel(level: number): typeof HeadingLevel[keyof typeof HeadingLevel] {
  switch (level) {
    case 1: return HeadingLevel.HEADING_1;
    case 2: return HeadingLevel.HEADING_2;
    case 3: return HeadingLevel.HEADING_3;
    case 4: return HeadingLevel.HEADING_4;
    case 5: return HeadingLevel.HEADING_5;
    case 6: return HeadingLevel.HEADING_6;
    default: return HeadingLevel.HEADING_1;
  }
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Write file with retry logic for handling EBUSY and other file locking errors
 */
async function writeFileWithRetry(filePath: string, data: Buffer | string, maxRetries: number = 5): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Strategy 1: Try direct write
      await fs.promises.writeFile(filePath, data);
      return { success: true };
      
    } catch (error: any) {
      console.log(`[FileWrite] Attempt ${attempt}/${maxRetries} failed:`, error.code, error.message);
      
      if (error.code === 'EBUSY' || error.code === 'EACCES') {
        if (attempt === maxRetries) {
          // Final attempt: try the temp file strategy
          try {
            return await writeFileWithTempStrategy(filePath, data);
          } catch (tempError: any) {
            return {
              success: false,
              error: `File is locked by another application. Please close the file in other applications (like Microsoft Word) and try again. Original error: ${error.message}`,
              errorCode: error.code
            };
          }
        }
        
        // Wait with exponential backoff
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[FileWrite] Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        continue;
      } else {
        // Non-retryable error
        return {
          success: false,
          error: error.message,
          errorCode: error.code
        };
      }
    }
  }
  
  return {
    success: false,
    error: 'Maximum retry attempts reached. File appears to be locked by another application.',
    errorCode: 'EBUSY'
  };
}

/**
 * Write file using temporary file strategy (safer for locked files)
 */
async function writeFileWithTempStrategy(filePath: string, data: Buffer | string): Promise<{ success: boolean; error?: string }> {
  const dir = path.dirname(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath);
  
  // Create a temporary file name
  const tempFileName = `${fileName}_temp_${Date.now()}${ext}`;
  const tempFilePath = path.join(dir, tempFileName);
  
  try {
    // Write to temporary file first
    await fs.promises.writeFile(tempFilePath, data);
    
    // Try to replace the original file
    try {
      // On Windows, we need to delete the original file first if it exists
      if (os.platform() === 'win32') {
        try {
          await fs.promises.access(filePath);
          await fs.promises.unlink(filePath);
        } catch (unlinkError: any) {
          if (unlinkError.code !== 'ENOENT') {
            throw unlinkError;
          }
        }
      }
      
      // Rename temp file to original name
      await fs.promises.rename(tempFilePath, filePath);
      
      console.log(`[FileWrite] Successfully saved file using temp strategy: ${filePath}`);
      return { success: true };
      
    } catch (renameError: any) {
      // Clean up temp file
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (cleanupError) {
        console.error('[FileWrite] Failed to cleanup temp file:', cleanupError);
      }
      throw renameError;
    }
    
  } catch (error: any) {
    // Clean up temp file if it exists
    try {
      await fs.promises.unlink(tempFilePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
}

/**
 * Update existing DOCX structure with new text content
 */
function updateStructureWithText(existingStructure: DocxElement[], newText: string): DocxElement[] {
  // Simple strategy: replace all paragraph content with new text
  // For more sophisticated updates, we could implement diff-based merging
  
  const paragraphs = newText.split(/\n\s*\n/).filter(p => p.trim());
  const updatedStructure: DocxElement[] = [];
  
  // Preserve headings and structure where possible
  let paragraphIndex = 0;
  
  for (const element of existingStructure) {
    if (element.type === 'heading') {
      // Keep existing headings if they still exist in the new text
      const headingText = element.content.trim();
      if (newText.includes(headingText)) {
        updatedStructure.push(element);
      }
    } else if (element.type === 'paragraph' && paragraphIndex < paragraphs.length) {
      // Update paragraph content
      updatedStructure.push({
        ...element,
        content: paragraphs[paragraphIndex]
      });
      paragraphIndex++;
    }
  }
  
  // Add any remaining paragraphs
  while (paragraphIndex < paragraphs.length) {
    updatedStructure.push({
      type: 'paragraph',
      content: paragraphs[paragraphIndex],
      formatting: {
        fontSize: 12
      }
    });
    paragraphIndex++;
  }
  
  // If no structure, create basic paragraph structure
  if (updatedStructure.length === 0) {
    return parseTextToStructure(newText);
  }
  
  return updatedStructure;
}

/**
 * Validate if a buffer contains a valid ZIP file signature
 * DOCX files are ZIP archives and can have multiple valid signatures
 */
function isValidZipFile(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }
  
  // Check for various valid ZIP signatures
  const signature = buffer.readUInt32LE(0);
  
  // Standard ZIP signatures
  const validSignatures = [
    0x04034b50, // Standard ZIP local file header signature "PK\x03\x04"
    0x08074b50, // ZIP data descriptor signature "PK\x07\x08"
    0x02014b50, // ZIP central directory file header signature "PK\x01\x02"
    0x06054b50, // ZIP end of central directory signature "PK\x05\x06"
    0x30304b50, // Alternative signature pattern sometimes used
    0x06064b50, // ZIP64 end of central directory signature "PK\x06\x06"
    0x07064b50, // ZIP64 end of central directory locator signature "PK\x06\x07"
  ];
  
  // Check if the signature matches any valid ZIP signature
  if (validSignatures.includes(signature)) {
    return true;
  }
  
  // Also check the traditional byte-by-byte method for "PK" header
  const pkSignature = buffer[0] === 0x50 && buffer[1] === 0x4B; // "PK"
  if (pkSignature) {
    return true;
  }
  
  // Check for empty ZIP file signature
  if (buffer.length >= 22) {
    // Look for ZIP end of central directory signature anywhere in the first 22 bytes
    for (let i = 0; i <= buffer.length - 4; i++) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Export types for use in renderer
 */
export type { DocxDocument, DocxElement, DocxFormatting, DocxMetadata };

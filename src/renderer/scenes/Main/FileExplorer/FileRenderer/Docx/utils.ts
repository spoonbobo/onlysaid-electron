import { DocxElement } from './types';

// Check if file is a supported DOCX document
export const isSupportedDocument = (fileName: string): { isSupported: boolean; type: string } => {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  // Microsoft Office formats - specifically DOCX and DOC
  const officeExts = ['.docx', '.doc'];
  if (officeExts.includes(ext)) {
    return { isSupported: true, type: 'office' };
  }
  
  return { isSupported: false, type: 'unknown' };
};

// Get file size in human readable format
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get word count estimate
export const getWordCount = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Estimate lines for an element (more accurate than character count)
export const estimateElementLines = (element: DocxElement): number => {
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

// Get the visual height of a document element
export const getElementHeight = (element: DocxElement, fontSize: number): number => {
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

// Calculate accurate position of an element in the page structure
export const calculateElementPositionInPages = (elementIndex: number, structure: DocxElement[], fontSize: number) => {
  // Reconstruct the page layout logic to match renderStructuredContent
  const pages: DocxElement[][] = [];
  let currentPage: DocxElement[] = [];
  let currentPageLines = 0;
  const LINES_PER_PAGE = 50;
  
  for (const element of structure) {
    if (element.formatting?.pageBreak && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [element];
      currentPageLines = estimateElementLines(element);
    } else {
      const elementLines = estimateElementLines(element);
      if (currentPageLines + elementLines > LINES_PER_PAGE && currentPage.length > 0) {
        if (element.type === 'heading' || 
            (element.type === 'paragraph' && element.content.length < 200)) {
          pages.push(currentPage);
          currentPage = [element];
          currentPageLines = elementLines;
        } else {
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

  // Find which page and position within page the target element is
  let globalElementIndex = 0;
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    
    for (let pageElementIndex = 0; pageElementIndex < page.length; pageElementIndex++) {
      if (globalElementIndex === elementIndex) {
        // Found the target element, calculate its position
        let positionInPage = 0;
        for (let i = 0; i < pageElementIndex; i++) {
          positionInPage += getElementHeight(page[i], fontSize);
        }
        
        // Calculate the absolute position considering:
        // 1. Previous pages (each with spacing between them)
        // 2. Current page top margin
        // 3. Position within the current page
        // Match the actual page styling from renderStructuredContent
        const pageHeightInPx = 792; // 11 inches * 72 DPI ≈ 792px
        const pageSpacing = 30; // Space between pages (margin bottom)
        const pageTopPadding = 20; // Page padding
        const workspaceTopPadding = 24; // Top padding of workspace container
        
        const absoluteTop = 
          (pageIndex * (pageHeightInPx + pageSpacing)) + // Previous pages
          pageTopPadding + // Current page top padding
          positionInPage + // Position within page
          workspaceTopPadding; // Workspace padding
        
        return {
          top: absoluteTop,
          height: getElementHeight(structure[elementIndex], fontSize),
          pageIndex,
          positionInPage,
          globalElementIndex
        };
      }
      globalElementIndex++;
    }
  }
  
  // Fallback to simple calculation
  return {
    top: elementIndex * 40 + 60,
    height: 40,
    pageIndex: 0,
    positionInPage: 0,
    globalElementIndex: elementIndex
  };
};
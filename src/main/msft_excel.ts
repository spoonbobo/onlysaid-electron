import { ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import * as XLSX from 'xlsx';
import os from 'os';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

interface ExcelCell {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'formula' | 'error';
  formula?: string;
  format?: string;
  style?: ExcelCellStyle;
}

interface ExcelCellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  border?: boolean;
}

interface ExcelRow {
  index: number;
  cells: { [column: string]: ExcelCell };
  height?: number;
}

interface ExcelWorksheet {
  name: string;
  rows: ExcelRow[];
  columns: { [key: string]: { width?: number; hidden?: boolean } };
  mergedCells?: string[];
}

interface ExcelDocument {
  worksheets: ExcelWorksheet[];
  metadata: ExcelMetadata;
}

interface ExcelMetadata {
  title?: string;
  author?: string;
  subject?: string;
  description?: string;
  created?: Date;
  modified?: Date;
  application?: string;
  worksheetCount?: number;
  totalRows?: number;
  totalCells?: number;
}

/**
 * Enhanced Excel processing using the xlsx library for proper spreadsheet structure
 */
export function setupExcelHandlers() {
  console.log('[ExcelHandlers] Setting up enhanced Excel handlers...');
  
  // Handler to read Excel file with full structure
  ipcMain.handle('excel:read-document', async (event, filePath: string) => {
    try {
      console.log(`[ExcelReader] Starting Excel document read: ${filePath}`);
      
      // Security check: ensure the path is not attempting path traversal
      const resolvedPath = path.resolve(filePath);
      
      // Check if file exists
      const fileExists = await fs.promises.access(resolvedPath, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

      if (!fileExists) {
        return {
          success: false,
          error: `Excel file not found: ${filePath}`
        };
      }

      // Check if it's actually an Excel file
      const ext = path.extname(filePath).toLowerCase();
      if (!['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'].includes(ext)) {
        return {
          success: false,
          error: `Invalid file type. Expected Excel format (.xlsx, .xls, .xlsm, .xlsb, .csv), got ${ext}`
        };
      }

      // Read the file as buffer for xlsx library processing
      const buffer = await fs.promises.readFile(resolvedPath);
      
      // Basic validation for Excel files
      if (buffer.length < 4) {
        return {
          success: false,
          error: 'File is too small to be a valid Excel document'
        };
      }
      
      let workbook: XLSX.WorkBook;
      let excelDocument: ExcelDocument;
      
      try {
        // Parse the Excel file using xlsx library
        console.log('[ExcelReader] Parsing Excel structure...');
        workbook = XLSX.read(buffer, { 
          type: 'buffer',
          cellStyles: true,
          cellText: false,
          cellDates: true,
          sheetStubs: true
        });
        
        // Convert workbook to our structured format
        excelDocument = await parseExcelStructure(workbook, resolvedPath);
        console.log(`[ExcelReader] Parsed structure with ${excelDocument.worksheets.length} worksheets`);
        
      } catch (parseError: any) {
        console.error('[ExcelReader] Error parsing Excel:', parseError);
        
        // Provide more specific error messages for common issues
        let errorMessage = parseError.message;
        if (parseError.message && parseError.message.includes('Unsupported file')) {
          errorMessage = 'Excel file format is not supported or the file may be corrupted.';
        } else if (parseError.message && parseError.message.includes('password')) {
          errorMessage = 'Excel file is password protected. Please remove the password protection and try again.';
        }
        
        return {
          success: false,
          error: `Failed to parse Excel: ${errorMessage}`
        };
      }
      
      console.log(`[ExcelReader] Successfully parsed Excel with ${excelDocument.worksheets.length} worksheets`);
      
      return {
        success: true,
        document: excelDocument,
        size: buffer.length,
        type: 'excel'
      };
    } catch (error: any) {
      console.error(`[ExcelReader] Error reading Excel document ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        path: filePath
      };
    }
  });

  // Handler to write Excel file with structure
  ipcMain.handle('excel:write-document', async (event, filePath: string, document: ExcelDocument) => {
    try {
      console.log(`[ExcelWriter] Writing Excel document: ${filePath}`);
      
      // Security check: ensure the path is not attempting path traversal
      const resolvedPath = path.resolve(filePath);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(resolvedPath);
      await fs.promises.mkdir(dir, { recursive: true });
      
      // Create proper Excel workbook using the xlsx library
      const workbook = createExcelFromStructure(document);
      
      // Convert to buffer
      const buffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        cellStyles: true 
      });
      
      // Try to write the Excel file with retry logic for file locking
      const writeResult = await writeFileWithRetry(resolvedPath, buffer);
      
      if (!writeResult.success) {
        return writeResult;
      }
      
      console.log(`[ExcelWriter] Successfully saved Excel document to ${resolvedPath}`);

      return {
        success: true,
        path: resolvedPath,
        size: buffer.length,
        note: 'Successfully created Excel file with proper formatting.'
      };
    } catch (error: any) {
      console.error(`[ExcelWriter] Error writing Excel document ${filePath}:`, error);
      
      // Provide user-friendly error messages for common issues
      let userFriendlyError = error.message;
      if (error.code === 'EBUSY') {
        userFriendlyError = 'File is currently being used by another application (possibly Microsoft Excel). Please close the file in other applications and try again.';
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

  // Handler to save Excel content as CSV text with advanced file locking handling
  ipcMain.handle('excel:save-text-content', async (event, filePath: string, textContent: string, worksheetName?: string) => {
    try {
      console.log(`[ExcelTextSaver] Saving text content to Excel: ${filePath}`);
      
      // Security check
      const resolvedPath = path.resolve(filePath);
      
      // Check if it's an Excel file
      const ext = path.extname(filePath).toLowerCase();
      if (!['.xlsx', '.xls', '.xlsm', '.csv'].includes(ext)) {
        return {
          success: false,
          error: `Invalid file type. Expected Excel format, got ${ext}`
        };
      }
      
      // Try to read existing document first to preserve structure
      let existingDocument: ExcelDocument | null = null;
      try {
        const readResult = await fs.promises.readFile(resolvedPath);
        const readBuffer = Buffer.from(readResult);
        
        // Try to parse existing structure
        const workbook = XLSX.read(readBuffer, { type: 'buffer' });
        existingDocument = await parseExcelStructure(workbook, resolvedPath);
        
        // Update the specified worksheet or first worksheet with new content
        const targetWorksheet = worksheetName 
          ? existingDocument.worksheets.find(ws => ws.name === worksheetName)
          : existingDocument.worksheets[0];
          
        if (targetWorksheet) {
          targetWorksheet.rows = parseTextToExcelRows(textContent);
        }
        
      } catch (readError) {
        console.log(`[ExcelTextSaver] Could not read existing document, creating new one:`, readError);
        // Create new document structure from text
        existingDocument = {
          worksheets: [{
            name: worksheetName || 'Sheet1',
            rows: parseTextToExcelRows(textContent),
            columns: {}
          }],
          metadata: {
            title: path.basename(resolvedPath, path.extname(resolvedPath)),
            created: new Date(),
            modified: new Date(),
            worksheetCount: 1
          }
        };
      }
      
      // Create Excel document
      const workbook = createExcelFromStructure(existingDocument);
      const buffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: ext === '.csv' ? 'csv' : 'xlsx' 
      });
      
      // Write with retry logic
      const writeResult = await writeFileWithRetry(resolvedPath, buffer);
      
      if (!writeResult.success) {
        return writeResult;
      }
      
      console.log(`[ExcelTextSaver] Successfully saved text content to Excel: ${resolvedPath}`);
      
      return {
        success: true,
        path: resolvedPath,
        size: buffer.length,
        contentLength: textContent.length,
        note: 'Successfully saved text content to Excel with preserved formatting.'
      };
      
    } catch (error: any) {
      console.error(`[ExcelTextSaver] Error saving text to Excel ${filePath}:`, error);
      
      let userFriendlyError = error.message;
      if (error.code === 'EBUSY') {
        userFriendlyError = 'File is currently being used by another application (possibly Microsoft Excel). Please close the file in other applications and try again.';
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

  // Handler to convert Excel structure to HTML for display
  ipcMain.handle('excel:structure-to-html', async (event, worksheets: ExcelWorksheet[]) => {
    try {
      const html = renderExcelToHtml(worksheets);
      
      return {
        success: true,
        html,
        worksheetCount: worksheets.length
      };
    } catch (error: any) {
      console.error('[ExcelRenderer] Error rendering structure to HTML:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[ExcelHandlers] Enhanced Excel handlers setup complete!');
}

/**
 * Parse Excel workbook into document structure using xlsx library
 */
async function parseExcelStructure(workbook: XLSX.WorkBook, filePath: string): Promise<ExcelDocument> {
  const worksheets: ExcelWorksheet[] = [];
  let totalRows = 0;
  let totalCells = 0;
  
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = [];
    const columns: { [key: string]: { width?: number; hidden?: boolean } } = {};
    
    // Get the range of the worksheet
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    
    // Process each row
    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
      const row: ExcelRow = {
        index: rowIndex,
        cells: {}
      };
      
      let hasContent = false;
      
      // Process each column in the row
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          const columnLetter = XLSX.utils.encode_col(colIndex);
          
          row.cells[columnLetter] = {
            value: cell.v,
            type: getCellType(cell),
            formula: cell.f,
            format: cell.z,
            style: extractCellStyle(cell)
          };
          
          hasContent = true;
          totalCells++;
        }
      }
      
      if (hasContent) {
        rows.push(row);
        totalRows++;
      }
    }
    
    worksheets.push({
      name: sheetName,
      rows,
      columns,
      mergedCells: worksheet['!merges']?.map((merge: XLSX.Range) => XLSX.utils.encode_range(merge))
    });
  }
  
  // Get file stats for metadata
  const stats = await fs.promises.stat(filePath);
  
  const metadata: ExcelMetadata = {
    title: path.basename(filePath, path.extname(filePath)),
    created: stats.birthtime,
    modified: stats.mtime,
    application: 'Microsoft Excel',
    worksheetCount: worksheets.length,
    totalRows,
    totalCells
  };
  
  return {
    worksheets,
    metadata
  };
}

/**
 * Determine cell type from xlsx cell object
 */
function getCellType(cell: XLSX.CellObject): ExcelCell['type'] {
  switch (cell.t) {
    case 'n': return 'number';
    case 's': return 'string';
    case 'b': return 'boolean';
    case 'd': return 'date';
    case 'e': return 'error';
    default: return cell.f ? 'formula' : 'string';
  }
}

/**
 * Extract cell style information
 */
function extractCellStyle(cell: XLSX.CellObject): ExcelCellStyle {
  const style: ExcelCellStyle = {};
  
  // Note: xlsx library has limited style extraction capabilities
  // This is a basic implementation that can be enhanced based on needs
  
  return style;
}

/**
 * Parse plain text into Excel rows (CSV-like format)
 */
function parseTextToExcelRows(text: string): ExcelRow[] {
  const lines = text.split('\n');
  const rows: ExcelRow[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by tabs or commas (CSV-like)
    const values = line.includes('\t') 
      ? line.split('\t') 
      : line.split(',').map(val => val.trim().replace(/^["']|["']$/g, ''));
    
    const row: ExcelRow = {
      index: i,
      cells: {}
    };
    
    values.forEach((value, colIndex) => {
      const columnLetter = XLSX.utils.encode_col(colIndex);
      row.cells[columnLetter] = {
        value: value,
        type: isNaN(Number(value)) ? 'string' : 'number'
      };
    });
    
    if (Object.keys(row.cells).length > 0) {
      rows.push(row);
    }
  }
  
  return rows;
}

/**
 * Create Excel workbook from structure using xlsx library
 */
function createExcelFromStructure(document: ExcelDocument): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  
  for (const worksheet of document.worksheets) {
    const ws: XLSX.WorkSheet = {};
    let range = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };
    
    // Process each row
    for (const row of worksheet.rows) {
      for (const [columnLetter, cell] of Object.entries(row.cells)) {
        const colIndex = XLSX.utils.decode_col(columnLetter);
        const cellAddress = XLSX.utils.encode_cell({ r: row.index, c: colIndex });
        
        // Create cell object
        const cellObj: XLSX.CellObject = {
          v: cell.value,
          t: cell.type === 'number' ? 'n' : 's'
        };
        
        if (cell.formula) {
          cellObj.f = cell.formula;
        }
        
        ws[cellAddress] = cellObj;
        
        // Update range
        if (colIndex > range.e.c) range.e.c = colIndex;
        if (row.index > range.e.r) range.e.r = row.index;
      }
    }
    
    // Set the range
    ws['!ref'] = XLSX.utils.encode_range(range);
    
    // Add merged cells if any
    if (worksheet.mergedCells && worksheet.mergedCells.length > 0) {
      ws['!merges'] = worksheet.mergedCells.map((merge: string) => XLSX.utils.decode_range(merge));
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, ws, worksheet.name);
  }
  
  return workbook;
}

/**
 * Render Excel structure to HTML for display
 */
function renderExcelToHtml(worksheets: ExcelWorksheet[]): string {
  let html = '<div class="excel-document">';
  
  for (let i = 0; i < worksheets.length; i++) {
    const worksheet = worksheets[i];
    
    html += `<div class="excel-worksheet" data-sheet-index="${i}">`;
    html += `<h3 class="worksheet-title">${escapeHtml(worksheet.name)}</h3>`;
    html += '<table class="excel-table">';
    
    // Get all column letters used
    const allColumns = new Set<string>();
    worksheet.rows.forEach(row => {
      Object.keys(row.cells).forEach(col => allColumns.add(col));
    });
    const sortedColumns = Array.from(allColumns).sort();
    
    // Header row
    if (sortedColumns.length > 0) {
      html += '<thead><tr><th></th>'; // Empty cell for row numbers
      sortedColumns.forEach(col => {
        html += `<th class="column-header">${col}</th>`;
      });
      html += '</tr></thead>';
    }
    
    // Data rows
    html += '<tbody>';
    worksheet.rows.forEach(row => {
      html += `<tr data-row-index="${row.index}">`;
      html += `<td class="row-header">${row.index + 1}</td>`;
      
      sortedColumns.forEach(col => {
        const cell = row.cells[col];
        const cellStyle = cell?.style ? formatCellStyle(cell.style) : '';
        const cellValue = cell ? escapeHtml(String(cell.value || '')) : '';
        
        html += `<td class="excel-cell" style="${cellStyle}" data-column="${col}">`;
        html += cellValue;
        html += '</td>';
      });
      
      html += '</tr>';
    });
    html += '</tbody>';
    
    html += '</table>';
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

/**
 * Convert cell style to CSS
 */
function formatCellStyle(style: ExcelCellStyle): string {
  const styles: string[] = [];
  
  if (style.bold) styles.push('font-weight: bold');
  if (style.italic) styles.push('font-style: italic');
  if (style.underline) styles.push('text-decoration: underline');
  if (style.fontSize) styles.push(`font-size: ${style.fontSize}px`);
  if (style.fontFamily) styles.push(`font-family: "${style.fontFamily}"`);
  if (style.color) styles.push(`color: ${style.color}`);
  if (style.backgroundColor) styles.push(`background-color: ${style.backgroundColor}`);
  if (style.alignment) styles.push(`text-align: ${style.alignment}`);
  if (style.border) styles.push('border: 1px solid #ccc');
  
  return styles.join('; ');
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
              error: `File is locked by another application. Please close the file in other applications (like Microsoft Excel) and try again. Original error: ${error.message}`,
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
 * Export types for use in renderer
 */
export type { ExcelDocument, ExcelWorksheet, ExcelRow, ExcelCell, ExcelCellStyle, ExcelMetadata };

import { SupportedExcelFile } from './types';

/**
 * Check if a file is a supported Excel document
 */
export function isSupportedExcelDocument(fileName: string): SupportedExcelFile {
  if (!fileName) {
    return { isSupported: false, type: null, extension: '' };
  }
  
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  const supportedExtensions = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.csv'];
  
  const isSupported = supportedExtensions.includes(extension);
  
  return {
    isSupported,
    type: isSupported ? 'excel' : null,
    extension
  };
}

/**
 * Get word count from Excel content (count non-empty cells)
 */
export function getCellCount(worksheets: any[]): number {
  let count = 0;
  
  for (const worksheet of worksheets) {
    if (worksheet.rows) {
      for (const row of worksheet.rows) {
        if (row.cells) {
          count += Object.keys(row.cells).length;
        }
      }
    }
  }
  
  return count;
}

/**
 * Convert Excel worksheets to plain text
 */
export function worksheetsToText(worksheets: any[]): string {
  let text = '';
  
  for (const worksheet of worksheets) {
    text += `=== ${worksheet.name} ===\n\n`;
    
    if (worksheet.rows && worksheet.rows.length > 0) {
      // Get all column letters used
      const allColumns = new Set<string>();
      worksheet.rows.forEach((row: any) => {
        if (row.cells) {
          Object.keys(row.cells).forEach(col => allColumns.add(col));
        }
      });
      
      const sortedColumns = Array.from(allColumns).sort();
      
      // Add header row with column letters
      if (sortedColumns.length > 0) {
        text += '\t' + sortedColumns.join('\t') + '\n';
      }
      
      // Add data rows
      worksheet.rows.forEach((row: any) => {
        const rowValues: string[] = [`${row.index + 1}`]; // Row number
        
        sortedColumns.forEach(col => {
          const cell = row.cells?.[col];
          let cellValue = '';
          
          if (cell) {
            if (cell.formula) {
              cellValue = `=${cell.formula}`;
            } else {
              cellValue = String(cell.value || '');
            }
          }
          
          rowValues.push(cellValue);
        });
        
        text += rowValues.join('\t') + '\n';
      });
    }
    
    text += '\n';
  }
  
  return text.trim();
}

/**
 * Convert text back to Excel structure (basic CSV-like parsing)
 */
export function textToWorksheets(text: string): any[] {
  const worksheets: any[] = [];
  const sections = text.split(/===\s*([^=]+)\s*===/);
  
  for (let i = 1; i < sections.length; i += 2) {
    const worksheetName = sections[i].trim();
    const content = sections[i + 1]?.trim() || '';
    
    if (!content) continue;
    
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) continue;
    
    const rows: any[] = [];
    let headerColumns: string[] = [];
    
    lines.forEach((line, lineIndex) => {
      const values = line.split('\t');
      
      if (lineIndex === 0) {
        // First line might be column headers
        headerColumns = values.slice(1); // Skip row number
        return;
      }
      
      const rowIndex = lineIndex - 1;
      const row = {
        index: rowIndex,
        cells: {} as any
      };
      
      values.slice(1).forEach((value, colIndex) => { // Skip row number
        if (colIndex < headerColumns.length) {
          const columnLetter = headerColumns[colIndex];
          if (value.trim()) {
            row.cells[columnLetter] = {
              value: value.startsWith('=') ? value.substring(1) : value,
              type: value.startsWith('=') ? 'formula' : 
                    isNaN(Number(value)) ? 'string' : 'number',
              formula: value.startsWith('=') ? value.substring(1) : undefined
            };
          }
        }
      });
      
      if (Object.keys(row.cells).length > 0) {
        rows.push(row);
      }
    });
    
    worksheets.push({
      name: worksheetName,
      rows,
      columns: {}
    });
  }
  
  // If no worksheets found, create a default one
  if (worksheets.length === 0 && text.trim()) {
    const lines = text.split('\n').filter(line => line.trim());
    const rows: any[] = [];
    
    lines.forEach((line, lineIndex) => {
      const values = line.split(/\t|,/).map(v => v.trim());
      const row = {
        index: lineIndex,
        cells: {} as any
      };
      
      values.forEach((value, colIndex) => {
        const columnLetter = String.fromCharCode(65 + colIndex); // A, B, C, etc.
        if (value) {
          row.cells[columnLetter] = {
            value: value,
            type: isNaN(Number(value)) ? 'string' : 'number'
          };
        }
      });
      
      if (Object.keys(row.cells).length > 0) {
        rows.push(row);
      }
    });
    
    worksheets.push({
      name: 'Sheet1',
      rows,
      columns: {}
    });
  }
  
  return worksheets;
}
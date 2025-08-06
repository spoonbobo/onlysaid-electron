import { FileNode } from '@/renderer/stores/File/FileExplorerStore';

export interface ExcelPreviewProps {
  node: FileNode;
  maxHeight?: number;
  fontSize?: number;
  hideControls?: boolean;
  isEditable?: boolean;
  onDocumentLoad?: (data: ExcelDocumentData) => void;
  onContentChange?: (content: string) => void;
  externalContent?: string;
  
  // Diff props for showing changes
  showDiff?: boolean;
  diff?: any;
  onApplyDiffBlock?: (block: any) => void;
  onDeclineDiffBlock?: (block: any) => void;
  
  // External control props
  renderMode?: 'table' | 'text';
  useEnhancedReader?: boolean;
  onRenderModeChange?: (mode: 'table' | 'text') => void;
  onReaderTypeChange?: (useEnhanced: boolean) => void;
}

export interface ExcelDocumentData {
  worksheets: ExcelWorksheet[];
  metadata: ExcelMetadata;
  success: boolean;
  type: 'excel';
}

export interface ExcelWorksheet {
  name: string;
  rows: ExcelRow[];
  columns: { [key: string]: { width?: number; hidden?: boolean } };
  mergedCells?: string[];
}

export interface ExcelRow {
  index: number;
  cells: { [column: string]: ExcelCell };
  height?: number;
}

export interface ExcelCell {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'formula' | 'error';
  formula?: string;
  format?: string;
  style?: ExcelCellStyle;
}

export interface ExcelCellStyle {
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

export interface ExcelMetadata {
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

export interface SupportedExcelFile {
  isSupported: boolean;
  type: 'excel' | null;
  extension: string;
}
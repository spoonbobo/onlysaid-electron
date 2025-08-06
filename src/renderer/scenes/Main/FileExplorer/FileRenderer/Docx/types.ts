import { FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { CodeDiff, DiffBlock } from '@/utils/codeDiff';

export interface DocxPreviewProps {
  node: FileNode;
  maxHeight?: number;
  fontSize?: number;
  hideControls?: boolean;
  isEditable?: boolean;
  onDocumentLoad?: (data: DocumentData) => void;
  onContentChange?: (content: string) => void;
  externalContent?: string;
  // Add diff props
  showDiff?: boolean;
  diff?: CodeDiff;
  onApplyDiffBlock?: (block: DiffBlock) => void;
  onDeclineDiffBlock?: (block: DiffBlock) => void;
  // External control props
  renderMode?: 'text' | 'view';
  useEnhancedReader?: boolean;
  onRenderModeChange?: (mode: 'text' | 'view') => void;
  onReaderTypeChange?: (useEnhanced: boolean) => void;
}

export interface DocumentData {
  text: string;
  structure?: DocxElement[];
  htmlContent?: string;
  metadata?: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount?: number;
    modified?: Date | string;
    created?: Date | string;
  };
  success: boolean;
  error?: string;
  type: string;
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

export interface ElementPosition {
  top: number;
  height: number;
  pageIndex: number;
  positionInPage: number;
  globalElementIndex: number;
}
import React from 'react';
import { Alert } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import ImagePreview from './Image';
import TextPreview from './TextPreview';
import DocxPreview from './Docx';
import { FileNode } from '@/renderer/stores/File/FileExplorerStore';
import { CodeDiff, DiffBlock } from '@/utils/codeDiff';

interface FilePreviewProps {
  node: FileNode;
  maxHeight?: number;
  fontSize?: number;
  hideControls?: boolean;
  isEditable?: boolean;
  onDocumentLoad?: (data: any) => void;
  onContentChange?: (content: string) => void;
  externalContent?: string;
  // Add diff props
  showDiff?: boolean;
  diff?: CodeDiff;
  onApplyDiffBlock?: (block: DiffBlock) => void;
  onDeclineDiffBlock?: (block: DiffBlock) => void;
  // External control props for DOCX
  renderMode?: 'text' | 'html' | 'structured';
  useEnhancedReader?: boolean;
  onRenderModeChange?: (mode: 'text' | 'html' | 'structured') => void;
  onReaderTypeChange?: (useEnhanced: boolean) => void;
}

// Helper function to determine file type
const getFileType = (fileName: string): string => {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  // Image formats
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico'];
  if (imageExts.includes(ext)) {
    return 'image';
  }
  
  // DOCX/DOC formats - separate renderer
  const docxExts = ['.docx', '.doc'];
  if (docxExts.includes(ext)) {
    return 'docx';
  }
  
  // Other document formats - text, markdown, and other office documents
  const docExts = ['.txt', '.md', '.markdown', '.csv', '.xlsx', '.xls', '.pptx', '.ppt', '.pdf', '.odt', '.ods', '.odp', '.rtf', '.html', '.htm', '.xml'];
  if (docExts.includes(ext)) {
    return 'document';
  }
  
  // Add more file types here as we implement them
  // const codeExts = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.css'];
  
  return 'unsupported';
};

export default function FilePreview({ 
  node, 
  maxHeight = 400,
  fontSize,
  hideControls = false,
  isEditable = false,
  onDocumentLoad,
  onContentChange,
  externalContent,
  showDiff = false,
  diff,
  onApplyDiffBlock,
  onDeclineDiffBlock,
  // External control props for DOCX
  renderMode,
  useEnhancedReader,
  onRenderModeChange,
  onReaderTypeChange
}: FilePreviewProps) {
  const fileType = getFileType(node.name);

  switch (fileType) {
    case 'image':
      return <ImagePreview node={node} maxHeight={maxHeight} />;
    
    case 'docx':
      return <DocxPreview 
        node={node} 
        maxHeight={maxHeight}
        fontSize={fontSize}
        hideControls={hideControls}
        isEditable={isEditable}
        onDocumentLoad={onDocumentLoad}
        onContentChange={onContentChange}
        externalContent={externalContent}
        showDiff={showDiff}
        diff={diff}
        onApplyDiffBlock={onApplyDiffBlock}
        onDeclineDiffBlock={onDeclineDiffBlock}
        renderMode={renderMode}
        useEnhancedReader={useEnhancedReader}
        onRenderModeChange={onRenderModeChange}
        onReaderTypeChange={onReaderTypeChange}
      />;
    
    case 'document':
      return <TextPreview 
        node={node} 
        maxHeight={maxHeight}
        fontSize={fontSize}
        hideControls={hideControls}
        isEditable={isEditable}
        onDocumentLoad={onDocumentLoad}
        onContentChange={onContentChange}
        externalContent={externalContent}
        showDiff={showDiff}
        diff={diff}
        onApplyDiffBlock={onApplyDiffBlock}
        onDeclineDiffBlock={onDeclineDiffBlock}
      />;
    
    // Add more cases as we implement them
    // case 'code':
    //   return <CodePreview node={node} maxHeight={maxHeight} />;
    
    default:
      return (
        <Alert severity="info">
          <FormattedMessage 
            id="file.preview.notSupported" 
            defaultMessage="Preview not supported for this file type" 
          />
        </Alert>
      );
  }
}

// Export individual components for direct use
export { ImagePreview, TextPreview, DocxPreview };
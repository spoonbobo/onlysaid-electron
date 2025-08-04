import React from 'react';
import { Alert } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import ImagePreview from './Image';
import DocumentPreview from './Docs';
import { FileNode } from '@/renderer/stores/File/FileExplorerStore';

interface FilePreviewProps {
  node: FileNode;
  maxHeight?: number;
}

// Helper function to determine file type
const getFileType = (fileName: string): string => {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  
  // Image formats
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico'];
  if (imageExts.includes(ext)) {
    return 'image';
  }
  
  // Document formats - only txt for now
  const docExts = ['.txt'];
  if (docExts.includes(ext)) {
    return 'document';
  }
  
  // Add more file types here as we implement them
  // const codeExts = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.cpp', '.css'];
  
  return 'unsupported';
};

export default function FilePreview({ node, maxHeight = 400 }: FilePreviewProps) {
  const fileType = getFileType(node.name);

  switch (fileType) {
    case 'image':
      return <ImagePreview node={node} maxHeight={maxHeight} />;
    
    case 'document':
      return <DocumentPreview node={node} maxHeight={maxHeight} />;
    
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
export { ImagePreview, DocumentPreview };
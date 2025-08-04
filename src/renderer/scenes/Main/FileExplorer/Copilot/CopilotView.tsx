import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  Button
} from '@mui/material';
import { toast } from '@/utils/toast';
import {
  Close as CloseIcon,
  AutoAwesome as CopilotIcon,
  ArrowBack as BackIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Save as SaveIcon,
  FiberManualRecord as UnsavedIcon
} from '@mui/icons-material';
import DocumentPreview from '../FileRenderer/Docs';
import Chat from '../../Chat';
import { useCurrentTopicContext } from '@/renderer/stores/Topic/TopicStore';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';
import { useChatStore } from '@/renderer/stores/Chat/ChatStore';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { getUserFromStore } from '@/utils/user';
import { createCodeDiff, CodeDiff, DiffBlock, applyDiffBlock } from '@/utils/codeDiff';
import OverlayDiff from '@/renderer/components/OverlayDiff';

interface CopilotViewProps {
  // Props will be passed via context/store rather than direct props
}

export default function CopilotView({}: CopilotViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [documentData, setDocumentData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [showInlineDiff, setShowInlineDiff] = useState(false);
  const [currentDiff, setCurrentDiff] = useState<CodeDiff | null>(null);
  
  const { selectedContext, setSelectedContext } = useCurrentTopicContext();
  
  // Use Copilot store for state management
  const { 
    currentDocument, 
    currentFileContent,
    splitRatio, 
    setSplitRatio,
    setActive,
    getContextInfo,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    setCurrentFileContent
  } = useCopilotStore();
  
  // Chat and topic management
  const { chats, createChat, updateChat } = useChatStore();
  const { selectedTopics, setSelectedTopic } = useTopicStore();

  // ALL useMemo, useEffect, and other hooks MUST come before any early returns
  
  // Compute unsaved changes state
  const computedHasUnsavedChanges = useMemo(() => {
    return editedContent !== lastSavedContent && editedContent.trim().length > 0;
  }, [editedContent, lastSavedContent]);

  // Calculate max height for the document area to utilize available space
  const maxHeight = useMemo(() => {
    return Math.max(window.innerHeight - 200, 400);
  }, []);

  // Get document info from context or store and clean up name
  const contextInfo = getContextInfo();
  const rawDocumentName = contextInfo?.documentName || selectedContext?.name?.replace('Copilot: ', '') || 'Document';
  
  const cleanDocumentName = (name: string): string => {
    if (!currentDocument) return name;
    
    const baseFileName = currentDocument.name;
    const lastDotIndex = baseFileName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? baseFileName.substring(0, lastDotIndex) : baseFileName;
    
    if (name === baseFileName) {
      return nameWithoutExt;
    }
    
    return name;
  };
  
  const documentName = cleanDocumentName(rawDocumentName);

  // ALL useEffect hooks here
  useEffect(() => {
    setHasUnsavedChanges(computedHasUnsavedChanges);
  }, [computedHasUnsavedChanges, setHasUnsavedChanges]);

  useEffect(() => {
    setActive(true);
    return () => {
      setActive(false);
      setCurrentFileContent(null);
    };
  }, [setActive, setCurrentFileContent]);

  // Auto-create copilot chat if none exists for this document
  useEffect(() => {
    const createCopilotChat = async () => {
      if (!currentDocument || !selectedContext) return;

      const user = getUserFromStore();
      if (!user || !user.id) return;

      // Check if there's already a copilot chat for this document
      const section = selectedContext.section || '';
      const selectedChatId = section ? selectedTopics[section] || '' : '';
      const copilotChats = chats.filter(chat => chat.type === 'copilot');
      
      // If no chat is selected and no copilot chats exist, create one
      if (!selectedChatId && copilotChats.length === 0) {
        try {
          const newChat = await createChat(
            user.id,
            'copilot',
            undefined // No workspace for copilot chats
          );

          if (newChat && section) {
            // Update chat name to include document name
            const chatName = `Copilot: ${currentDocument.name}`;
            await updateChat(newChat.id, { name: chatName }, true);
            
            // Select the new chat
            setSelectedTopic(section, newChat.id);
          }
        } catch (error) {
          console.error('Error creating copilot chat:', error);
        }
      }
    };

    createCopilotChat();
  }, [currentDocument, selectedContext, selectedTopics, chats, createChat, updateChat, setSelectedTopic]);

  // Updated event listener for code application
  useEffect(() => {
    const handleApplyCode = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { code } = customEvent.detail;
      
      if (code && typeof code === 'string') {
        // Create diff between current content and suggested code
        const diff = createCodeDiff(editedContent, code);
        
        if (diff.hasChanges) {
          setCurrentDiff(diff);
          setShowInlineDiff(true);
          toast.info(`Found ${diff.blocks.length} change(s) - review in editor`);
        } else {
          toast.success('No changes needed - code is already up to date!');
        }
      }
    };

    document.addEventListener('onlysaid-apply-code', handleApplyCode);
    
    return () => {
      document.removeEventListener('onlysaid-apply-code', handleApplyCode);
    };
  }, [editedContent]);

  // Handle content changes with auto-save
  const handleContentChange = (content: string) => {
    setEditedContent(content);
    setCurrentFileContent(content); // ADD: Update store with current content
    
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    // Set new timer for auto-save (3 seconds after last change)
    const timer = setTimeout(() => {
      autoSave();
    }, 3000);
    
    setAutoSaveTimer(timer);
  };

  // Handle applying individual diff blocks
  const handleApplyDiffBlock = async (block: DiffBlock) => {
    try {
      // Apply the diff block to get new content
      const newContent = applyDiffBlock(editedContent, block);
      
      // Update the editor content immediately
      setEditedContent(newContent);
      setCurrentFileContent(newContent);
      setLastSavedContent(newContent);
      
      // Remove the applied block from the diff (same logic as decline)
      if (currentDiff) {
        const updatedBlocks = currentDiff.blocks.filter(b => b.id !== block.id);
        const updatedDiff = {
          ...currentDiff,
          blocks: updatedBlocks,
          hasChanges: updatedBlocks.length > 0
        };
        
        setCurrentDiff(updatedDiff);
        
        // Hide diff only if no more changes remain
        if (!updatedDiff.hasChanges) {
          setShowInlineDiff(false);
        }
      }
      
      // Save to file system
      if (currentDocument && window.electron?.fileSystem?.saveDocumentText) {
        const result = await window.electron.fileSystem.saveDocumentText(
          currentDocument.path, 
          newContent
        );
        
        if (result?.success) {
          setDocumentData((prev: any) => ({ ...prev, text: newContent }));
          toast.success(`Applied changes to line ${block.startLine}`);
        } else {
          toast.error(`Failed to save changes: ${result?.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      toast.error('Failed to apply changes');
      console.error('Failed to apply diff block:', error);
    }
  };

  // Function to directly update lines in the DOM
  const updateLinesInDOM = (block: DiffBlock, newContent: string) => {
    try {
      const newLines = newContent.split('\n');
      
      // Find the document preview container (adjust selector as needed)
      const documentContainer = document.querySelector('[data-testid="document-preview"]') || 
                               document.querySelector('.document-content') ||
                               document.querySelector('pre') ||
                               document.querySelector('code');
      
      if (!documentContainer) {
        console.warn('Could not find document container for line updates');
        return;
      }
      
      // Get all line elements (adjust based on how DocumentPreview renders lines)
      const lineElements = documentContainer.querySelectorAll('[data-line-number]') ||
                          documentContainer.querySelectorAll('.line') ||
                          Array.from(documentContainer.children);
      
      if (lineElements.length === 0) {
        // If no line elements found, replace entire content
        if (documentContainer.tagName === 'PRE' || documentContainer.tagName === 'CODE') {
          documentContainer.textContent = newContent;
        } else {
          documentContainer.innerHTML = escapeHtml(newContent.split('\n').map((line, i) => 
            `<div class="line" data-line-number="${i + 1}">${escapeHtml(line)}</div>`
          ).join(''));
        }
        return;
      }
      
      // Update specific lines affected by the diff block
      const addedLines = block.lines.filter(line => line.type === 'added');
      const removedLines = block.lines.filter(line => line.type === 'removed');
      
      // Start from the end to avoid index shifting issues
      for (let i = block.endLine - 1; i >= block.startLine - 1; i--) {
        if (lineElements[i] && newLines[i]) {
          const lineElement = lineElements[i] as HTMLElement;
          
          // Update the line content
          if (lineElement.tagName === 'DIV') {
            lineElement.textContent = newLines[i];
          } else {
            lineElement.innerHTML = escapeHtml(newLines[i]);
          }
          
          // Add visual feedback for changed lines
          lineElement.style.backgroundColor = '#e8f5e8'; // Light green
          lineElement.style.transition = 'background-color 0.3s ease';
          
          // Remove highlight after animation
          setTimeout(() => {
            lineElement.style.backgroundColor = '';
          }, 1000);
        }
      }
      
    } catch (error) {
      console.error('Error updating lines in DOM:', error);
    }
  };

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Handle declining diff blocks
  const handleDeclineDiffBlock = (block: DiffBlock) => {
    toast.info(`Declined changes to line ${block.startLine}`);
    
    // Remove the declined block from the diff
    if (currentDiff) {
      const updatedBlocks = currentDiff.blocks.filter(b => b.id !== block.id);
      const updatedDiff = {
        ...currentDiff,
        blocks: updatedBlocks,
        hasChanges: updatedBlocks.length > 0
      };
      
      setCurrentDiff(updatedDiff);
      
      // Hide diff if no more changes
      if (!updatedDiff.hasChanges) {
        setShowInlineDiff(false);
      }
    }
  };

  // Close inline diff
  const handleCloseDiff = () => {
    setShowInlineDiff(false);
    setCurrentDiff(null);
  };

  // Define handleBack function first
  const handleBack = () => {
    // Navigate back to file explorer
    setActive(false);
    setSelectedContext({
      name: 'file',
      type: 'file'
    });
  };

  // Font control functions
  const handleFontSizeIncrease = () => setFontSize(prev => Math.min(prev + 2, 24));
  const handleFontSizeDecrease = () => setFontSize(prev => Math.max(prev - 2, 10));
  
  // Save function
  const handleSave = async () => {
    if (!currentDocument || !editedContent.trim()) return;
    
    setIsSaving(true);
    try {
      // Debug: Check if the function exists
      console.log('Electron object:', window.electron);
      console.log('FileSystem object:', window.electron?.fileSystem);
      console.log('SaveDocumentText function:', window.electron?.fileSystem?.saveDocumentText);
      
      if (!window.electron?.fileSystem?.saveDocumentText) {
        throw new Error('saveDocumentText function is not available. Please restart the application.');
      }
      
      const result = await window.electron.fileSystem.saveDocumentText(currentDocument.path, editedContent);
      
      if (result?.success) {
        // Update document data to reflect the saved content
        setDocumentData((prev: any) => ({ ...prev, text: editedContent }));
        setLastSavedContent(editedContent);
        toast.success('File saved successfully!');
        console.log('File saved successfully');
      } else {
        toast.error(`Failed to save file: ${result?.error || 'Unknown error'}`);
        console.error('Failed to save file:', result?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred while saving');
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save function
  const autoSave = async () => {
    if (!currentDocument || !editedContent.trim()) return;
    
    // Only auto-save if content has changed since last save
    if (editedContent === lastSavedContent) return;
    
    try {
      if (!window.electron?.fileSystem?.saveDocumentText) {
        console.error('Auto-save failed: saveDocumentText function not available');
        return;
      }
      
      const result = await window.electron.fileSystem.saveDocumentText(currentDocument.path, editedContent);
      
      if (result?.success) {
        // Update document data to reflect the saved content
        setDocumentData((prev: any) => ({ ...prev, text: editedContent }));
        setLastSavedContent(editedContent);
        // Don't show toast for auto-save to avoid spam
        console.log('Auto-saved file');
      } else {
        console.error('Auto-save failed:', result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  // Mouse event handlers for resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const container = document.getElementById('copilot-view-container');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newRatio = Math.min(80, Math.max(20, ((e.clientX - containerRect.left) / containerRect.width) * 100));
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Keyboard shortcut for save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editedContent, currentDocument]);

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  // NOW do the conditional return AFTER all hooks
  if (!currentDocument) {
    console.error('CopilotView: No document found in store');
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          No document selected for Copilot
        </Typography>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          Back to File Explorer
        </Button>
      </Box>
    );
  }
  
  const documentNode = currentDocument;

  return (
    <Box 
      sx={{ 
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Back to File Explorer">
            <IconButton size="small" onClick={handleBack}>
              <BackIcon />
            </IconButton>
          </Tooltip>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {documentName}
            </Typography>
            
            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <Tooltip title="Unsaved changes">
                <UnsavedIcon 
                  sx={{ 
                    fontSize: 8, 
                    color: 'warning.main',
                    ml: 0.5
                  }} 
                />
              </Tooltip>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Decrease Font Size">
            <IconButton size="small" onClick={handleFontSizeDecrease} disabled={fontSize <= 10}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '32px', textAlign: 'center', fontSize: '11px' }}>
            {fontSize}px
          </Typography>
          
          <Tooltip title="Increase Font Size">
            <IconButton size="small" onClick={handleFontSizeIncrease} disabled={fontSize >= 24}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={hasUnsavedChanges ? "Save File (Ctrl+S) - Unsaved changes" : "Save File (Ctrl+S)"}>
            <IconButton 
              size="small" 
              onClick={handleSave} 
              disabled={!documentData?.text || isSaving}
              sx={{
                color: hasUnsavedChanges ? 'warning.main' : 'inherit'
              }}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Divider />

      {/* Main Content */}
      <Box 
        id="copilot-view-container"
        sx={{ 
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'col-resize' : 'default'
        }}
      >
        {/* Document Panel */}
        <Box 
          sx={{ 
            width: `${splitRatio}%`,
            display: 'flex',
            flexDirection: 'column',
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'hidden',
            position: 'relative' // Important for overlay positioning
          }}
        >
          {/* Document Content */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2, position: 'relative' }}>
            {/* Always show DocumentPreview */}
            {useMemo(() => (
              <DocumentPreview 
                key={`${documentNode.id}-${documentNode.path}`}
                node={documentNode} 
                maxHeight={maxHeight}
                fontSize={fontSize}
                hideControls={true}
                isEditable={true}
                externalContent={editedContent}
                showDiff={showInlineDiff}
                diff={currentDiff || undefined}
                onApplyDiffBlock={handleApplyDiffBlock}
                onDeclineDiffBlock={handleDeclineDiffBlock}
                onDocumentLoad={(data) => {
                  setDocumentData(data);
                  setEditedContent(data.text);
                  setLastSavedContent(data.text);
                  setCurrentFileContent(data.text);
                }}
                onContentChange={handleContentChange}
              />
            ), [documentNode.id, documentNode.path, fontSize, editedContent, showInlineDiff, currentDiff])}

            {/* Remove the separate OverlayDiff component since it's now integrated */}
          </Box>
        </Box>

        {/* Resizer */}
        <Box
          sx={{
            width: '2px',
            bgcolor: 'transparent',
            cursor: 'col-resize',
            position: 'relative',
            transition: 'all 0.2s ease'
          }}
          onMouseDown={handleMouseDown}
        />

        {/* Chat Panel */}
        <Box 
          sx={{ 
            width: `${100 - splitRatio}%`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Chat Content */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Chat />
          </Box>
        </Box>
      </Box>

    </Box>
  );
}
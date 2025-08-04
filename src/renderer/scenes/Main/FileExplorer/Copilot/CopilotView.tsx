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
  FiberManualRecord as UnsavedIcon,
  ViewStream as StructuredIcon,
  TextFields as TextIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import FilePreview from '../FileRenderer';
import Chat from '../../Chat';
import { useCurrentTopicContext } from '@/renderer/stores/Topic/TopicStore';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';
import { useChatStore } from '@/renderer/stores/Chat/ChatStore';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { getUserFromStore } from '@/utils/user';
import { createCodeDiff, CodeDiff, DiffBlock, applyDiffBlock } from '@/utils/codeDiff';
import { 
  parseAnchorPatches, 
  applyAnchorPatches, 
  extractDocxContent, 
  parseDocxStructurePatches,
  applyDocxStructurePatches,
  applyStructurePatchesToText,
  docxElementsToText,
  AnchorPatch,
  DocxStructurePatch,
  DocxElement 
} from '@/utils/docxPatch';

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
  
  // Document viewing controls
  const [renderMode, setRenderMode] = useState<'text' | 'view'>('view');
  
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
    setCurrentFileContent,
    setCurrentDocumentStructure
  } = useCopilotStore();
  
  // Chat and topic management
  const { chats, createChat, updateChat } = useChatStore();
  const { selectedTopics, setSelectedTopic } = useTopicStore();

  // ALL useMemo, useEffect, and other hooks MUST come before any early returns
  
  // Compute unsaved changes state
  const computedHasUnsavedChanges = useMemo(() => {
    return editedContent !== lastSavedContent && editedContent.trim().length > 0;
  }, [editedContent, lastSavedContent]);

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

  // Updated event listener for code application (includes DOCX patch support)
  useEffect(() => {
    const handleApplyCode = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { code } = customEvent.detail;
      

      
      if (code && typeof code === 'string') {
        // Check if this is a DOCX file for anchor patch support
        const isDocxFile = currentDocument && isDOCXFile(currentDocument.name);
        
        if (isDocxFile) {
          // Try structure patches first (most reliable for DOCX)
          let structurePatches: any[] = [];
          try {
            structurePatches = parseDocxStructurePatches(code);
          } catch (error: any) {
            console.error('Structure patch parsing failed:', error);
            toast.error(`AI response format error: ${error.message}`);
            return; // Stop processing - no fallback allowed
          }
          
          if (structurePatches.length > 0) {
            console.log('Found structure patches:', structurePatches);
            console.log('Current documentData:', documentData);
            console.log('Document structure available:', !!documentData?.structure);
            console.log('Structure length:', documentData?.structure?.length);
            
            // Need to get current document structure
            if (documentData?.structure) {
              console.log('Creating diff for structure patches instead of applying immediately');
              
              // Create a preview of what the changes would look like
              const patchResult = applyDocxStructurePatches(documentData.structure, structurePatches);
              
              if (patchResult.success) {
                // Use targeted text replacement to get the new content for diff comparison
                const targetedResult = applyStructurePatchesToText(editedContent, documentData.structure, structurePatches);
                
                let newContent: string;
                if (targetedResult.success) {
                  newContent = targetedResult.content;
                } else {
                  // Fallback to full reconstruction
                  newContent = docxElementsToText(patchResult.elements);
                }
                
                // Create diff instead of applying immediately
                const diff = createCodeDiff(editedContent, newContent);
                
                if (diff.hasChanges) {
                  // Store the structure patches so we can apply them when user approves
                  (diff as any).structurePatches = structurePatches;
                  (diff as any).newStructure = patchResult.elements;
                  
                  setCurrentDiff(diff);
                  setShowInlineDiff(true);
                  toast.info(`Found ${diff.blocks.length} structural change(s) from DOCX patches - review and approve/decline in editor`);
                  return;
                } else {
                  toast.success('No changes needed - content is already up to date!');
                  return;
                }
              } else {
                console.error('Structure patch failed:', patchResult.error);
                toast.error(`Structure patch failed: ${patchResult.error}. Trying anchor patches...`);
                // Continue to try anchor patches
              }
            } else {
              console.warn('No document structure available for structure patches');
              console.warn('DocumentData keys:', documentData ? Object.keys(documentData) : 'no documentData');
              toast.warning('Document structure not available. Using anchor patches instead...');
            }
          }
          
          // Try anchor patches as fallback (faster for localized changes)
          let anchorPatches: any[] = [];
          try {
            anchorPatches = parseAnchorPatches(code);
          } catch (error: any) {
            console.error('Anchor patch parsing failed:', error);
            toast.error(`AI response format error: ${error.message}`);
            return; // Stop processing - no fallback allowed
          }
          
          if (anchorPatches.length > 0) {
            console.log('Found anchor patches:', anchorPatches);
            
            // Apply anchor patches directly
            const patchResult = applyAnchorPatches(editedContent, anchorPatches);
            
            if (patchResult.success) {
              setEditedContent(patchResult.content);
              setCurrentFileContent(patchResult.content);
              toast.success(`Applied ${anchorPatches.length} anchor patch(es) successfully!`);
              return;
            } else {
              console.error('Anchor patch failed:', patchResult.error);
              toast.error(`Anchor patch failed: ${patchResult.error}. Trying standard diff...`);
              // Continue to try full diff approach
            }
          } else if (code.includes('anchor-patch') && !code.includes('```anchor-patch')) {
            // Check if AI tried to provide anchor patch but used wrong format
            console.warn('AI provided malformed anchor patch - missing triple backticks');
            toast.warning('AI used incorrect anchor patch format. Using standard diff instead...');
          }
          
          // Check if we found any DOCX-specific patches at all
          if (structurePatches.length === 0 && anchorPatches.length === 0) {
            // Try to extract complete DOCX content as final fallback
            const docxContent = extractDocxContent(code);
            if (docxContent) {
              const diff = createCodeDiff(editedContent, docxContent);
              
              if (diff.hasChanges) {
                setCurrentDiff(diff);
                setShowInlineDiff(true);
                toast.info(`Found ${diff.blocks.length} change(s) from full content - review in editor`);
                return;
              } else {
                toast.success('No changes needed - content is already up to date!');
                return;
              }
            }
            
            // No DOCX patches or content found - show explicit error
            console.error('❌ No valid DOCX patches found in AI response');
            console.error('AI must provide one of:');
            console.error('1. ```docx-structure-patch code blocks');
            console.error('2. ```anchor-patch code blocks');
            console.error('3. ```docx-content code blocks');
            toast.error('AI response does not contain valid DOCX patches. AI must use proper patch format (```docx-structure-patch, ```anchor-patch, or ```docx-content).');
            return;
          }
        }
        
        // For non-DOCX files or fallback, use standard diff approach
        const diff = createCodeDiff(editedContent, code);
        
        if (diff.hasChanges) {
          setCurrentDiff(diff);
          setShowInlineDiff(true);
          toast.info(`Found ${diff.blocks.length} change(s) - review in editor`);
        } else {
          toast.success('No changes needed - content is already up to date!');
        }
      }
    };

    document.addEventListener('onlysaid-apply-code', handleApplyCode);
    
    return () => {
      document.removeEventListener('onlysaid-apply-code', handleApplyCode);
    };
  }, [editedContent, currentDocument]);

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
          
          // If this was a DOCX structure patch diff and all blocks are now applied,
          // update the document structure as well
          const diffWithPatches = currentDiff as any;
          if (diffWithPatches.structurePatches && diffWithPatches.newStructure) {
            console.log('All DOCX structure diff blocks applied - updating document structure');
            setCurrentDocumentStructure(diffWithPatches.newStructure);
            setDocumentData((prev: any) => ({
              ...prev,
              text: newContent,
              structure: diffWithPatches.newStructure
            }));
            toast.success(`Applied all DOCX structural changes successfully!`);
          }
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
  const handleFontSizeIncrease = () => {
    const newSize = Math.min(fontSize + 2, 24);
    setFontSize(newSize);
    toast.success(`Font size: ${newSize}px`);
  };
  const handleFontSizeDecrease = () => {
    const newSize = Math.max(fontSize - 2, 10);
    setFontSize(newSize);
    toast.success(`Font size: ${newSize}px`);
  };

  // Document viewing controls
  const handleRenderModeChange = (mode: 'text' | 'view') => {
    setRenderMode(mode);
    const modeNames = { text: 'Edit Mode', view: 'View Mode' };
    toast.success(`${modeNames[mode]}`);
  };



  const handleCopyText = async () => {
    if (documentData?.text) {
      try {
        await navigator.clipboard.writeText(documentData.text);
        toast.success('Text copied to clipboard');
      } catch (err) {
        toast.error('Failed to copy text');
      }
    }
  };

  // Check if current document is a DOCX file
  const isDOCXFile = (fileName: string): boolean => {
    if (!fileName) return false;
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return ['.docx', '.doc'].includes(ext);
  };
  
  // Save function
  const handleSave = async () => {
    if (!currentDocument || !editedContent.trim()) return;
    
    setIsSaving(true);
    try {
      
      let result;
      
      if (isDOCXFile(currentDocument.name)) {
        // Use DOCX-specific save handler with file locking retry logic
        console.log('Saving DOCX file with enhanced handler:', currentDocument.path);
        
        if (!window.electron?.fileSystem?.saveDocxTextContent) {
          throw new Error('DOCX save function is not available. Please restart the application.');
        }
        
        result = await window.electron.fileSystem.saveDocxTextContent(currentDocument.path, editedContent);
      } else {
        // Use regular text save for other file types
        console.log('Saving regular text file:', currentDocument.path);
        
        if (!window.electron?.fileSystem?.saveDocumentText) {
          throw new Error('saveDocumentText function is not available. Please restart the application.');
        }
        
        result = await window.electron.fileSystem.saveDocumentText(currentDocument.path, editedContent);
      }
      
      if (result?.success) {
        // Update document data to reflect the saved content
        setDocumentData((prev: any) => ({ ...prev, text: editedContent }));
        setLastSavedContent(editedContent);
        toast.success('File saved successfully!');
        console.log('File saved successfully');
      } else {
        // Show user-friendly error message
        const errorMessage = result?.error || 'Unknown error';
        toast.error(`Failed to save file: ${errorMessage}`);
        console.error('Failed to save file:', errorMessage);
        
        // Show additional help for EBUSY errors
        if (result?.errorCode === 'EBUSY') {
          setTimeout(() => {
            toast.info('💡 Tip: Close the file in Microsoft Word or other applications to allow saving.');
          }, 2000);
        }
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
      let result;
      
      if (isDOCXFile(currentDocument.name)) {
        // Use DOCX-specific save handler for auto-save too
        if (!window.electron?.fileSystem?.saveDocxTextContent) {
          console.error('Auto-save failed: DOCX save function not available');
          return;
        }
        result = await window.electron.fileSystem.saveDocxTextContent(currentDocument.path, editedContent);
      } else {
        if (!window.electron?.fileSystem?.saveDocumentText) {
          console.error('Auto-save failed: saveDocumentText function not available');
          return;
        }
        result = await window.electron.fileSystem.saveDocumentText(currentDocument.path, editedContent);
      }
      
      if (result?.success) {
        // Update document data to reflect the saved content
        setDocumentData((prev: any) => ({ ...prev, text: editedContent }));
        setLastSavedContent(editedContent);
        // Don't show toast for auto-save to avoid spam
        console.log('Auto-saved file');
      } else {
        console.error('Auto-save failed:', result?.error || 'Unknown error');
        // Don't show auto-save failures as prominently to avoid spam
        if (result?.errorCode === 'EBUSY') {
          console.log('Auto-save skipped: file is locked by another application');
        }
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
          {/* Font size controls */}
          <Tooltip title="Decrease Font Size">
            <IconButton size="small" onClick={handleFontSizeDecrease} disabled={fontSize <= 10}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Increase Font Size">
            <IconButton size="small" onClick={handleFontSizeIncrease} disabled={fontSize >= 24}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          
          {/* Document controls - only show for DOCX files */}
          {currentDocument && isDOCXFile(currentDocument.name) && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20 }} />
              
              {/* View mode controls */}
              <Tooltip title="View Mode">
                <IconButton 
                  size="small" 
                  onClick={() => handleRenderModeChange('view')}
                  color={renderMode === 'view' ? 'primary' : 'default'}
                >
                  <StructuredIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Edit Mode">
                <IconButton 
                  size="small" 
                  onClick={() => handleRenderModeChange('text')}
                  color={renderMode === 'text' ? 'primary' : 'default'}
                >
                  <TextIcon />
                </IconButton>
              </Tooltip>
              

            </>
          )}
          
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20 }} />
          
          {/* Copy text control */}
          <Tooltip title="Copy Text">
            <IconButton size="small" onClick={handleCopyText}>
              <CopyIcon />
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
          <Box sx={{ flex: 1, overflow: 'auto', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Always show FilePreview (automatically routes to correct renderer) */}
            <Box sx={{ flex: 1, height: '100%' }}>
              {useMemo(() => (
                <FilePreview 
                  key={`${documentNode.id}-${documentNode.path}`}
                  node={documentNode} 
                  fontSize={fontSize}
                  hideControls={true}
                  isEditable={true}
                  externalContent={editedContent}
                  showDiff={showInlineDiff}
                  diff={currentDiff || undefined}
                  onApplyDiffBlock={handleApplyDiffBlock}
                  onDeclineDiffBlock={handleDeclineDiffBlock}
                  renderMode={isDOCXFile(documentNode.name) ? renderMode : undefined}
                  onRenderModeChange={isDOCXFile(documentNode.name) ? handleRenderModeChange : undefined}
                  onDocumentLoad={(data) => {
                    setDocumentData(data);
                    setEditedContent(data.text);
                    setLastSavedContent(data.text);
                    setCurrentFileContent(data.text);
                    // Store document structure if available (for DOCX files)
                    if (data.structure) {
                      setCurrentDocumentStructure(data.structure);
                    }
                  }}
                  onContentChange={handleContentChange}
                />
              ), [documentNode.id, documentNode.path, fontSize, editedContent, showInlineDiff, currentDiff, renderMode])}
            </Box>

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
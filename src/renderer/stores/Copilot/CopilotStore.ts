import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FileNode } from "@/renderer/stores/File/FileExplorerStore";
import { DocxElement } from "@/utils/docxPatch";

interface CopilotStore {
  // Current document being analyzed
  currentDocument: FileNode | null;
  
  // ADD: Store the actual file content
  currentFileContent: string | null;
  
  // ADD: Store document structure for DOCX files
  currentDocumentStructure: DocxElement[] | null;
  
  // Copilot UI state
  splitRatio: number;
  isActive: boolean;
  
  // Edit state tracking
  hasUnsavedChanges: boolean;
  
  // Actions
  setCurrentDocument: (document: FileNode | null) => void;
  
  // ADD: Action to set file content
  setCurrentFileContent: (content: string | null) => void;
  
  // ADD: Action to set document structure
  setCurrentDocumentStructure: (structure: DocxElement[] | null) => void;
  
  setSplitRatio: (ratio: number) => void;
  setActive: (active: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  
  // Helper to get context info
  getContextInfo: () => {
    documentName: string;
    contextId: string;
    fileContent: string | null;
    documentStructure: DocxElement[] | null;
  } | null;
}

// Throttle function for split ratio updates
let splitRatioThrottle: NodeJS.Timeout | null = null;

export const useCopilotStore = create<CopilotStore>()(
  persist(
    (set, get) => ({
      currentDocument: null,
      currentFileContent: null, // ADD: Initialize file content
      currentDocumentStructure: null, // ADD: Initialize document structure
      splitRatio: 50,
      isActive: false,
      hasUnsavedChanges: false,

      setCurrentDocument: (document) => set({ currentDocument: document }),
      
      // ADD: Action to set file content
      setCurrentFileContent: (content) => set({ currentFileContent: content }),
      
      // ADD: Action to set document structure
      setCurrentDocumentStructure: (structure) => set({ currentDocumentStructure: structure }),
      
      setSplitRatio: (ratio) => {
        const clampedRatio = Math.min(80, Math.max(20, ratio));
        
        // Clear existing throttle
        if (splitRatioThrottle) {
          clearTimeout(splitRatioThrottle);
        }
        
        // Update immediately for UI responsiveness
        set({ splitRatio: clampedRatio });
        
        // Throttle the persistence (save to storage after 300ms of no changes)
        splitRatioThrottle = setTimeout(() => {
          // This will trigger the persist middleware to save
          set({ splitRatio: clampedRatio });
        }, 300);
      },
      
      setActive: (active) => set({ isActive: active }),
      
      setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
      
      getContextInfo: () => {
        const state = get();
        if (!state.currentDocument) return null;
        
        return {
          documentName: state.currentDocument.name,
          contextId: `copilot-${state.currentDocument.id}`,
          fileContent: state.currentFileContent,
          documentStructure: state.currentDocumentStructure
        };
      }
    }),
    {
      name: 'copilot-store', // Storage key
      partialize: (state) => ({
        // Only persist these fields
        splitRatio: state.splitRatio,
        currentDocument: state.currentDocument,
        // Note: Don't persist file content as it can be large and outdated
        // Don't persist: isActive, hasUnsavedChanges (session-only)
      }),
    }
  )
);

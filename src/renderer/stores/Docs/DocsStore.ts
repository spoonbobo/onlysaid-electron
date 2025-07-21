import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DocsState {
  // MCP service selections by workspace
  selectedMCPServices: Record<string, string>; // workspaceId -> selectedService (tavily, moodle, etc.)
  
  // Tool selections by workspace and service
  selectedTools: Record<string, Record<string, string>>; // workspaceId -> serviceId -> toolName
  
  // General docs section selections by workspace
  selectedSections: Record<string, string>; // workspaceId -> section (knowledgeBase, mcp-tools)

  // Methods
  setSelectedMCPService: (workspaceId: string, serviceId: string) => void;
  getSelectedMCPService: (workspaceId: string) => string;
  clearSelectedMCPService: (workspaceId: string) => void;

  setSelectedTool: (workspaceId: string, serviceId: string, toolName: string) => void;
  getSelectedTool: (workspaceId: string, serviceId: string) => string;
  clearSelectedTool: (workspaceId: string, serviceId: string) => void;

  setSelectedSection: (workspaceId: string, section: string) => void;
  getSelectedSection: (workspaceId: string) => string;
  clearSelectedSection: (workspaceId: string) => void;

  // Cleanup methods
  clearWorkspace: (workspaceId: string) => void;
  clearAll: () => void;
}

export const useDocsStore = create<DocsState>()(
  persist(
    (set, get) => ({
      selectedMCPServices: {},
      selectedTools: {},
      selectedSections: {},

      setSelectedMCPService: (workspaceId: string, serviceId: string) => {
        set((state) => ({
          selectedMCPServices: {
            ...state.selectedMCPServices,
            [workspaceId]: serviceId
          }
        }));
      },

      getSelectedMCPService: (workspaceId: string) => {
        return get().selectedMCPServices[workspaceId] || '';
      },

      clearSelectedMCPService: (workspaceId: string) => {
        set((state) => {
          const newSelections = { ...state.selectedMCPServices };
          delete newSelections[workspaceId];
          return { selectedMCPServices: newSelections };
        });
      },

      setSelectedTool: (workspaceId: string, serviceId: string, toolName: string) => {
        set((state) => ({
          selectedTools: {
            ...state.selectedTools,
            [workspaceId]: {
              ...state.selectedTools[workspaceId],
              [serviceId]: toolName
            }
          }
        }));
      },

      getSelectedTool: (workspaceId: string, serviceId: string) => {
        return get().selectedTools[workspaceId]?.[serviceId] || '';
      },

      clearSelectedTool: (workspaceId: string, serviceId: string) => {
        set((state) => {
          const newTools = { ...state.selectedTools };
          if (newTools[workspaceId]) {
            delete newTools[workspaceId][serviceId];
            // Clean up empty workspace objects
            if (Object.keys(newTools[workspaceId]).length === 0) {
              delete newTools[workspaceId];
            }
          }
          return { selectedTools: newTools };
        });
      },

      setSelectedSection: (workspaceId: string, section: string) => {
        set((state) => ({
          selectedSections: {
            ...state.selectedSections,
            [workspaceId]: section
          }
        }));
      },

      getSelectedSection: (workspaceId: string) => {
        return get().selectedSections[workspaceId] || '';
      },

      clearSelectedSection: (workspaceId: string) => {
        set((state) => {
          const newSections = { ...state.selectedSections };
          delete newSections[workspaceId];
          return { selectedSections: newSections };
        });
      },

      clearWorkspace: (workspaceId: string) => {
        set((state) => {
          const newMCPServices = { ...state.selectedMCPServices };
          const newTools = { ...state.selectedTools };
          const newSections = { ...state.selectedSections };
          
          delete newMCPServices[workspaceId];
          delete newTools[workspaceId];
          delete newSections[workspaceId];
          
          return {
            selectedMCPServices: newMCPServices,
            selectedTools: newTools,
            selectedSections: newSections
          };
        });
      },

      clearAll: () => {
        set({
          selectedMCPServices: {},
          selectedTools: {},
          selectedSections: {}
        });
      },
    }),
    {
      name: "docs-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedMCPServices: state.selectedMCPServices,
        selectedTools: state.selectedTools,
        selectedSections: state.selectedSections,
      }),
      version: 1,
    }
  )
);

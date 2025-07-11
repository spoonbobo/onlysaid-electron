import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AvatarProfile {
  id: string;
  name: string;
  description: string;
  appearance?: {
    style?: string;
    color?: string;
    theme?: string;
  };
  voice?: {
    language?: string;
    accent?: string;
    speed?: number;
    pitch?: number;
  };
}

export interface AvatarSection {
  id: string;
  name: string;
  type: 'design';
}

interface AvatarStore {
  // Single avatar profile for workspace (always Alice)
  defaultAvatarProfile: AvatarProfile;
  
  // Section selection for menu navigation
  selectedSection: string | null;
  setSelectedSection: (sectionId: string | null) => void;
  
  // Design subsection selection
  selectedDesignSubsection: string | null;
  setSelectedDesignSubsection: (subsectionId: string | null) => void;
  
  // Available sections
  sections: AvatarSection[];
  
  // Workspace-specific avatar customizations (appearance, voice settings)
  workspaceAvatarCustomizations: Record<string, Partial<AvatarProfile>>; // workspaceId -> customizations
  setWorkspaceAvatarCustomization: (workspaceId: string, customizations: Partial<AvatarProfile>) => void;
  getWorkspaceAvatarCustomization: (workspaceId: string) => Partial<AvatarProfile> | null;
  
  // Initialize avatar for workspace
  initializeWorkspaceAvatar: (workspaceId: string) => void;
  
  // Get the current avatar profile with workspace customizations applied
  getCurrentAvatarProfile: (workspaceId?: string) => AvatarProfile;
  
  // Utilities
  getSectionById: (sectionId: string) => AvatarSection | null;
}

const defaultAvatarProfile: AvatarProfile = {
  id: 'alice',
  name: 'Alice',
  description: 'Friendly and helpful assistant',
  appearance: {
    style: 'professional',
    color: 'blue',
    theme: 'modern'
  },
  voice: {
    language: 'en-US',
    accent: 'neutral',
    speed: 1.0,
    pitch: 1.0
  }
};

const defaultSections: AvatarSection[] = [
  {
    id: 'design',
    name: 'Design',
    type: 'design'
  }
];

export const useAvatarStore = create<AvatarStore>()(
  persist(
    (set, get) => ({
      // Single avatar profile
      defaultAvatarProfile,
      
      // Section selection
      selectedSection: null,
      setSelectedSection: (sectionId: string | null) =>
        set({ selectedSection: sectionId }),
      
      // Design subsection selection
      selectedDesignSubsection: null,
      setSelectedDesignSubsection: (subsectionId: string | null) =>
        set({ selectedDesignSubsection: subsectionId }),
      
      // Available sections
      sections: defaultSections,
      
      // Workspace-specific avatar customizations
      workspaceAvatarCustomizations: {},
      
      setWorkspaceAvatarCustomization: (workspaceId: string, customizations: Partial<AvatarProfile>) =>
        set((state) => ({
          workspaceAvatarCustomizations: {
            ...state.workspaceAvatarCustomizations,
            [workspaceId]: {
              ...state.workspaceAvatarCustomizations[workspaceId],
              ...customizations
            }
          }
        })),
      
      getWorkspaceAvatarCustomization: (workspaceId: string) => {
        return get().workspaceAvatarCustomizations[workspaceId] || null;
      },
      
      // Initialize avatar for workspace
      initializeWorkspaceAvatar: (workspaceId: string) => {
        // Since we only have one avatar per workspace, just ensure the workspace is initialized
        // The avatar is always Alice, but customizations can be applied
        const state = get();
        if (!state.workspaceAvatarCustomizations[workspaceId]) {
          set((state) => ({
            workspaceAvatarCustomizations: {
              ...state.workspaceAvatarCustomizations,
              [workspaceId]: {} // Initialize empty customizations
            }
          }));
        }
      },
      
      // Get current avatar profile with workspace customizations
      getCurrentAvatarProfile: (workspaceId?: string) => {
        const state = get();
        const baseProfile = state.defaultAvatarProfile;
        
        if (workspaceId) {
          const customizations = state.getWorkspaceAvatarCustomization(workspaceId);
          if (customizations) {
            return {
              ...baseProfile,
              ...customizations,
              appearance: {
                ...baseProfile.appearance,
                ...customizations.appearance
              },
              voice: {
                ...baseProfile.voice,
                ...customizations.voice
              }
            };
          }
        }
        
        return baseProfile;
      },
      
      // Utilities
      getSectionById: (sectionId: string) => {
        const state = get();
        return state.sections.find(section => section.id === sectionId) || null;
      }
    }),
    {
      name: "avatar-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedSection: state.selectedSection,
        selectedDesignSubsection: state.selectedDesignSubsection,
        workspaceAvatarCustomizations: state.workspaceAvatarCustomizations,
      }),
      version: 2, // Increment version due to breaking changes
    }
  )
);

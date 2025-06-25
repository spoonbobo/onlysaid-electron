import { create } from "zustand";
import { getUserTokenFromStore } from "@/utils/user";
import { IWorkspaceSettings } from "@/../../types/Workspace/Workspace";
import { toast } from "@/utils/toast";

interface WorkspaceSettingsState {
  settings: Record<string, IWorkspaceSettings>; // workspaceId -> settings
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  getSettings: (workspaceId: string) => Promise<IWorkspaceSettings | null>;
  createSettings: (workspaceId: string, data: { moodle_course_id?: string; moodle_api_token?: string }) => Promise<IWorkspaceSettings>;
  updateSettings: (workspaceId: string, data: { moodle_course_id?: string; moodle_api_token?: string }) => Promise<IWorkspaceSettings>;
  deleteSettings: (workspaceId: string) => Promise<void>;

  // Local state management
  getSettingsFromStore: (workspaceId: string) => IWorkspaceSettings | null;
  clearSettings: (workspaceId: string) => void;
  clearAllSettings: () => void;
  setError: (error: string | null) => void;
}

export const useWorkspaceSettingsStore = create<WorkspaceSettingsState>()((set, get) => ({
  settings: {},
  isLoading: false,
  error: null,

  getSettings: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.get_settings({
        token: getUserTokenFromStore() || '',
        workspaceId
      });

      if (response.error) {
        // If no settings found, that's not an error - just return null
        if (response.error.includes('No settings found') || response.status === 404) {
          set(state => ({
            settings: { ...state.settings, [workspaceId]: null as any },
            isLoading: false,
            error: null
          }));
          return null;
        }
        throw new Error(response.error);
      }

      const settingsData = response.data?.data;
      
      if (settingsData) {
        set(state => ({
          settings: { ...state.settings, [workspaceId]: settingsData },
          isLoading: false,
          error: null
        }));
        return settingsData;
      }

      set({ isLoading: false, error: null });
      return null;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching workspace settings:", error);
      toast.error(error.message || "Failed to fetch workspace settings");
      return null;
    }
  },

  createSettings: async (workspaceId: string, data: { moodle_course_id?: string; moodle_api_token?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.create_settings({
        token: getUserTokenFromStore() || '',
        workspaceId,
        request: data
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const newSettings = response.data?.data;
      if (!newSettings) {
        throw new Error("No settings data returned from server");
      }

      set(state => ({
        settings: { ...state.settings, [workspaceId]: newSettings },
        isLoading: false,
        error: null
      }));

      toast.success("Workspace settings created successfully");
      return newSettings;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error creating workspace settings:", error);
      toast.error(error.message || "Failed to create workspace settings");
      throw error;
    }
  },

  updateSettings: async (workspaceId: string, data: { moodle_course_id?: string; moodle_api_token?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.update_settings({
        token: getUserTokenFromStore() || '',
        workspaceId,
        request: data
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const updatedSettings = response.data?.data;
      if (!updatedSettings) {
        throw new Error("No settings data returned from server");
      }

      set(state => ({
        settings: { ...state.settings, [workspaceId]: updatedSettings },
        isLoading: false,
        error: null
      }));

      toast.success("Workspace settings updated successfully");
      return updatedSettings;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error updating workspace settings:", error);
      toast.error(error.message || "Failed to update workspace settings");
      throw error;
    }
  },

  deleteSettings: async (workspaceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electron.workspace.delete_settings({
        token: getUserTokenFromStore() || '',
        workspaceId
      });

      if (response.error) {
        throw new Error(response.error);
      }

      set(state => {
        const newSettings = { ...state.settings };
        delete newSettings[workspaceId];
        return {
          settings: newSettings,
          isLoading: false,
          error: null
        };
      });

      toast.success("Workspace settings deleted successfully");
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error deleting workspace settings:", error);
      toast.error(error.message || "Failed to delete workspace settings");
      throw error;
    }
  },

  getSettingsFromStore: (workspaceId: string) => {
    return get().settings[workspaceId] || null;
  },

  clearSettings: (workspaceId: string) => {
    set(state => {
      const newSettings = { ...state.settings };
      delete newSettings[workspaceId];
      return { settings: newSettings };
    });
  },

  clearAllSettings: () => {
    set({ settings: {}, error: null });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

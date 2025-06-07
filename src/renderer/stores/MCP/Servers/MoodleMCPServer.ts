import { toast } from "@/utils/toast";
import type { IServerModule } from "@/../../types/MCP/server";

export interface IMoodleConfig {
  apiUrl: string;
  apiToken: string;
  courseId: string;
}

export interface IMoodleState {
  moodleEnabled: boolean;
  moodleConfig: IMoodleConfig;
  moodleAutoApproved?: boolean;
}

export const createMoodleServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IMoodleConfig> => {

  const defaultConfig: IMoodleConfig = {
    apiUrl: "",
    apiToken: "",
    courseId: "",
  };

  const isConfigured = (config: IMoodleConfig): boolean => {
    return !!(config.apiUrl && config.apiToken && config.courseId);
  };

  const createClientConfig = (config: IMoodleConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "npx",
    args: [
      "-y",
      "moodle-mcp-server@latest"
    ],
    env: {
      "MOODLE_API_URL": config.apiUrl,
      "MOODLE_API_TOKEN": config.apiToken,
      "MOODLE_COURSE_ID": config.courseId
    },
    clientName: "moodle-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      moodleEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("moodle");
      if (!result.success) {
        toast.error(`Moodle service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          moodleEnabled: false
        }));
      } else {
        toast.success("Moodle service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IMoodleConfig>) => {
    set((state: any) => ({
      ...state,
      moodleConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.moodleEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.moodleConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      moodleAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.moodleAutoApproved || false;
  };

  return {
    defaultConfig,
    isConfigured,
    createClientConfig,
    setEnabled,
    setConfig,
    getEnabled,
    getConfig,
    getConfigured,
    setAutoApproved,
    getAutoApproved
  };
};

// Export for backward compatibility
export const isMoodleConfigured = (config: IMoodleConfig): boolean => {
  return !!(config.apiUrl && config.apiToken && config.courseId);
};

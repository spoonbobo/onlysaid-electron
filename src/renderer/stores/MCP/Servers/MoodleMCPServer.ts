import { toast } from "@/utils/toast";
import type { IServerModule } from "@/../../types/MCP/server";

export interface IMoodleConfig {
  baseUrl: string;
  token: string;
  verifySSL: boolean;
  path: string;
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
    baseUrl: "",
    token: "",
    verifySSL: false,
    path: ""
  };

  const isConfigured = (config: IMoodleConfig): boolean => {
    return !!(config.baseUrl && config.token && config.path);
  };

  const createClientConfig = (config: IMoodleConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "uv",
    args: [
      "--directory",
      config.path,
      "run",
      "src/moodle_mcp/main.py"
    ],
    env: {
      "MOODLE_BASE_URL": config.baseUrl,
      "MOODLE_TOKEN": config.token,
      "MOODLE_VERIFY_SSL": config.verifySSL.toString()
    },
    clientName: "moodle-client",
    clientVersion: "0.1.0"
  });

  const setEnabled = async (enabled: boolean) => {
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
    return { ...defaultConfig, ...(state.moodleConfig || {}) };
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
  return !!(config.baseUrl && config.token && config.path);
};

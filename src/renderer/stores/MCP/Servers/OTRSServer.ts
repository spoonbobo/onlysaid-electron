import { toast } from "@/utils/toast";
import type { IServerModule } from "@/../../types/MCP/server";

export interface IOTRSConfig {
  baseUrl: string;
  username: string;
  password: string;
  verifySSL: boolean;
  defaultQueue: string;
  defaultState: string;
  defaultPriority: string;
  defaultType: string;
  path: string;
}

export interface IOTRSState {
  otrsEnabled: boolean;
  otrsConfig: IOTRSConfig;
  otrsAutoApproved?: boolean;
}

export const createOTRSServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IOTRSConfig> => {

  const defaultConfig: IOTRSConfig = {
    baseUrl: "",
    username: "",
    password: "",
    verifySSL: false,
    defaultQueue: "Raw",
    defaultState: "new",
    defaultPriority: "3 normal",
    defaultType: "Unclassified",
    path: ""
  };

  const isConfigured = (config: IOTRSConfig): boolean => {
    return !!(config.baseUrl && config.username && config.password && config.path);
  };

  const createClientConfig = (config: IOTRSConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "uv",
    args: [
      "--directory",
      config.path,
      "run",
      "src/otrs_mcp/main.py"
    ],
    env: {
      "OTRS_BASE_URL": config.baseUrl,
      "OTRS_USERNAME": config.username,
      "OTRS_PASSWORD": config.password,
      "OTRS_VERIFY_SSL": config.verifySSL.toString(),
      "OTRS_DEFAULT_QUEUE": config.defaultQueue,
      "OTRS_DEFAULT_STATE": config.defaultState,
      "OTRS_DEFAULT_PRIORITY": config.defaultPriority,
      "OTRS_DEFAULT_TYPE": config.defaultType
    },
    clientName: "otrs-client",
    clientVersion: "0.1.0"
  });

  const setEnabled = async (enabled: boolean) => {
    set((state: any) => ({
      ...state,
      otrsEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("otrs");
      if (!result.success) {
        toast.error(`OTRS service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          otrsEnabled: false
        }));
      } else {
        toast.success("OTRS service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IOTRSConfig>) => {
    set((state: any) => ({
      ...state,
      otrsConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.otrsEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.otrsConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      otrsAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.otrsAutoApproved || false;
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
export const isOTRSConfigured = (config: IOTRSConfig): boolean => {
  return !!(config.baseUrl && config.username && config.password && config.path);
};
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
    defaultType: "Unclassified"
  };

  const isConfigured = (config: IOTRSConfig): boolean => {
    return !!(config.baseUrl && config.username && config.password);
  };

  const createClientConfig = (config: IOTRSConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "docker",
    args: [
      "run",
      "--rm",
      "-i",
      "-e",
      `OTRS_BASE_URL=${config.baseUrl}`,
      "-e",
      `OTRS_USERNAME=${config.username}`,
      "-e",
      `OTRS_PASSWORD=${config.password}`,
      "-e",
      `OTRS_VERIFY_SSL=${config.verifySSL}`,
      "-e",
      `OTRS_DEFAULT_QUEUE=${config.defaultQueue}`,
      "-e",
      `OTRS_DEFAULT_STATE=${config.defaultState}`,
      "-e",
      `OTRS_DEFAULT_PRIORITY=${config.defaultPriority}`,
      "-e",
      `OTRS_DEFAULT_TYPE=${config.defaultType}`,
      "ghcr.io/spoonbobo/otrs-mcp-server:latest"
    ],
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
  return !!(config.baseUrl && config.username && config.password);
};
import { toast } from "@/utils/toast";
import type { IServerModule, IOnlysaidKBConfig, IOnlysaidKBState } from "@/../../types/MCP/server";

export const createOnlysaidKBServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IOnlysaidKBConfig> => {

  const defaultConfig: IOnlysaidKBConfig = {
    baseUrl: "http://onlysaid-dev.com/api/kb",
    timeout: 30,
    path: ""
  };

  const isConfigured = (config: IOnlysaidKBConfig): boolean => {
    return !!(config.baseUrl && config.path);
  };

  const createClientConfig = (config: IOnlysaidKBConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "uv",
    args: [
      "--directory",
      config.path,
      "run",
      "src/onlysaidkb_mcp/main.py"
    ],
    env: {
      "ONLYSAIDKB_BASE_URL": config.baseUrl,
      "ONLYSAIDKB_TIMEOUT": config.timeout?.toString() || "30"
    },
    clientName: "onlysaidkb-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      onlysaidKBEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("onlysaidkb");
      if (!result.success) {
        toast.error(`OnlysaidKB service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          onlysaidKBEnabled: false
        }));
      } else {
        toast.success("OnlysaidKB service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IOnlysaidKBConfig>) => {
    set((state: any) => ({
      ...state,
      onlysaidKBConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.onlysaidKBEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.onlysaidKBConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      onlysaidKBAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.onlysaidKBAutoApproved || false;
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
export const isOnlysaidKBConfigured = (config: IOnlysaidKBConfig): boolean => {
  return !!(config.baseUrl && config.path);
};

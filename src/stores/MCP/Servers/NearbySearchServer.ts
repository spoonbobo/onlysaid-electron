import { toast } from "@/utils/toast";
import type { IServerModule, INearbySearchConfig } from "@/../../types/MCP/server";

export const createNearbySearchServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<INearbySearchConfig> => {

  const defaultConfig: INearbySearchConfig = {
    apiKey: "",
    endpoint: "",
    defaultRadius: 1500
  };

  const isConfigured = (config: INearbySearchConfig): boolean => {
    return !!config.apiKey && !!config.endpoint;
  };

  const createClientConfig = (config: INearbySearchConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "uv",
    args: [
      "run",
      "main.py",
      "--api-key", config.apiKey
    ],
    env: {
      "GOOGLE_API_KEY": config.apiKey
    },
    clientName: "nearby-search-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      nearbySearchEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("nearby-search");
      if (!result.success) {
        toast.error(`Nearby search service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          nearbySearchEnabled: false
        }));
      } else {
        toast.success("Nearby search service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<INearbySearchConfig>) => {
    set((state: any) => ({
      ...state,
      nearbySearchConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.nearbySearchEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.nearbySearchConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      nearbySearchAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.nearbySearchAutoApproved || false;
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

export const isNearbySearchConfigured = (config: INearbySearchConfig): boolean => {
  return !!config.apiKey && !!config.endpoint;
};

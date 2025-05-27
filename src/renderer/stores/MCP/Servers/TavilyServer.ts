import { toast } from "@/utils/toast";
import type { IServerModule, ITavilyConfig, ITavilyState } from "@/../../types/MCP/server";

export const createTavilyServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<ITavilyConfig> => {

  const defaultConfig: ITavilyConfig = {
    apiKey: "",
  };

  const isConfigured = (config: ITavilyConfig): boolean => {
    return !!config.apiKey;
  };

  const createClientConfig = (config: ITavilyConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "npx",
    args: [
      "-y",
      "tavily-mcp@0.1.4"
    ],
    env: {
      "TAVILY_API_KEY": config.apiKey
    },
    clientName: "tavily-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      tavilyEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("tavily");
      if (!result.success) {
        toast.error(`Tavily service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          tavilyEnabled: false
        }));
      } else {
        toast.success("Tavily service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<ITavilyConfig>) => {
    set((state: any) => ({
      ...state,
      tavilyConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.tavilyEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.tavilyConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      tavilyAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.tavilyAutoApproved || false;
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
export const isTavilyConfigured = (config: ITavilyConfig): boolean => {
  return !!config.apiKey;
};

import { toast } from "@/utils/toast";
import type { IServerModule, IIPLocationConfig } from "@/../../types/MCP/server";

export const createIPLocationServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IIPLocationConfig> => {

  const defaultConfig: IIPLocationConfig = {
    apiKey: ""
  };

  const isConfigured = (config: IIPLocationConfig): boolean => {
    return !!config.apiKey;
  };

  const createClientConfig = (config: IIPLocationConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: `${homedir}/.local/bin/uvx`,
    args: [
      "--from",
      "git+https://github.com/briandconnelly/mcp-server-ipinfo.git",
      "mcp-server-ipinfo"
    ],
    env: {
      "IPINFO_API_TOKEN": config.apiKey
    },
    clientName: "ip-location-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      ipLocationEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("ip-location");
      if (!result.success) {
        toast.error(`IP location service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          ipLocationEnabled: false
        }));
      } else {
        toast.success("IP location service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IIPLocationConfig>) => {
    set((state: any) => ({
      ...state,
      ipLocationConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.ipLocationEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.ipLocationConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      ipLocationAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.ipLocationAutoApproved || false;
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

export const isIPLocationConfigured = (config: IIPLocationConfig): boolean => {
  return !!config.apiKey;
};

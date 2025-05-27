import { toast } from "@/utils/toast";
import type { IServerModule, IWeb3ResearchConfig } from "@/../../types/MCP/server";

export const createWeb3ResearchServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IWeb3ResearchConfig> => {

  const defaultConfig: IWeb3ResearchConfig = {
    apiKey: "",
    endpoint: ""
  };

  const isConfigured = (config: IWeb3ResearchConfig): boolean => {
    return !!config.apiKey && !!config.endpoint;
  };

  const createClientConfig = (config: IWeb3ResearchConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "node",
    args: [
      config.endpoint,
      "--api-key", config.apiKey
    ],
    clientName: "web3-research-client",
    clientVersion: "0.9.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      web3ResearchEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("web3-research");
      if (!result.success) {
        toast.error(`Web3 research service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          web3ResearchEnabled: false
        }));
      } else {
        toast.success("Web3 research service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IWeb3ResearchConfig>) => {
    set((state: any) => ({
      ...state,
      web3ResearchConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.web3ResearchEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.web3ResearchConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      web3ResearchAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.web3ResearchAutoApproved || false;
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

export const isWeb3ResearchConfigured = (config: IWeb3ResearchConfig): boolean => {
  return !!config.apiKey && !!config.endpoint;
};

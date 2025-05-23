import { toast } from "@/utils/toast";
import type { IServerModule, IDoorDashConfig } from "@/../../types/MCP/server";

export const createDoorDashServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IDoorDashConfig> => {

  const defaultConfig: IDoorDashConfig = {
    apiKey: "",
    endpoint: "",
    region: "us"
  };

  const isConfigured = (config: IDoorDashConfig): boolean => {
    return !!config.apiKey && !!config.endpoint && !!config.region;
  };

  const createClientConfig = (config: IDoorDashConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "node",
    args: [
      config.endpoint,
      "--api-key", config.apiKey,
      "--region", config.region
    ],
    clientName: "doordash-client",
    clientVersion: "1.1.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      doorDashEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("doordash");
      if (!result.success) {
        toast.error(`DoorDash service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          doorDashEnabled: false
        }));
      } else {
        toast.success("DoorDash service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IDoorDashConfig>) => {
    set((state: any) => ({
      ...state,
      doorDashConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.doorDashEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.doorDashConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      doorDashAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.doorDashAutoApproved || false;
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

export const isDoorDashConfigured = (config: IDoorDashConfig): boolean => {
  return !!config.apiKey && !!config.endpoint && !!config.region;
};

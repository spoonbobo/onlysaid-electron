import { toast } from "@/utils/toast";
import type { IServerModule, IAirbnbConfig } from "@/../../types/MCP/server";

export const createAirbnbServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IAirbnbConfig> => {

  const defaultConfig: IAirbnbConfig = {};

  const isConfigured = (config: IAirbnbConfig): boolean => {
    return true; // No config required for Airbnb
  };

  const createClientConfig = (config: IAirbnbConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "npx",
    args: [
      "-y",
      "@openbnb/mcp-server-airbnb"
    ],
    clientName: "airbnb-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    set((state: any) => ({
      ...state,
      airbnbEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("airbnb");
      if (!result.success) {
        toast.error(`Airbnb service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          airbnbEnabled: false
        }));
      } else {
        toast.success("Airbnb service enabled successfully");
      }
    }
  };

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      airbnbAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.airbnbAutoApproved || false;
  };

  const setConfig = (config: Partial<IAirbnbConfig>) => {
    set((state: any) => ({
      ...state,
      airbnbConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.airbnbEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.airbnbConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

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

export const isAirbnbConfigured = (config: IAirbnbConfig): boolean => {
  return true;
};

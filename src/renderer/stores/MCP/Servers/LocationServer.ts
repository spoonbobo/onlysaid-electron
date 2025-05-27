import { toast } from "@/utils/toast";
import type { IServerModule, ILocationConfig } from "@/../../types/MCP/server";

export const createLocationServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<ILocationConfig> => {

  const defaultConfig: ILocationConfig = {
    path: "",
  };

  const isConfigured = (config: ILocationConfig): boolean => {
    return !!config.path;
  };

  const createClientConfig = (config: ILocationConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: `${homedir}/.local/bin/uv`,
    args: [
      "--directory",
      config.path,
      "run",
      "osm-mcp-server"
    ],
    clientName: "onlysaid-location-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) {
      // Don't enable if not configured
      return;
    }

    set((state: any) => ({
      ...state,
      locationEnabled: enabled
    }));

    // Initialize the client if being enabled
    if (enabled) {
      const result = await initializeClient("location");
      if (!result.success) {
        toast.error(`Location service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          locationEnabled: false
        }));
      } else {
        toast.success("Location service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<ILocationConfig>) => {
    set((state: any) => ({
      ...state,
      locationConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.locationEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.locationConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      locationAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.locationAutoApproved || false;
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
export const isLocationConfigured = (config: ILocationConfig): boolean => {
  return !!config.path;
};

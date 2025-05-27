import { toast } from "@/utils/toast";
import type { IServerModule, IWeatherConfig } from "@/../../types/MCP/server";

export const createWeatherServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IWeatherConfig> => {

  const defaultConfig: IWeatherConfig = {
    apiKey: "",
    endpoint: "",
    units: "metric"
  };

  const isConfigured = (config: IWeatherConfig): boolean => {
    return !!config.apiKey && !!config.endpoint && !!config.units;
  };

  const createClientConfig = (config: IWeatherConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "node",
    args: [
      config.endpoint,
      "--api-key", config.apiKey,
      "--units", config.units
    ],
    clientName: "onlysaid-weather-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      weatherEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("weather");
      if (!result.success) {
        toast.error(`Weather service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          weatherEnabled: false
        }));
      } else {
        toast.success("Weather service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IWeatherConfig>) => {
    set((state: any) => ({
      ...state,
      weatherConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.weatherEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.weatherConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      weatherAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.weatherAutoApproved || false;
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
export const isWeatherConfigured = (config: IWeatherConfig): boolean => {
  return !!config.apiKey && !!config.endpoint && !!config.units;
};

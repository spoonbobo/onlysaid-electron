import { toast } from "@/utils/toast";
import type { IServerModule, IWeatherForecastConfig } from "@/../../types/MCP/server";

export const createWeatherForecastServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IWeatherForecastConfig> => {

  const defaultConfig: IWeatherForecastConfig = {
    apiKey: "",
    path: ""
  };

  const isConfigured = (config: IWeatherForecastConfig): boolean => {
    return !!config.apiKey && !!config.path;
  };

  const createClientConfig = (config: IWeatherForecastConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "python3",
    args: [
      config.path,
    ],
    env: {
      "OPENWEATHER_API_KEY": config.apiKey
    },
    clientName: "weather-forecast-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      weatherForecastEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("weather-forecast");
      if (!result.success) {
        toast.error(`Weather forecast service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          weatherForecastEnabled: false
        }));
      } else {
        toast.success("Weather forecast service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IWeatherForecastConfig>) => {
    set((state: any) => ({
      ...state,
      weatherForecastConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.weatherForecastEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.weatherForecastConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      weatherForecastAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.weatherForecastAutoApproved || false;
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

export const isWeatherForecastConfigured = (config: IWeatherForecastConfig): boolean => {
  return !!config.apiKey && !!config.path;
};

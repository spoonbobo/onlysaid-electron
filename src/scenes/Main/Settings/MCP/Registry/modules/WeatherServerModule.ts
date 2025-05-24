import { IEnhancedServerModule, IWeatherConfig } from "@/../../types/MCP/server";
import { Field } from "@/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const WeatherServerModule: IEnhancedServerModule<IWeatherConfig> = {
  metadata: {
    id: "weather",
    title: "mcp-weather",
    description: "A simple MCP server that provides hourly weather forecasts using the AccuWeather API.",
    version: "unknown",
    icon: "WbSunny",
    sourceUrl: "https://github.com/adhikasp/mcp-weather",
    platforms: ["windows", "macos", "linux"],
    category: "weather"
  },

  defaultConfig: {
    apiKey: "",
    endpoint: "https://dataservice.accuweather.com",
    units: "metric"
  },

  isConfigured: (config: IWeatherConfig) => {
    return !!config.apiKey && !!config.endpoint;
  },

  createClientConfig: (config: IWeatherConfig, homedir: string) => ({
    enabled: true,
    command: "npx",
    args: ["-y", "mcp-weather"],
    env: {
      ACCUWEATHER_API_KEY: config.apiKey,
      WEATHER_ENDPOINT: config.endpoint,
      WEATHER_UNITS: config.units
    },
    clientName: "mcp-weather",
    clientVersion: "1.0.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "apiKey",
      label: "AccuWeather API Key",
      type: "password",
      required: true,
      description: "The API key for the AccuWeather service",
      descriptionLink: {
        text: "Get API Key",
        url: "https://developer.accuweather.com/user/me"
      }
    },
    {
      key: "endpoint",
      label: "AccuWeather Endpoint",
      type: "text",
      required: true,
      placeholder: "https://dataservice.accuweather.com"
    },
    {
      key: "units",
      label: "Temperature Units",
      type: "select",
      required: true,
      options: ["metric", "imperial"]
    }
  ],

  validateConfig: (config: IWeatherConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.apiKey) {
      errors.apiKey = "AccuWeather API Key is required";
      isValid = false;
    }
    if (!config.endpoint) {
      errors.endpoint = "AccuWeather endpoint is required";
      isValid = false;
    }

    return { isValid, errors };
  },

  // Store integration methods
  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IWeatherConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ apiKey: "", endpoint: "https://dataservice.accuweather.com", units: "metric" }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("weather", WeatherServerModule);

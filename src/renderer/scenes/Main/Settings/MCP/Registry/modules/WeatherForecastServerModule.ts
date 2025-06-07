import { IEnhancedServerModule, IWeatherForecastConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const WeatherForecastServerModule: IEnhancedServerModule<IWeatherForecastConfig> = {
  metadata: {
    id: "weather-forecast",
    title: "Weekly Weather MCP Server",
    description: "A weather forecast MCP (Model Context Protocol) server providing 8-day global weather forecasts and current weather conditions.",
    version: "1.2.0",
    icon: "WbSunny",
    sourceUrl: "https://github.com/rossshannon/weekly-weather-mcp",
    platforms: ["windows", "macos", "linux"],
    category: "weather"
  },

  defaultConfig: {
    apiKey: "",
    path: ""
  },

  isConfigured: (config: IWeatherForecastConfig) => {
    return !!config.apiKey && !!config.path;
  },

  createClientConfig: (config: IWeatherForecastConfig, homedir: string) => ({
    enabled: true,
    command: "node",
    args: [`${config.path}/build/index.js`],
    env: {
      OPENWEATHER_API_KEY: config.apiKey
    },
    clientName: "weekly-weather-mcp",
    clientVersion: "1.2.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "path",
      label: "Path to the weather forecast script",
      type: "text",
      required: true,
      description: "Full path to the weather forecast script",
      descriptionLink: {
        text: "Clone the repository",
        url: "https://github.com/rossshannon/weekly-weather-mcp"
      }
    },
    {
      key: "apiKey",
      label: "OpenWeatherMap API Key",
      type: "password",
      required: true,
      description: "The API key for the OpenWeatherMap service",
      descriptionLink: {
        text: "Get API Key",
        url: "https://openweathermap.org/api"
      }
    }
  ],

  validateConfig: (config: IWeatherForecastConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.apiKey) {
      errors.apiKey = "OpenWeatherMap API Key is required";
      isValid = false;
    }
    if (!config.path) {
      errors.path = "Path to weather forecast script is required";
      isValid = false;
    }

    return { isValid, errors };
  },

  // Store integration methods
  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IWeatherForecastConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ apiKey: "", path: "" }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("weatherForecast", WeatherForecastServerModule);

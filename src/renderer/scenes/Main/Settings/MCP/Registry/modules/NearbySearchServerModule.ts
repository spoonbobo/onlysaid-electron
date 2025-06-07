import { IEnhancedServerModule, INearbySearchConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const NearbySearchServerModule: IEnhancedServerModule<INearbySearchConfig> = {
  metadata: {
    id: "nearby-search",
    title: "Nearby Search MCP",
    description: "MCP server for nearby place searches with IP-based location detection. Uses Google Places API.",
    version: "1.0.0",
    icon: "LocationSearching",
    sourceUrl: "https://github.com/kukapay/nearby-search-mcp",
    platforms: ["windows", "macos", "linux"],
    category: "location"
  },

  defaultConfig: {
    apiKey: "",
    endpoint: "",
    defaultRadius: 1000
  },

  isConfigured: (config: INearbySearchConfig) => {
    return !!config.apiKey && !!config.endpoint && config.defaultRadius > 0;
  },

  createClientConfig: (config: INearbySearchConfig, homedir: string) => ({
    enabled: true,
    command: "npx",
    args: ["-y", "@kukapay/nearby-search-mcp"],
    env: {
      GOOGLE_API_KEY: config.apiKey,
      ENDPOINT: config.endpoint,
      DEFAULT_RADIUS: config.defaultRadius.toString()
    },
    clientName: "nearby-search-mcp",
    clientVersion: "1.0.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "apiKey",
      label: "Google API Key",
      type: "password",
      required: true,
      description: "Google Places API key for location searches",
      descriptionLink: {
        text: "Get API Key",
        url: "https://developers.google.com/places/web-service/get-api-key"
      }
    },
    {
      key: "endpoint",
      label: "Service Endpoint",
      type: "text",
      required: true,
      placeholder: "https://api.example.com"
    },
    {
      key: "defaultRadius",
      label: "Default Search Radius (meters)",
      type: "number",
      required: true,
      placeholder: "1000"
    }
  ],

  validateConfig: (config: INearbySearchConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.apiKey) {
      errors.apiKey = "Google API Key is required";
      isValid = false;
    }
    if (!config.endpoint) {
      errors.endpoint = "Service endpoint is required";
      isValid = false;
    }
    if (!config.defaultRadius || config.defaultRadius <= 0) {
      errors.defaultRadius = "Default radius must be greater than 0";
      isValid = false;
    }

    return { isValid, errors };
  },

  // Store integration methods
  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<INearbySearchConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ apiKey: "", endpoint: "", defaultRadius: 1000 }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("nearbySearch", NearbySearchServerModule);

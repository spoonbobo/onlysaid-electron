import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "@/utils/toast";

interface WeatherServiceConfig {
  apiKey: string;
  endpoint: string;
  units: string;
}

interface LocationServiceConfig {
  path: string;
}

interface NearbySearchConfig {
  apiKey: string;
  endpoint: string;
  defaultRadius: number;
}

interface WeatherForecastConfig {
  apiKey: string;
  path: string;
}

interface Web3ResearchConfig {
  apiKey: string;
  endpoint: string;
}

interface DoorDashConfig {
  apiKey: string;
  endpoint: string;
  region: string;
}

interface WhatsAppConfig {
  path: string;
}

interface GitHubConfig {
  accessToken: string;
}

interface IPLocationConfig {
  apiKey: string;
}

interface AirbnbConfig {

}

interface TavilyConfig {
  apiKey: string;
}

interface LinkedInConfig {
  email: string;
  password: string;
}

// Add this interface to store tool information
interface MCPTool {
  name: string;
  description: string;
  input_schema: any;
}

interface MCPState {
  // Service states
  weatherEnabled: boolean;
  locationEnabled: boolean;
  ipLocationEnabled: boolean;
  weatherForecastEnabled: boolean;

  // Service configurations
  weatherConfig: WeatherServiceConfig;
  locationConfig: LocationServiceConfig;
  weatherForecastConfig: WeatherForecastConfig;

  // New services
  nearbySearchEnabled: boolean;
  web3ResearchEnabled: boolean;
  doorDashEnabled: boolean;
  whatsAppEnabled: boolean;
  gitHubEnabled: boolean;
  airbnbEnabled: boolean;

  nearbySearchConfig: NearbySearchConfig;
  web3ResearchConfig: Web3ResearchConfig;
  doorDashConfig: DoorDashConfig;
  whatsAppConfig: WhatsAppConfig;
  gitHubConfig: GitHubConfig;
  ipLocationConfig: IPLocationConfig;
  airbnbConfig: AirbnbConfig;

  // Add Tavily state
  tavilyEnabled: boolean;
  tavilyConfig: TavilyConfig;

  // Add LinkedIn state
  linkedInEnabled: boolean;
  linkedInConfig: LinkedInConfig;

  // Add a property to store tools by service type
  serviceTools: Record<string, MCPTool[]>;

  // Actions
  setWeatherEnabled: (enabled: boolean) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setWeatherConfig: (config: Partial<WeatherServiceConfig>) => void;
  setLocationConfig: (config: Partial<LocationServiceConfig>) => void;
  setWeatherForecastEnabled: (enabled: boolean) => void;
  setWeatherForecastConfig: (config: Partial<WeatherForecastConfig>) => void;
  setNearbySearchEnabled: (enabled: boolean) => void;
  setWeb3ResearchEnabled: (enabled: boolean) => void;
  setDoorDashEnabled: (enabled: boolean) => void;
  setWhatsAppEnabled: (enabled: boolean) => void;
  setGitHubEnabled: (enabled: boolean) => void;
  setIPLocationEnabled: (enabled: boolean) => void;
  setNearbySearchConfig: (config: Partial<NearbySearchConfig>) => void;
  setWeb3ResearchConfig: (config: Partial<Web3ResearchConfig>) => void;
  setDoorDashConfig: (config: Partial<DoorDashConfig>) => void;
  setWhatsAppConfig: (config: Partial<WhatsAppConfig>) => void;
  setGitHubConfig: (config: Partial<GitHubConfig>) => void;
  setIPLocationConfig: (config: Partial<IPLocationConfig>) => void;
  setAirbnbEnabled: (enabled: boolean) => void;
  setAirbnbConfig: (config: Partial<AirbnbConfig>) => void;
  setTavilyEnabled: (enabled: boolean) => void;
  setTavilyConfig: (config: Partial<TavilyConfig>) => void;
  setLinkedInEnabled: (enabled: boolean) => void;
  setLinkedInConfig: (config: Partial<LinkedInConfig>) => void;
  resetToDefaults: () => void;

  // Generic IPC action
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>;

  // Add validation functions
  isWeatherConfigured: () => boolean;
  isLocationConfigured: () => boolean;
  isWeatherForecastConfigured: () => boolean;
  isNearbySearchConfigured: () => boolean;
  isWeb3ResearchConfigured: () => boolean;
  isDoorDashConfigured: () => boolean;
  isWhatsAppConfigured: () => boolean;
  isGitHubConfigured: () => boolean;
  isIPLocationConfigured: () => boolean;
  isAirbnbConfigured: () => boolean;
  isTavilyConfigured: () => boolean;
  isLinkedInConfigured: () => boolean;

  // Add new action
  getAllConfiguredServers: () => {
    [key: string]: {
      enabled: boolean;
      configured: boolean;
      config: any;
    }
  };

  // Add function to set tools for a service
  setServiceTools: (serviceType: string, tools: MCPTool[]) => void;

  // Add function to get tools for a service
  getServiceTools: (serviceType: string) => MCPTool[];

  // Add a method to get server ID by tool name
  getServerIdByToolName: (toolName: string) => string | null;

  // Add utility method for consistent formatting
  formatServerName: (serverId: string) => string;
}

const DEFAULT_CONFIG = {
  weatherEnabled: false,
  locationEnabled: false,
  ipLocationEnabled: false,
  weatherForecastEnabled: false,
  weatherConfig: {
    apiKey: "",
    endpoint: "",
    units: "metric"
  },
  locationConfig: {
    path: "",
  },
  weatherForecastConfig: {
    apiKey: "",
    path: ""
  },
  nearbySearchEnabled: false,
  web3ResearchEnabled: false,
  doorDashEnabled: false,
  whatsAppEnabled: false,
  gitHubEnabled: false,
  airbnbEnabled: false,
  nearbySearchConfig: {
    apiKey: "",
    endpoint: "",
    defaultRadius: 1500
  },
  web3ResearchConfig: {
    apiKey: "",
    endpoint: ""
  },
  doorDashConfig: {
    apiKey: "",
    endpoint: "",
    region: "us"
  },
  whatsAppConfig: {
    path: ""
  },
  gitHubConfig: {
    accessToken: ""
  },
  ipLocationConfig: {
    apiKey: ""
  },
  airbnbConfig: {
    apiKey: "",
    endpoint: "",
    region: "us"
  },
  tavilyEnabled: false,
  tavilyConfig: {
    apiKey: "",
  },
  linkedInEnabled: false,
  linkedInConfig: {
    email: "",
    password: ""
  },
  // Initialize empty tools map
  serviceTools: {}
};

// Add validation functions to the store
const isWeatherConfigured = (config: WeatherServiceConfig): boolean => {
  return !!config.apiKey && !!config.endpoint && !!config.units;
};

const isLocationConfigured = (config: LocationServiceConfig): boolean => {
  return !!config.path;
};

// Validation functions
const isWeatherForecastConfigured = (config: WeatherForecastConfig): boolean => {
  return !!config.apiKey && !!config.path;
};

const isNearbySearchConfigured = (config: NearbySearchConfig): boolean => {
  return !!config.apiKey && !!config.endpoint;
};

const isWeb3ResearchConfigured = (config: Web3ResearchConfig): boolean => {
  return !!config.apiKey && !!config.endpoint;
};

const isDoorDashConfigured = (config: DoorDashConfig): boolean => {
  return !!config.apiKey && !!config.endpoint && !!config.region;
};

const isWhatsAppConfigured = (config: WhatsAppConfig): boolean => {
  return !!config.path;
};

const isGitHubConfigured = (config: GitHubConfig): boolean => {
  return !!config.accessToken;
};

const isIPLocationConfigured = (config: IPLocationConfig): boolean => {
  return !!config.apiKey;
};

const isAirbnbConfigured = (config: AirbnbConfig): boolean => {
  return true;
};

const isTavilyConfigured = (config: TavilyConfig): boolean => {
  return !!config.apiKey;
};

const isLinkedInConfigured = (config: LinkedInConfig): boolean => {
  return !!config.email && !!config.password;
};

export const useMCPStore = create<MCPState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CONFIG,

      setWeatherEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isWeatherConfigured(state.weatherConfig)) {
          // Don't enable if not configured
          return;
        }

        set({ weatherEnabled: enabled });

        // Initialize the client if being enabled
        if (enabled) {
          const result = await state.initializeClient("weather");
          if (!result.success) {
            toast.error(`Weather service error: ${result.error}`);
            set({ weatherEnabled: false });
          } else {
            toast.success("Weather service enabled successfully");
          }
        }
      },

      setLocationEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isLocationConfigured(state.locationConfig)) {
          // Don't enable if not configured
          return;
        }

        set({ locationEnabled: enabled });

        // Initialize the client if being enabled
        if (enabled) {
          const result = await state.initializeClient("location");
          if (!result.success) {
            toast.error(`Location service error: ${result.error}`);
            set({ locationEnabled: false });
          } else {
            toast.success("Location service enabled successfully");
          }
        }
      },

      setWeatherConfig: (config) => set((state) => ({
        weatherConfig: { ...state.weatherConfig, ...config }
      })),

      setLocationConfig: (config) => set((state) => ({
        locationConfig: { ...state.locationConfig, ...config }
      })),

      setWeatherForecastEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isWeatherForecastConfigured(state.weatherForecastConfig)) return;

        set({ weatherForecastEnabled: enabled });

        // Initialize the client if being enabled
        if (enabled) {
          const result = await state.initializeClient("weather-forecast");
          if (!result.success) {
            toast.error(`Weather forecast service error: ${result.error}`);
            set({ weatherForecastEnabled: false });
          } else {
            toast.success("Weather forecast service enabled successfully");
          }
        }
      },

      setWeatherForecastConfig: (config) => set((state) => ({
        weatherForecastConfig: { ...state.weatherForecastConfig, ...config }
      })),

      setNearbySearchEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isNearbySearchConfigured(state.nearbySearchConfig)) return;

        set({ nearbySearchEnabled: enabled });

        // Initialize the client if being enabled
        if (enabled) {
          const result = await state.initializeClient("nearby-search");
          if (!result.success) {
            toast.error(`Nearby search service error: ${result.error}`);
            set({ nearbySearchEnabled: false });
          } else {
            toast.success("Nearby search service enabled successfully");
          }
        }
      },

      setWeb3ResearchEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isWeb3ResearchConfigured(state.web3ResearchConfig)) return;

        set({ web3ResearchEnabled: enabled });

        // Initialize the client if being enabled
        if (enabled) {
          const result = await state.initializeClient("web3-research");
          if (!result.success) {
            toast.error(`Web3 research service error: ${result.error}`);
            set({ web3ResearchEnabled: false });
          } else {
            toast.success("Web3 research service enabled successfully");
          }
        }
      },

      setDoorDashEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isDoorDashConfigured(state.doorDashConfig)) return;

        set({ doorDashEnabled: enabled });

        // Initialize the client if being enabled
        if (enabled) {
          const result = await state.initializeClient("doordash");
          if (!result.success) {
            toast.error(`DoorDash service error: ${result.error}`);
            set({ doorDashEnabled: false });
          } else {
            toast.success("DoorDash service enabled successfully");
          }
        }
      },

      setWhatsAppEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isWhatsAppConfigured(state.whatsAppConfig)) return;

        set({ whatsAppEnabled: enabled });

        // Initialize the client if being enabled
        if (enabled) {
          const result = await state.initializeClient("whatsapp");
          if (!result.success) {
            toast.error(`WhatsApp service error: ${result.error}`);
            set({ whatsAppEnabled: false });
          } else {
            toast.success("WhatsApp service enabled successfully");
          }
        }
      },

      setGitHubEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isGitHubConfigured(state.gitHubConfig)) return;

        set({ gitHubEnabled: enabled });

        // Initialize the client if being enabled
        if (enabled) {
          const result = await state.initializeClient("github");
          if (!result.success) {
            toast.error(`GitHub service error: ${result.error}`);
            set({ gitHubEnabled: false });
          } else {
            toast.success("GitHub service enabled successfully");
          }
        }
      },

      setIPLocationEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isIPLocationConfigured(state.ipLocationConfig)) return;

        set({ ipLocationEnabled: enabled });

        // Initialize the client if being enabled
        if (enabled) {
          const result = await state.initializeClient("ip-location");
          if (!result.success) {
            toast.error(`IP location service error: ${result.error}`);
            set({ ipLocationEnabled: false });
          } else {
            toast.success("IP location service enabled successfully");
          }
        }
      },

      setNearbySearchConfig: (config) => set((state) => ({
        nearbySearchConfig: { ...state.nearbySearchConfig, ...config }
      })),

      setWeb3ResearchConfig: (config) => set((state) => ({
        web3ResearchConfig: { ...state.web3ResearchConfig, ...config }
      })),

      setDoorDashConfig: (config) => set((state) => ({
        doorDashConfig: { ...state.doorDashConfig, ...config }
      })),

      setWhatsAppConfig: (config) => set((state) => ({
        whatsAppConfig: { ...state.whatsAppConfig, ...config }
      })),

      setGitHubConfig: (config) => set((state) => ({
        gitHubConfig: { ...state.gitHubConfig, ...config }
      })),

      setIPLocationConfig: (config) => set((state) => ({
        ipLocationConfig: { ...state.ipLocationConfig, ...config }
      })),

      setAirbnbEnabled: async (enabled) => {
        const state = get();
        set({ airbnbEnabled: enabled });

        if (enabled) {
          const result = await state.initializeClient("airbnb");
          if (!result.success) {
            toast.error(`Airbnb service error: ${result.error}`);
            set({ airbnbEnabled: false });
          } else {
            toast.success("Airbnb service enabled successfully");
          }
        }
      },

      setAirbnbConfig: (config) => set((state) => ({
        airbnbConfig: { ...state.airbnbConfig, ...config }
      })),

      setTavilyEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isTavilyConfigured(state.tavilyConfig)) return;
        set({ tavilyEnabled: enabled });

        if (enabled) {
          const result = await state.initializeClient("tavily");
          if (!result.success) {
            toast.error(`Tavily service error: ${result.error}`);
            set({ tavilyEnabled: false });
          } else {
            toast.success("Tavily service enabled successfully");
          }
        }
      },

      setTavilyConfig: (config) => set((state) => ({
        tavilyConfig: { ...state.tavilyConfig, ...config }
      })),

      setLinkedInEnabled: async (enabled) => {
        const state = get();
        if (enabled && !isLinkedInConfigured(state.linkedInConfig)) return;
        set({ linkedInEnabled: enabled });

        if (enabled) {
          const result = await state.initializeClient("linkedin");
          if (!result.success) {
            toast.error(`LinkedIn service error: ${result.error}`);
            set({ linkedInEnabled: false });
          } else {
            toast.success("LinkedIn service enabled successfully");
          }
        }
      },

      setLinkedInConfig: (config) => set((state) => ({
        linkedInConfig: { ...state.linkedInConfig, ...config }
      })),

      resetToDefaults: () => set(DEFAULT_CONFIG),

      // Add setter for service tools
      setServiceTools: (serviceType, tools) => set((state) => ({
        serviceTools: { ...state.serviceTools, [serviceType]: tools }
      })),

      // Add getter for service tools
      getServiceTools: (serviceType) => {
        const { serviceTools } = get();
        return serviceTools[serviceType] || [];
      },

      // Add a method to get server ID by tool name
      getServerIdByToolName: (toolName: string) => {
        const { serviceTools } = get();
        for (const [serverId, tools] of Object.entries(serviceTools)) {
          if (tools.some(tool => tool.name === toolName)) {
            return serverId;
          }
        }
        return null;
      },

      // Add utility method for consistent formatting
      formatServerName: (serverId: string): string => {
        return serverId
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim()
          .replace(/Category$/, '')
          .trim();
      },

      // Update initializeClient to handle tools
      initializeClient: async (serviceType: string) => {
        const state = get();

        try {
          let config;

          // Configure based on service type
          switch (serviceType) {
            case "weather":
              config = {
                enabled: state.weatherEnabled,
                command: "node",
                args: [
                  state.weatherConfig.endpoint,
                  "--api-key", state.weatherConfig.apiKey,
                  "--units", state.weatherConfig.units
                ],
                clientName: "onlysaid-weather-client",
                clientVersion: "1.0.0"
              };
              break;
            case "location":
              config = {
                enabled: state.locationEnabled,
                command: `${window.electron.homedir()}/.local/bin/uv`,
                args: [
                  "--directory",
                  state.locationConfig.path,
                  "run",
                  "osm-mcp-server"
                ],
                clientName: "onlysaid-location-client",
                clientVersion: "1.0.0"
              };
              break;
            case "weather-forecast":
              config = {
                enabled: state.weatherForecastEnabled,
                command: "python3",
                args: [
                  state.weatherForecastConfig.path,
                ],
                env: {
                  "OPENWEATHER_API_KEY": state.weatherForecastConfig.apiKey
                },
                clientName: "weather-forecast-client",
                clientVersion: "1.0.0"
              };
              break;
            case "nearby-search":
              config = {
                enabled: state.nearbySearchEnabled,
                command: "uv",
                args: [
                  "run",
                  "main.py",
                  "--api-key", state.nearbySearchConfig.apiKey
                ],
                env: {
                  "GOOGLE_API_KEY": state.nearbySearchConfig.apiKey
                },
                clientName: "nearby-search-client",
                clientVersion: "1.0.0"
              };
              break;
            case "web3-research":
              config = {
                enabled: state.web3ResearchEnabled,
                command: "node",
                args: [
                  state.web3ResearchConfig.endpoint,
                  "--api-key", state.web3ResearchConfig.apiKey
                ],
                clientName: "web3-research-client",
                clientVersion: "0.9.0"
              };
              break;
            case "doordash":
              config = {
                enabled: state.doorDashEnabled,
                command: "node",
                args: [
                  state.doorDashConfig.endpoint,
                  "--api-key", state.doorDashConfig.apiKey,
                  "--region", state.doorDashConfig.region
                ],
                clientName: "doordash-client",
                clientVersion: "1.1.0"
              };
              break;
            case "whatsapp":
              config = {
                enabled: state.whatsAppEnabled,
                command: `${window.electron.homedir()}/.local/bin/uv`,
                args: [
                  "--directory",
                  state.whatsAppConfig.path,
                  "run",
                  "main.py"
                ],
                clientName: "whatsapp-client",
                clientVersion: "0.8.0"
              };
              break;
            case "github":
              config = {
                enabled: state.gitHubEnabled,
                command: "docker",
                args: [
                  "run",
                  "-i",
                  "--rm",
                  "-e",
                  "GITHUB_PERSONAL_ACCESS_TOKEN",
                  "ghcr.io/github/github-mcp-server"
                ],
                env: {
                  "GITHUB_PERSONAL_ACCESS_TOKEN": state.gitHubConfig.accessToken
                },
                clientName: "github-client",
                clientVersion: "1.2.0"
              };
              break;
            case "ip-location":
              config = {
                enabled: state.ipLocationEnabled,
                command: `${window.electron.homedir()}/.local/bin/uvx`,
                args: [
                  "--from",
                  "git+https://github.com/briandconnelly/mcp-server-ipinfo.git",
                  "mcp-server-ipinfo"

                ],
                env: {
                  "IPINFO_API_TOKEN": state.ipLocationConfig.apiKey
                },
                clientName: "ip-location-client",
                clientVersion: "1.0.0"
              };
              break;
            // npx -y @smithery/cli install @openbnb-org/mcp-server-airbnb --client claude
            case "airbnb":
              config = {
                enabled: state.airbnbEnabled,
                command: "npx",
                args: [
                  "-y",
                  "@openbnb/mcp-server-airbnb"
                ],
                clientName: "airbnb-client",
                clientVersion: "1.0.0"
              };
              break;
            case "tavily":
              config = {
                enabled: state.tavilyEnabled,
                command: "npx",
                args: [
                  "-y",
                  "tavily-mcp@0.1.4"

                ],
                env: {
                  "TAVILY_API_KEY": state.tavilyConfig.apiKey
                },
                clientName: "tavily-client",
                clientVersion: "1.0.0"
              };
              break;
            case "linkedin":
              config = {
                enabled: state.linkedInEnabled,
                command: "uvx",
                args: [
                  "--from",
                  "git+https://github.com/adhikasp/mcp-linkedin",
                  "mcp-linkedin"
                ],
                env: {
                  "LINKEDIN_EMAIL": state.linkedInConfig.email,
                  "LINKEDIN_PASSWORD": state.linkedInConfig.password
                },
                clientName: "linkedin-client",
                clientVersion: "1.0.0"
              };
              break;
            default:
              return { success: false, error: `Unknown service type: ${serviceType}` };
          }

          const result = await window.electron.mcp.initialize_client({
            serverName: serviceType,
            config
          });

          // Store tools if they were returned from the server
          if (result.success && result.tools) {
            state.setServiceTools(serviceType, result.tools);
          }

          return result;
        } catch (error: any) {
          console.error(`Error initializing ${serviceType} client:`, error);
          return { success: false, error: error.message || "Unknown error" };
        }
      },

      // Add validation methods
      isWeatherConfigured: () => {
        const { weatherConfig } = get();
        return isWeatherConfigured(weatherConfig);
      },

      isLocationConfigured: () => {
        const { locationConfig } = get();
        return isLocationConfigured(locationConfig);
      },

      isWeatherForecastConfigured: () => {
        const { weatherForecastConfig } = get();
        return isWeatherForecastConfigured(weatherForecastConfig);
      },

      isNearbySearchConfigured: () => {
        const { nearbySearchConfig } = get();
        return isNearbySearchConfigured(nearbySearchConfig);
      },

      isWeb3ResearchConfigured: () => {
        const { web3ResearchConfig } = get();
        return isWeb3ResearchConfigured(web3ResearchConfig);
      },

      isDoorDashConfigured: () => {
        const { doorDashConfig } = get();
        return isDoorDashConfigured(doorDashConfig);
      },

      isWhatsAppConfigured: () => {
        const { whatsAppConfig } = get();
        return isWhatsAppConfigured(whatsAppConfig);
      },

      isGitHubConfigured: () => {
        const { gitHubConfig } = get();
        return isGitHubConfigured(gitHubConfig);
      },

      isIPLocationConfigured: () => {
        const { ipLocationConfig } = get();
        return isIPLocationConfigured(ipLocationConfig);
      },

      isAirbnbConfigured: () => {
        return true;
      },

      isTavilyConfigured: () => {
        const { tavilyConfig } = get();
        return isTavilyConfigured(tavilyConfig);
      },

      isLinkedInConfigured: () => {
        const { linkedInConfig } = get();
        return isLinkedInConfigured(linkedInConfig);
      },

      getAllConfiguredServers: () => {
        const state = get();

        return {
          weatherCategory: {
            enabled: state.weatherEnabled,
            configured: state.isWeatherConfigured(),
            config: state.weatherConfig
          },
          location: {
            enabled: state.locationEnabled,
            configured: state.isLocationConfigured(),
            config: state.locationConfig
          },
          weatherForecast: {
            enabled: state.weatherForecastEnabled,
            configured: state.isWeatherForecastConfigured(),
            config: state.weatherForecastConfig
          },
          nearbySearch: {
            enabled: state.nearbySearchEnabled,
            configured: state.isNearbySearchConfigured(),
            config: state.nearbySearchConfig
          },
          web3Research: {
            enabled: state.web3ResearchEnabled,
            configured: state.isWeb3ResearchConfigured(),
            config: state.web3ResearchConfig
          },
          doorDash: {
            enabled: state.doorDashEnabled,
            configured: state.isDoorDashConfigured(),
            config: state.doorDashConfig
          },
          whatsApp: {
            enabled: state.whatsAppEnabled,
            configured: state.isWhatsAppConfigured(),
            config: state.whatsAppConfig
          },
          github: {
            enabled: state.gitHubEnabled,
            configured: state.isGitHubConfigured(),
            config: state.gitHubConfig
          },
          ipLocation: {
            enabled: state.ipLocationEnabled,
            configured: state.isIPLocationConfigured(),
            config: state.ipLocationConfig
          },
          airbnb: {
            enabled: state.airbnbEnabled,
            configured: state.isAirbnbConfigured(),
            config: state.airbnbConfig
          },
          tavily: {
            enabled: state.tavilyEnabled,
            configured: state.isTavilyConfigured(),
            config: state.tavilyConfig
          },
          linkedIn: {
            enabled: state.linkedInEnabled,
            configured: state.isLinkedInConfigured(),
            config: state.linkedInConfig
          }
        };
      },
    }),
    {
      name: "mcp-service-storage"
    }
  )
);
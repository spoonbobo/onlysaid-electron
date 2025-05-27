import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createTavilyServer } from "./Servers/TavilyServer";
import { createWeatherServer } from "./Servers/WeatherServer";
import { createLocationServer } from "./Servers/LocationServer";
import { createWeatherForecastServer } from "./Servers/WeatherForecastServer";
import { createNearbySearchServer } from "./Servers/NearbySearchServer";
import { createWeb3ResearchServer } from "./Servers/Web3ResearchServer";
import { createDoorDashServer } from "./Servers/DoorDashServer";
import { createWhatsAppServer } from "./Servers/WhatsAppServer";
import { createGitHubServer } from "./Servers/GitHubServer";
import { createIPLocationServer } from "./Servers/IPLocationServer";
import { createAirbnbServer } from "./Servers/AirbnbServer";
import { createLinkedInServer } from "./Servers/LinkedInServer";
import { createMS365Server } from "./Servers/MS365Server";
import { createMSTeamsServer } from "./Servers/MSTeamsServer";
import { createGoogleCalendarServer } from "./Servers/GoogleCalendarServer";
import type { IMCPTool } from "@/../../types/MCP/tool";
import type {
  ITavilyState,
  IWeatherState,
  ILocationState,
  IWeatherForecastState,
  INearbySearchState,
  IWeb3ResearchState,
  IDoorDashState,
  IWhatsAppState,
  IGitHubState,
  IIPLocationState,
  IAirbnbState,
  ILinkedInState,
  IMS365State,
  IMSTeamsState,
  IGoogleCalendarState,
  IServerModule
} from "@/../../types/MCP/server";

// Server registry - no method names needed anymore
const SERVER_REGISTRY = {
  tavily: createTavilyServer,
  weather: createWeatherServer,
  location: createLocationServer,
  weatherForecast: createWeatherForecastServer,
  nearbySearch: createNearbySearchServer,
  web3Research: createWeb3ResearchServer,
  doorDash: createDoorDashServer,
  whatsApp: createWhatsAppServer,
  github: createGitHubServer,
  ipLocation: createIPLocationServer,
  airbnb: createAirbnbServer,
  linkedIn: createLinkedInServer,
  ms365: createMS365Server,
  msTeams: createMSTeamsServer,
  googleCalendar: createGoogleCalendarServer,
};

const SERVICE_TYPE_MAPPING: Record<string, string> = {
  'weather': 'weather',
  'location': 'location',
  'weather-forecast': 'weatherForecast',
  'nearby-search': 'nearbySearch',
  'web3-research': 'web3Research',
  'doordash': 'doorDash',
  'whatsapp': 'whatsApp',
  'github': 'github',
  'ip-location': 'ipLocation',
  'airbnb': 'airbnb',
  'tavily': 'tavily',
  'linkedin': 'linkedIn',
  'ms365': 'ms365',
  'ms-teams': 'msTeams',
  'google-calendar': 'googleCalendar',
};

interface MCPState extends
  ITavilyState,
  IWeatherState,
  ILocationState,
  IWeatherForecastState,
  INearbySearchState,
  IWeb3ResearchState,
  IDoorDashState,
  IWhatsAppState,
  IGitHubState,
  IIPLocationState,
  IAirbnbState,
  ILinkedInState,
  IMS365State,
  IMSTeamsState,
  IGoogleCalendarState {

  serviceTools: Record<string, IMCPTool[]>;
  servers: Record<string, IServerModule>;

  // Generic methods only
  setServerEnabled: (serverName: string, enabled: boolean) => void;
  setServerConfig: (serverName: string, config: any) => void;
  setServerAutoApproved: (serverName: string, autoApproved: boolean) => void;
  isServerConfigured: (serverName: string) => boolean;
  getServerAutoApproved: (serverName: string) => boolean;
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  getAllConfiguredServers: () => Record<string, any>;
  resetToDefaults: () => void;

  // Utility methods
  setServiceTools: (serviceType: string, tools: IMCPTool[]) => void;
  getServiceTools: (serviceType: string) => IMCPTool[];
  getServerIdByToolName: (toolName: string) => string | null;
  formatServerName: (serverId: string) => string;
}

export const useMCPStore = create<MCPState>()(
  persist(
    (set, get) => {
      // Create servers first to get their default configs
      const createServerInstances = () => {
        return Object.entries(SERVER_REGISTRY).reduce((acc, [serverName, createServer]) => {
          acc[serverName] = createServer(
            get,
            set,
            async (serviceType: string) => {
              const state = get();
              return await state.initializeClient(serviceType);
            }
          );
          return acc;
        }, {} as Record<string, IServerModule>);
      };

      // Create temporary servers to extract default configs
      const tempServers = createServerInstances();

      // Generate default state dynamically from server configs
      const defaultState = {
        // Generate enabled/config pairs for each server
        ...Object.entries(tempServers).reduce((state, [serverName, server]) => {
          const camelCaseName = serverName;
          return {
            ...state,
            [`${camelCaseName}Enabled`]: false,
            [`${camelCaseName}Config`]: server.defaultConfig,
          };
        }, {}),

        serviceTools: {} as Record<string, IMCPTool[]>,
      };

      // Create the actual servers (reuse the temp ones)
      const servers = tempServers;

      return {
        // Start with dynamically generated default state
        ...defaultState,

        servers,

        // Generic methods
        setServerEnabled: (serverName, enabled) => {
          const server = servers[serverName];
          if (server) {
            server.setEnabled(enabled);
          } else {
            console.warn(`Unknown server: ${serverName}`);
          }
        },

        setServerConfig: (serverName, config) => {
          const server = servers[serverName];
          if (server) {
            server.setConfig(config);
          } else {
            console.warn(`Unknown server: ${serverName}`);
          }
        },

        setServerAutoApproved: (serverName, autoApproved) => {
          const server = servers[serverName];
          if (server && server.setAutoApproved) {
            server.setAutoApproved(autoApproved);
          } else {
            console.warn(`Unknown server or setAutoApproved not available: ${serverName}`);
          }
        },

        getServerAutoApproved: (serverName) => {
          const server = servers[serverName];
          return server && server.getAutoApproved ? server.getAutoApproved() : false;
        },

        isServerConfigured: (serverName) => {
          const server = servers[serverName];
          return server ? server.getConfigured() : false;
        },

        initializeClient: async (serviceType: string) => {
          const serverName = SERVICE_TYPE_MAPPING[serviceType];
          const server = serverName ? servers[serverName] : undefined;

          if (!server) {
            return { success: false, error: `Unknown service type: ${serviceType}` };
          }

          try {
            const config = server.createClientConfig(server.getConfig(), window.electron.homedir());
            const result = await window.electron.mcp.initialize_client({
              serverName: serviceType,
              config
            });

            if (result.success && result.tools) {
              get().setServiceTools(serviceType, result.tools);
            }

            return result;
          } catch (error: any) {
            console.error(`Error initializing ${serviceType} client:`, error);
            return { success: false, error: error.message || "Unknown error" };
          }
        },

        getAllConfiguredServers: () => {
          return Object.entries(servers).reduce((acc, [name, server]) => {
            acc[name] = {
              enabled: server.getEnabled(),
              configured: server.getConfigured(),
              config: server.getConfig()
            };
            return acc;
          }, {} as Record<string, any>);
        },

        resetToDefaults: () => {
          Object.values(servers).forEach(server => {
            server.setConfig(server.defaultConfig);
            server.setEnabled(false);
          });
          set({ serviceTools: {} });
        },

        setServiceTools: (serviceType, tools) => set((state) => ({
          serviceTools: { ...state.serviceTools, [serviceType]: tools }
        })),

        getServiceTools: (serviceType) => {
          const { serviceTools } = get();
          return serviceTools[serviceType] || [];
        },

        getServerIdByToolName: (toolName: string) => {
          const { serviceTools } = get();
          for (const [serverId, tools] of Object.entries(serviceTools)) {
            if (tools.some(tool => tool.name === toolName)) {
              return serverId;
            }
          }
          return null;
        },

        formatServerName: (serverId: string): string => {
          return serverId
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim()
            .replace(/Category$/, '')
            .trim();
        },
      } as MCPState;
    },
    {
      name: "mcp-service-storage"
    }
  )
);
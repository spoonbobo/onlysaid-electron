import { IServerRegistry, IEnhancedServerModule } from "@/../../types/MCP/server";
import { WhatsAppServerModule } from "./modules/WhatsAppServerModule";

class ServerRegistry {
  private servers: IServerRegistry = {};

  register(serverKey: string, module: IEnhancedServerModule) {
    this.servers[serverKey] = module;
  }

  get(serverKey: string): IEnhancedServerModule | undefined {
    return this.servers[serverKey];
  }

  getAll(): IServerRegistry {
    return { ...this.servers };
  }

  getAllByCategory(category: string): IServerRegistry {
    return Object.fromEntries(
      Object.entries(this.servers).filter(
        ([_, module]) => module.metadata.category === category
      )
    );
  }

  // Backward compatibility - get server by old service type mapping
  getByServiceType(serviceType: string): IEnhancedServerModule | undefined {
    const serviceToServerMap: Record<string, string> = {
      "whatsapp": "whatsApp",
      "weather": "weather",
      "weather-forecast": "weatherForecast",
      "location": "location",
      "nearby-search": "nearbySearch",
      "web3-research": "web3Research",
      "doordash": "doorDash",
      "github": "github",
      "ip-location": "ipLocation",
      "airbnb": "airbnb",
      "tavily": "tavily",
      "linkedin": "linkedIn"
    };

    const serverKey = serviceToServerMap[serviceType];
    return serverKey ? this.get(serverKey) : undefined;
  }
}

export const serverRegistry = new ServerRegistry();

// Auto-register all server modules
import "./modules/WhatsAppServerModule";
import "./modules/WeatherServerModule";
import "./modules/WeatherForecastServerModule";
import "./modules/NearbySearchServerModule";
import "./modules/Web3ResearchServerModule";
import "./modules/TavilyServerModule";
import "./modules/AirbnbServerModule";
import "./modules/DoorDashServerModule";
import "./modules/GitHubServerModule";
import "./modules/LinkedInServerModule";
import "./modules/IPLocationServerModule";
import "./modules/LocationServerModule";

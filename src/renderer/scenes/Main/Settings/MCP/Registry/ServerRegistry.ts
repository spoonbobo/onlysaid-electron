import { IServerRegistry, IEnhancedServerModule } from "@/../../types/MCP/server";

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
}

export const serverRegistry = new ServerRegistry();

// Auto-register all server modules
import "./modules/WhatsAppServerModule";
import "./modules/WeatherServerModule";
import "./modules/WeatherForecastServerModule";
import "./modules/NearbySearchServerModule";
import "./modules/Web3ResearchServerModule";
import "./modules/TavilyServerModule";
import "./modules/N8nServerModule";
import "./modules/PlaywrightServerModule";
import "./modules/AirbnbServerModule";
import "./modules/DoorDashServerModule";
import "./modules/GitHubServerModule";
import "./modules/LinkedInServerModule";
import "./modules/IPLocationServerModule";
import "./modules/LocationServerModule";
import "./modules/MS365ServerModule";
import "./modules/MSTeamsServerModule";
import "./modules/GoogleCalendarServerModule";
import "./modules/GoogleGmailServerModule";
import "./modules/LaraServerModule";
import "./modules/ChessMCPServerModule";
import "./modules/OTRSServerModule";
import "./modules/MoodleServerModule";

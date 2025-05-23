import { BaseServer } from './BaseServer';
import { ITavilyConfig } from '@/../../types/MCP/server';

export class TavilyServer extends BaseServer<ITavilyConfig> {
  constructor() {
    super({
      apiKey: ""
    });
  }

  validateConfig(config: ITavilyConfig): boolean {
    return !!config.apiKey;
  }

  getServiceType(): string {
    return "tavily";
  }

  getSuccessMessage(): string {
    return "Tavily service enabled successfully";
  }

  getErrorMessage(error: string): string {
    return `Tavily service error: ${error}`;
  }

  getInitializeConfig(): any {
    return {
      enabled: this.enabled,
      command: "npx",
      args: [
        "-y",
        "tavily-mcp@0.1.4"
      ],
      env: {
        "TAVILY_API_KEY": this.config.apiKey
      },
      clientName: "tavily-client",
      clientVersion: "1.0.0"
    };
  }
}

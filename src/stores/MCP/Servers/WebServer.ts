import { BaseServer } from './BaseServer';
import { IWebServerConfig } from '@/../../types/MCP/server';

export class WebServer extends BaseServer<IWebServerConfig> {
  constructor() {
    super({
      port: 3000,
      host: "localhost",
      apiKey: ""
    });
  }

  validateConfig(config: IWebServerConfig): boolean {
    return !!config.port && !!config.host && config.port > 0 && config.port < 65536;
  }

  getServiceType(): string {
    return "webserver";
  }

  getSuccessMessage(): string {
    return "Web server service enabled successfully";
  }

  getErrorMessage(error: string): string {
    return `Web server service error: ${error}`;
  }

  getInitializeConfig(): any {
    return {
      enabled: this.enabled,
      command: "npx",
      args: [
        "-y",
        "mcp-server-web@latest",
        "--port", this.config.port.toString(),
        "--host", this.config.host
      ],
      env: this.config.apiKey ? {
        "WEB_SERVER_API_KEY": this.config.apiKey
      } : undefined,
      clientName: "webserver-client",
      clientVersion: "1.0.0"
    };
  }
}

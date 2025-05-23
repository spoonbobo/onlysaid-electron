import { BaseServer } from './BaseServer';
import { ILocationConfig } from '@/../../types/MCP/server';

export class LocationServer extends BaseServer<ILocationConfig> {
  constructor() {
    super({
      path: ""
    });
  }

  validateConfig(config: ILocationConfig): boolean {
    return !!config.path;
  }

  getServiceType(): string {
    return "location";
  }

  getSuccessMessage(): string {
    return "Location service enabled successfully";
  }

  getErrorMessage(error: string): string {
    return `Location service error: ${error}`;
  }

  getInitializeConfig(): any {
    return {
      enabled: this.enabled,
      command: `${window.electron.homedir()}/.local/bin/uv`,
      args: [
        "--directory",
        this.config.path,
        "run",
        "osm-mcp-server"
      ],
      clientName: "onlysaid-location-client",
      clientVersion: "1.0.0"
    };
  }
}

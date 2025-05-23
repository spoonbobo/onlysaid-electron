import { BaseServer } from './BaseServer';
import { IGitHubConfig } from '@/../../types/MCP/server';

export class GitHubServer extends BaseServer<IGitHubConfig> {
  constructor() {
    super({
      accessToken: ""
    });
  }

  validateConfig(config: IGitHubConfig): boolean {
    return !!config.accessToken;
  }

  getServiceType(): string {
    return "github";
  }

  getSuccessMessage(): string {
    return "GitHub service enabled successfully";
  }

  getErrorMessage(error: string): string {
    return `GitHub service error: ${error}`;
  }

  getInitializeConfig(): any {
    return {
      enabled: this.enabled,
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
        "GITHUB_PERSONAL_ACCESS_TOKEN": this.config.accessToken
      },
      clientName: "github-client",
      clientVersion: "1.2.0"
    };
  }
}

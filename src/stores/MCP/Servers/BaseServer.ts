import { toast } from "@/utils/toast";
import { IMCPServerResult, IServerModule } from "@/../../types/MCP/server";

export abstract class BaseServer<TConfig> implements IServerModule<TConfig> {
  public enabled: boolean = false;
  public config: TConfig;

  constructor(defaultConfig: TConfig) {
    this.config = defaultConfig;
  }

  abstract validateConfig(config: TConfig): boolean;
  abstract getInitializeConfig(): any;
  abstract getServiceType(): string;
  abstract getSuccessMessage(): string;
  abstract getErrorMessage(error: string): string;

  async setEnabled(enabled: boolean): Promise<void> {
    if (enabled && !this.isConfigured()) {
      return;
    }

    this.enabled = enabled;

    if (enabled) {
      const result = await this.initializeClient();
      if (!result.success) {
        toast.error(this.getErrorMessage(result.error || 'Unknown error'));
        this.enabled = false;
      } else {
        toast.success(this.getSuccessMessage());
      }
    }
  }

  setConfig(config: Partial<TConfig>): void {
    this.config = { ...this.config, ...config };
  }

  isConfigured(): boolean {
    return this.validateConfig(this.config);
  }

  private async initializeClient(): Promise<IMCPServerResult> {
    try {
      const config = this.getInitializeConfig();

      const result = await window.electron.mcp.initialize_client({
        serverName: this.getServiceType(),
        config
      });

      return result;
    } catch (error: any) {
      console.error(`Error initializing ${this.getServiceType()} client:`, error);
      return { success: false, error: error.message || "Unknown error" };
    }
  }
}
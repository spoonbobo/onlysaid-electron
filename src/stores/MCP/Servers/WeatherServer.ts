import { BaseServer } from './BaseServer';
import { IWeatherConfig } from '@/../../types/MCP/server';

export class WeatherServer extends BaseServer<IWeatherConfig> {
  constructor() {
    super({
      apiKey: "",
      endpoint: "",
      units: "metric"
    });
  }

  validateConfig(config: IWeatherConfig): boolean {
    return !!config.apiKey && !!config.endpoint && !!config.units;
  }

  getServiceType(): string {
    return "weather";
  }

  getSuccessMessage(): string {
    return "Weather service enabled successfully";
  }

  getErrorMessage(error: string): string {
    return `Weather service error: ${error}`;
  }

  getInitializeConfig(): any {
    return {
      enabled: this.enabled,
      command: "node",
      args: [
        this.config.endpoint,
        "--api-key", this.config.apiKey,
        "--units", this.config.units
      ],
      clientName: "onlysaid-weather-client",
      clientVersion: "1.0.0"
    };
  }
}

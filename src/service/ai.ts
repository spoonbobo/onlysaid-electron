import { useLLMConfigurationStore } from "../stores/LLM/LLMConfiguration";
import { DeepSeekAPIService } from "./deepseek";
import { OllamaAPIService } from "./ollama";

export interface LLMModel {
  id: string;
  name: string;
  provider: "openai" | "deepseek" | "ollama";
  enabled: boolean;
}

export interface LLMConfiguration {
  temperature: number;
  openAIKey: string;
  deepSeekKey: string;
  openAIEnabled: boolean;
  deepSeekEnabled: boolean;
  ollamaBaseURL: string;
  ollamaModel: string;
  ollamaEnabled: boolean;
}

export interface LLMInstance {
  id: string;
  name: string;
  provider: "openai" | "deepseek" | "ollama";
  service: any;
}

export class LLMService {
  private readonly deepSeekService: DeepSeekAPIService;
  private readonly ollamaService: OllamaAPIService;

  constructor() {
    this.deepSeekService = new DeepSeekAPIService("https://api.deepseek.com");
    this.ollamaService = new OllamaAPIService("http://localhost:11434");
  }

  async GetEnabledLLM(): Promise<LLMModel[]> {
    const config = useLLMConfigurationStore.getState();
    const enabledModels: LLMModel[] = [];

    if (config.openAIEnabled && config.openAIKey) {
      enabledModels.push({
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "openai",
        enabled: true
      });
      enabledModels.push({
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
        enabled: true
      });
    }

    if (config.deepSeekEnabled && config.deepSeekKey) {
      enabledModels.push({
        id: "deepseek-chat",
        name: "DeepSeek Chat",
        provider: "deepseek",
        enabled: true
      });

      enabledModels.push({
        id: "deepseek-r1",
        name: "DeepSeek R1",
        provider: "deepseek",
        enabled: true
      });
    }

    if (config.ollamaVerified && config.ollamaBaseURL) {
      if (config.ollamaModel) {
        enabledModels.push({
          id: config.ollamaModel,
          name: config.ollamaModel,
          provider: "ollama",
          enabled: true
        });
      } else {
        console.log("Fetching Ollama models");
        try {
          const ollamaModels = await this.ollamaService.GetLLMModels();
          ollamaModels.forEach(model => {
            enabledModels.push({
              id: model.name,
              name: model.name,
              provider: "ollama",
              enabled: true
            });
          });

          if (ollamaModels.length > 0 && !config.ollamaModel) {
            const store = useLLMConfigurationStore.getState();
            store.setOllamaModel(ollamaModels[0].name);
          }
        } catch (error) {
          console.error("Error fetching Ollama models:", error);
        }
      }
    }

    return enabledModels;
  }


  async TestOllamaConnection(): Promise<{ success: boolean; models: any[] }> {
    try {
      const isAuthenticated = await this.ollamaService.Authenticate();
      if (!isAuthenticated) {
        return { success: false, models: [] };
      }

      const models = await this.ollamaService.GetLLMModels();

      const store = useLLMConfigurationStore.getState();
      store.setOllamaVerified(true);

      if (models.length > 0 && !store.ollamaModel) {
        store.setOllamaModel(models[0].name);
      }

      return {
        success: true,
        models
      };
    } catch (error) {
      console.error("Error testing Ollama connection:", error);
      return { success: false, models: [] };
    }
  }

  async GetLLMConfiguration(): Promise<LLMConfiguration> {
    return useLLMConfigurationStore.getState();
  }

  async UpdateConfiguration(config: Partial<LLMConfiguration>): Promise<void> {
    const store = useLLMConfigurationStore.getState();

    if (config.temperature !== undefined) {
      store.setTemperature(config.temperature);
    }

    if (config.openAIKey !== undefined) {
      store.setOpenAIKey(config.openAIKey);
    }

    if (config.deepSeekKey !== undefined) {
      store.setDeepSeekKey(config.deepSeekKey);
    }

    if (config.openAIEnabled !== undefined) {
      store.setOpenAIEnabled(config.openAIEnabled);
    }

    if (config.deepSeekEnabled !== undefined) {
      store.setDeepSeekEnabled(config.deepSeekEnabled);
    }

    if (config.ollamaBaseURL !== undefined) {
      store.setOllamaBaseURL(config.ollamaBaseURL);
    }

    if (config.ollamaModel !== undefined) {
      store.setOllamaModel(config.ollamaModel);
    }

    if (config.ollamaEnabled !== undefined) {
      store.setOllamaEnabled(config.ollamaEnabled);
    }
  }

  async VerifyLLM(provider: "openai" | "deepseek" | "ollama", apiKey: string = ""): Promise<boolean> {
    try {
      const store = useLLMConfigurationStore.getState();
      let isVerified = false;

      switch (provider) {
        case "openai":
          isVerified = false;
          store.setOpenAIVerified(isVerified);
          break;
        case "deepseek":
          isVerified = await this.deepSeekService.Authenticate(apiKey);
          store.setDeepSeekVerified(isVerified);
          break;
        case "ollama":
          const { success, models } = await this.TestOllamaConnection();
          isVerified = success;
          store.setOllamaVerified(isVerified);

          if (success && models.length > 0 && !store.ollamaModel) {
            store.setOllamaModel(models[0].name);
          }
          break;
        default:
          isVerified = false;
      }

      return isVerified;
    } catch (error) {
      console.error(`Error verifying ${provider} API key:`, error);

      const store = useLLMConfigurationStore.getState();
      if (provider === "openai") store.setOpenAIVerified(false);
      if (provider === "deepseek") store.setDeepSeekVerified(false);
      if (provider === "ollama") store.setOllamaVerified(false);

      return false;
    }
  }
}

export interface EmbeddingModel {
  id: string;
  name: string;
  provider: "ollama";
}

export class EmbeddingService {
  private readonly ollamaService: OllamaAPIService;

  constructor(baseURL: string = "http://localhost:11434") {
    this.ollamaService = new OllamaAPIService(baseURL);
  }

  async GetEmbeddingModels(): Promise<EmbeddingModel[]> {
    try {
      const models = await this.ollamaService.GetEmbeddingModels();
      return models.map(model => ({
        id: model.name,
        name: model.name,
        provider: "ollama" as const
      }));
    } catch (error) {
      console.error("Error fetching embedding models:", error);
      return [];
    }
  }

  async TestConnection(): Promise<boolean> {
    try {
      return await this.ollamaService.Authenticate();
    } catch (error) {
      console.error("Error testing embedding service connection:", error);
      return false;
    }
  }
}
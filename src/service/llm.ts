import { useLLMConfigurationStore } from "../stores/LLM/LLMConfiguration";
import { OpenAIService } from "./openai";
import OpenAI from "openai";
import { DeepSeekAPIService } from "./deepseek";

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

  constructor() {
    this.deepSeekService = new DeepSeekAPIService("https://api.deepseek.com");
  }

  async GetEnabledLLM(): Promise<LLMModel[]> {
    const config = useLLMConfigurationStore.getState();
    const enabledModels: LLMModel[] = [];

    // For OpenAI, consider it available if enabled and has a key
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

    // For DeepSeek, consider it available if enabled and has a key
    // Use the same logic as in your settings component
    if (config.deepSeekEnabled && config.deepSeekKey) {
      enabledModels.push({
        id: "deepseek-chat",
        name: "DeepSeek Chat",
        provider: "deepseek",
        enabled: true
      });
    }

    // For Ollama, consider it available if enabled and has baseURL and model name
    if (config.ollamaEnabled && config.ollamaBaseURL && config.ollamaModel) {
      enabledModels.push({
        id: config.ollamaModel,
        name: config.ollamaModel,
        provider: "ollama",
        enabled: true
      });
    }

    return enabledModels;
  }

  async GetLLM(provider: string = "openai", modelName?: string): Promise<LLMInstance | null> {
    const config = useLLMConfigurationStore.getState();

    // Handle OpenAI provider
    if (provider === "openai" && config.openAIEnabled && config.openAIKey) {
      // Initialize OpenAI client with the API key from the store
      const openai = new OpenAI({
        apiKey: config.openAIKey,
        dangerouslyAllowBrowser: true,
      });

      const openaiModels = ["gpt-4o", "gpt-3.5-turbo"];
      const selectedModel = modelName || "gpt-4o";

      // If model is specified, check if it's supported
      if (modelName && !openaiModels.includes(modelName)) {
        return null;
      }

      // Create an OpenAI instance
      return {
        id: "openai",
        name: "OpenAI",
        provider: "openai",
        service: {
          ...OpenAIService,
          client: openai,
          models: openaiModels,
          streamChatCompletion: (messages: any, options: any) =>
            OpenAIService.streamChatCompletion(messages, {
              ...options,
              model: options.model || selectedModel,
              temperature: options.temperature !== undefined ? options.temperature : config.temperature
            }),
          chatCompletion: (messages: any, options: any) =>
            OpenAIService.chatCompletion(messages, {
              ...options,
              model: options.model || selectedModel,
              temperature: options.temperature !== undefined ? options.temperature : config.temperature
            })
        }
      };
    }

    return null;
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

  async VerifyLLM(provider: "openai" | "deepseek" | "ollama", apiKey: string): Promise<boolean> {
    try {
      switch (provider) {
        case "openai":
          // Dummy implementation for OpenAI verification
          return false;
        case "deepseek":
          return this.deepSeekService.Authenticate(apiKey);
        case "ollama":
          // Placeholder for Ollama verification
          return false;
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error verifying ${provider} API key:`, error);
      return false;
    }
  }
}
import React from "react";
import { IEnhancedServerModule, ITavilyConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const TavilyServerModule: IEnhancedServerModule<ITavilyConfig> = {
  metadata: {
    id: "tavily",
    title: "Tavily Web Search MCP Server",
    description: "MCP server for Tavily AI-powered web search integration.",
    version: "unknown",
    icon: "Search",
    sourceUrl: "https://github.com/tavily-ai/tavily-mcp",
    platforms: ["windows", "macos", "linux"],
    category: "research"
  },

  defaultConfig: {
    apiKey: ""
  },

  isConfigured: (config: ITavilyConfig) => {
    return !!config.apiKey;
  },

  createClientConfig: (config: ITavilyConfig, homedir: string) => ({
    enabled: true,
    command: "npx",
    args: ["-y", "tavily-mcp"],
    env: {
      TAVILY_API_KEY: config.apiKey
    },
    clientName: "tavily-mcp",
    clientVersion: "1.0.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "apiKey",
      label: "Tavily API Key",
      type: "password",
      required: true,
      description: "The API key for the Tavily web search service",
      descriptionLink: {
        text: "Get API Key",
        url: "https://tavily.com/"
      }
    }
  ],

  validateConfig: (config: ITavilyConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.apiKey) {
      errors.apiKey = "Tavily API Key is required";
      isValid = false;
    }

    return { isValid, errors };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<ITavilyConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ apiKey: "" }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("tavily", TavilyServerModule);

import React from "react";
import { IEnhancedServerModule, ILaraConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const LaraServerModule: IEnhancedServerModule<ILaraConfig> = {
  metadata: {
    id: "lara",
    title: "Lara Translation MCP Server",
    description: "MCP server for Lara AI-powered translation services.",
    version: "unknown",
    icon: "Translate",
    sourceUrl: "https://github.com/translated/lara-mcp",
    platforms: ["windows", "macos", "linux"],
    category: "productivity"
  },

  defaultConfig: {
    accessKeyId: "",
    accessKeySecret: ""
  },

  isConfigured: (config: ILaraConfig) => {
    return !!config.accessKeyId && !!config.accessKeySecret;
  },

  createClientConfig: (config: ILaraConfig, homedir: string) => ({
    enabled: true,
    command: "npx",
    args: ["-y", "@translated/lara-mcp@latest"],
    env: {
      LARA_ACCESS_KEY_ID: config.accessKeyId,
      LARA_ACCESS_KEY_SECRET: config.accessKeySecret
    },
    clientName: "lara-mcp",
    clientVersion: "1.0.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "accessKeyId",
      label: "Lara Access Key ID",
      type: "text",
      required: true,
      description: "The Access Key ID for the Lara translation service",
      descriptionLink: {
        text: "Get API Keys",
        url: "https://www.translated.com/lara"
      }
    },
    {
      key: "accessKeySecret",
      label: "Lara Access Key Secret",
      type: "password",
      required: true,
      description: "The Access Key Secret for the Lara translation service"
    }
  ],

  validateConfig: (config: ILaraConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.accessKeyId) {
      errors.accessKeyId = "Lara Access Key ID is required";
      isValid = false;
    }

    if (!config.accessKeySecret) {
      errors.accessKeySecret = "Lara Access Key Secret is required";
      isValid = false;
    }

    return { isValid, errors };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<ILaraConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ accessKeyId: "", accessKeySecret: "" }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("lara", LaraServerModule);

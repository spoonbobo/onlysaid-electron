import React from "react";
import { IEnhancedServerModule, IN8nConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const N8nServerModule: IEnhancedServerModule<IN8nConfig> = {
  metadata: {
    id: "n8n",
    title: "N8n Workflow Automation MCP Server",
    description: "MCP server for interacting with n8n workflow automation platform. Provides tools for managing workflows, executions, and webhook integrations.",
    version: "0.1.4",
    icon: "AccountTree",
    sourceUrl: "https://github.com/leonardsellem/n8n-mcp-server",
    platforms: ["windows", "macos", "linux"],
    category: "productivity"
  },

  defaultConfig: {
    apiUrl: "",
    apiKey: "",
    webhookUsername: "",
    webhookPassword: ""
  },

  isConfigured: (config: IN8nConfig) => {
    return !!(config.apiUrl && config.apiKey);
  },

  createClientConfig: (config: IN8nConfig, homedir: string) => {
    const env: Record<string, string> = {
      N8N_API_URL: config.apiUrl,
      N8N_API_KEY: config.apiKey
    };

    // Add webhook credentials if provided
    if (config.webhookUsername) {
      env.N8N_WEBHOOK_USERNAME = config.webhookUsername;
    }
    if (config.webhookPassword) {
      env.N8N_WEBHOOK_PASSWORD = config.webhookPassword;
    }

    return {
      enabled: true,
      command: "npx",
      args: ["-y", "@leonardsellem/n8n-mcp-server@0.1.4"],
      env,
      clientName: "n8n-mcp",
      clientVersion: "0.1.4"
    };
  },

  getDialogFields: (): Field[] => [
    {
      key: "apiUrl",
      label: "N8n API URL",
      type: "text",
      required: true,
      description: "The base URL of your n8n instance (e.g., http://localhost:5678/api/v1)",
      placeholder: "http://localhost:5678/api/v1"
    },
    {
      key: "apiKey",
      label: "N8n API Key",
      type: "password",
      required: true,
      description: "Your n8n API key for authentication",
      descriptionLink: {
        text: "How to get API Key",
        url: "https://docs.n8n.io/api/authentication/"
      }
    },
    {
      key: "webhookUsername",
      label: "Webhook Username (Optional)",
      type: "text",
      required: false,
      description: "Username for webhook authentication (if using webhook tools)"
    },
    {
      key: "webhookPassword",
      label: "Webhook Password (Optional)",
      type: "password",
      required: false,
      description: "Password for webhook authentication (if using webhook tools)"
    }
  ],

  validateConfig: (config: IN8nConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.apiUrl) {
      errors.apiUrl = "N8n API URL is required";
      isValid = false;
    } else if (!config.apiUrl.includes("/api/v1")) {
      errors.apiUrl = "API URL should include '/api/v1' (e.g., http://localhost:5678/api/v1)";
      isValid = false;
    }

    if (!config.apiKey) {
      errors.apiKey = "N8n API Key is required";
      isValid = false;
    }

    // Validate webhook credentials - both or neither should be provided
    if ((config.webhookUsername && !config.webhookPassword) || 
        (!config.webhookUsername && config.webhookPassword)) {
      errors.webhookUsername = "Both webhook username and password must be provided together";
      errors.webhookPassword = "Both webhook username and password must be provided together";
      isValid = false;
    }

    return { isValid, errors };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IN8nConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ apiUrl: "", apiKey: "", webhookUsername: "", webhookPassword: "" }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("n8n", N8nServerModule);

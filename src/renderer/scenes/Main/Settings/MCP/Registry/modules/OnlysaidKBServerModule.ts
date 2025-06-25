import React from "react";
import { IEnhancedServerModule, IOnlysaidKBConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const OnlysaidKBServerModule: IEnhancedServerModule<IOnlysaidKBConfig> = {
  metadata: {
    id: "onlysaidkb",
    title: "OnlysaidKB MCP Server",
    description: "MCP server for OnlysaidKB (Knowledge Base) integration. Query and retrieve information from knowledge bases using natural language.",
    version: "1.0.0",
    icon: "Storage",
    sourceUrl: "https://github.com/spoonbobo/onlysaidkb-mcp-server",
    platforms: ["windows", "macos", "linux"],
    category: "research"
  },

  defaultConfig: {
    baseUrl: "http://onlysaid-dev.com/api/kb",
    timeout: 30,
    path: ""
  },

  isConfigured: (config: IOnlysaidKBConfig) => {
    return !!(config.baseUrl && config.path);
  },

  createClientConfig: (config: IOnlysaidKBConfig, homedir: string) => ({
    enabled: true,
    command: "uv",
    args: [
      "--directory",
      config.path,
      "run",
      "src/onlysaidkb_mcp/main.py"
    ],
    env: {
      ONLYSAIDKB_BASE_URL: config.baseUrl,
      ONLYSAIDKB_TIMEOUT: config.timeout?.toString() || "30"
    },
    clientName: "onlysaidkb-mcp",
    clientVersion: "1.0.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "path",
      label: "OnlysaidKB MCP Server Path",
      type: "text",
      required: true,
      description: "Full path to the OnlysaidKB MCP server directory",
      placeholder: "/path/to/onlysaidkb-mcp-server"
    },
    {
      key: "baseUrl",
      label: "OnlysaidKB Base URL",
      type: "text",
      required: true,
      description: "The base URL of your OnlysaidKB API (e.g., http://onlysaid-dev.com/api/kb)",
      placeholder: "http://onlysaid-dev.com/api/kb"
    },
    {
      key: "timeout",
      label: "Request Timeout (seconds)",
      type: "number",
      required: false,
      description: "Request timeout in seconds (default: 30)",
      placeholder: "30"
    }
  ],

  validateConfig: (config: IOnlysaidKBConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.path) {
      errors.path = "OnlysaidKB MCP Server path is required";
      isValid = false;
    }

    if (!config.baseUrl) {
      errors.baseUrl = "OnlysaidKB Base URL is required";
      isValid = false;
    } else {
      // Basic URL validation
      try {
        new URL(config.baseUrl);
      } catch {
        errors.baseUrl = "Please enter a valid URL";
        isValid = false;
      }
    }

    if (config.timeout && (config.timeout < 1 || config.timeout > 300)) {
      errors.timeout = "Timeout must be between 1 and 300 seconds";
      isValid = false;
    }

    return { isValid, errors };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IOnlysaidKBConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ 
    baseUrl: "http://onlysaid-dev.com/api/kb", 
    timeout: 30,
    path: ""
  }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("onlysaidkb", OnlysaidKBServerModule);

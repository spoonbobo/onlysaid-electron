import React from "react";
import { IEnhancedServerModule, IGoogleGmailConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const GoogleGmailServerModule: IEnhancedServerModule<IGoogleGmailConfig> = {
  metadata: {
    id: "googleGmail",
    title: "Gmail AutoAuth MCP Server",
    description: "MCP server for Gmail integration with automatic authentication support. No configuration required - just enable and start using!",
    version: "unknown",
    icon: "Mail",
    sourceUrl: "https://github.com/GongRzhe/Gmail-MCP-Server",
    platforms: ["windows", "macos", "linux"],
    category: "communication"
  },

  defaultConfig: {
    // No configuration required
  },

  isConfigured: (config: IGoogleGmailConfig) => {
    // Always configured since no setup is required
    return true;
  },

  createClientConfig: (config: IGoogleGmailConfig, homedir: string) => ({
    enabled: true,
    command: "npx",
    args: ["@gongrzhe/server-gmail-autoauth-mcp"],
    env: {
      // No environment variables needed
    },
    clientName: "gmail-autoauth-mcp",
    clientVersion: "unknown"
  }),

  // No dialog fields needed since no configuration is required
  getDialogFields: (): Field[] => [],

  validateConfig: (config: IGoogleGmailConfig) => {
    // Always valid since no configuration is required
    return { isValid: true };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IGoogleGmailConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({}),
  getConfigured: () => true,
  getAutoApproved: () => false
};

serverRegistry.register("googleGmail", GoogleGmailServerModule);

import React from "react";
import { IEnhancedServerModule, IMS365Config } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const MS365ServerModule: IEnhancedServerModule<IMS365Config> = {
  metadata: {
    id: "ms365",
    title: "Microsoft 365 MCP Server",
    description: "MCP server for interacting with Microsoft 365 services (Outlook, OneDrive, Excel, etc.).",
    version: "0.4.4",
    icon: "BusinessCenter",
    sourceUrl: "https://github.com/softeria/ms-365-mcp-server",
    platforms: ["windows", "macos", "linux"],
    category: "productivity"
  },

  defaultConfig: {
    readOnly: false
  },

  isConfigured: (config: IMS365Config) => {
    return true;
  },

  createClientConfig: (config: IMS365Config, homedir: string) => {
    const envVars: Record<string, string> = {};
    if (config.readOnly) {
      envVars["READ_ONLY"] = "true";
    }
    return {
      enabled: true,
      command: "npx",
      args: ["-y", "@softeria/ms-365-mcp-server"],
      env: envVars,
      clientName: "ms-365-mcp",
      clientVersion: "1.0.0"
    };
  },

  getDialogFields: (): Field[] => [
    {
      key: "readOnly",
      label: "Read-Only Mode",
      type: "select",
      options: ["Disabled", "Enabled"],
      required: false,
      description: "Enable read-only mode to disable write operations. Authentication is handled by the server's 'login' tool after enabling.",
      descriptionLink: {
        text: "See login tutorial example",
        url: "https://github.com/softeria/ms-365-mcp-server?tab=readme-ov-file#quick-start-example"
      }
    }
  ],

  validateConfig: (config: IMS365Config) => {
    return { isValid: true, errors: {} };
  },

  setEnabled: async (enabled: boolean) => { console.warn("MS365ServerModule.setEnabled called, should be handled by MCPStore"); },
  setConfig: (config: Partial<IMS365Config>) => { console.warn("MS365ServerModule.setConfig called, should be handled by MCPStore"); },
  setAutoApproved: (autoApproved: boolean) => { console.warn("MS365ServerModule.setAutoApproved called, should be handled by MCPStore"); },
  getEnabled: () => { console.warn("MS365ServerModule.getEnabled called, should be handled by MCPStore"); return false; },
  getConfig: () => { console.warn("MS365ServerModule.getConfig called, should be handled by MCPStore"); return { readOnly: false }; },
  getConfigured: () => { console.warn("MS365ServerModule.getConfigured called, should be handled by MCPStore"); return true; },
  getAutoApproved: () => { console.warn("MS365ServerModule.getAutoApproved called, should be handled by MCPStore"); return false; }
};

serverRegistry.register("ms365", MS365ServerModule);

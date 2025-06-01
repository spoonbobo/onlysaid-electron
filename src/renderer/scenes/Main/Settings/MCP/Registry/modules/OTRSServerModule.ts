import React from "react";
import { IEnhancedServerModule } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";
import type { IOTRSConfig } from "@/renderer/stores/MCP/Servers/OTRSServer";

export const OTRSServerModule: IEnhancedServerModule<IOTRSConfig> = {
  metadata: {
    id: "otrs",
    title: "OTRS MCP Server",
    description: "MCP server for OTRS (Open Ticket Request System) API integration. Provides access to ticket management, configuration items, and other OTRS functionality.",
    version: "0.1.0",
    icon: "SupportAgent",
    sourceUrl: "https://github.com/spoonbobo/otrs-mcp-server",
    platforms: ["windows", "macos", "linux"],
    category: "productivity"
  },

  defaultConfig: {
    baseUrl: "",
    username: "",
    password: "",
    verifySSL: false,
    defaultQueue: "Raw",
    defaultState: "new",
    defaultPriority: "3 normal",
    defaultType: "Unclassified"
  },

  isConfigured: (config: IOTRSConfig) => {
    return !!(config.baseUrl && config.username && config.password);
  },

  createClientConfig: (config: IOTRSConfig, homedir: string) => ({
    enabled: true,
    command: "docker",
    args: [
      "run",
      "--rm",
      "-i",
      "-e",
      `OTRS_BASE_URL=${config.baseUrl}`,
      "-e",
      `OTRS_USERNAME=${config.username}`,
      "-e",
      `OTRS_PASSWORD=${config.password}`,
      "-e",
      `OTRS_VERIFY_SSL=${config.verifySSL}`,
      "-e",
      `OTRS_DEFAULT_QUEUE=${config.defaultQueue}`,
      "-e",
      `OTRS_DEFAULT_STATE=${config.defaultState}`,
      "-e",
      `OTRS_DEFAULT_PRIORITY=${config.defaultPriority}`,
      "-e",
      `OTRS_DEFAULT_TYPE=${config.defaultType}`,
      "ghcr.io/spoonbobo/otrs-mcp-server:latest"
    ],
    clientName: "otrs-mcp",
    clientVersion: "0.1.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "baseUrl",
      label: "OTRS Base URL",
      type: "text",
      required: true,
      description: "The base URL for your OTRS webservice endpoint",
      placeholder: "https://your-otrs-server/otrs/nph-genericinterface.pl/Webservice/YourWebserviceName"
    },
    {
      key: "username",
      label: "OTRS Username",
      type: "text",
      required: true,
      description: "Your OTRS username for authentication"
    },
    {
      key: "password",
      label: "OTRS Password",
      type: "password",
      required: true,
      description: "Your OTRS password for authentication"
    },
    {
      key: "verifySSL",
      label: "Verify SSL Certificate",
      type: "select",
      required: false,
      options: ["true", "false"],
      description: "Enable SSL certificate verification (disable for self-signed certificates)"
    },
    {
      key: "defaultQueue",
      label: "Default Queue",
      type: "text",
      required: false,
      description: "Default queue for new tickets",
      placeholder: "Raw"
    },
    {
      key: "defaultState",
      label: "Default State",
      type: "text",
      required: false,
      description: "Default state for new tickets",
      placeholder: "new"
    },
    {
      key: "defaultPriority",
      label: "Default Priority",
      type: "text",
      required: false,
      description: "Default priority for new tickets",
      placeholder: "3 normal"
    },
    {
      key: "defaultType",
      label: "Default Type",
      type: "text",
      required: false,
      description: "Default type for new tickets",
      placeholder: "Unclassified"
    }
  ],

  validateConfig: (config: IOTRSConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.baseUrl) {
      errors.baseUrl = "OTRS Base URL is required";
      isValid = false;
    } else if (!config.baseUrl.startsWith("http")) {
      errors.baseUrl = "Base URL must start with http:// or https://";
      isValid = false;
    }

    if (!config.username) {
      errors.username = "OTRS Username is required";
      isValid = false;
    }

    if (!config.password) {
      errors.password = "OTRS Password is required";
      isValid = false;
    }

    return { isValid, errors };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IOTRSConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({
    baseUrl: "",
    username: "",
    password: "",
    verifySSL: false,
    defaultQueue: "Raw",
    defaultState: "new",
    defaultPriority: "3 normal",
    defaultType: "Unclassified"
  }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("otrs", OTRSServerModule);

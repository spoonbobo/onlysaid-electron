import React from "react";
import { IEnhancedServerModule } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";
import type { IMoodleConfig } from "@/renderer/stores/MCP/Servers/MoodleMCPServer";

export const MoodleServerModule: IEnhancedServerModule<IMoodleConfig> = {
  metadata: {
    id: "moodle",
    title: "Moodle MCP Server",
    description: "MCP server for Moodle platform integration to manage courses, students, assignments, and quizzes.",
    version: "0.1.0",
    icon: "School",
    sourceUrl: "https://github.com/spoonbobo/moodle-mcp-server",
    platforms: ["windows", "macos", "linux"],
    category: "learning"
  },

  defaultConfig: {
    path: "",
    baseUrl: "",
    token: "",
    verifySSL: false
  },

  isConfigured: (config: IMoodleConfig) => {
    return !!(config.path && config.baseUrl && config.token);
  },

  createClientConfig: (config: IMoodleConfig, homedir: string) => ({
    enabled: true,
    command: "uv",
    args: [
      "--directory", 
      config.path,
      "run",
      "src/moodle_mcp/main.py"
    ],
    env: {
      MOODLE_BASE_URL: config.baseUrl,
      MOODLE_TOKEN: config.token,
      MOODLE_VERIFY_SSL: config.verifySSL.toString()
    },
    clientName: "moodle-mcp-server",
    clientVersion: "0.1.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "path",
      label: "Server Path",
      type: "text",
      required: true,
      description: "Local path to the Moodle MCP server directory",
      placeholder: "/path/to/moodle-mcp-server"
    },
    {
      key: "baseUrl",
      label: "Moodle Base URL",
      type: "text",
      required: true,
      description: "The base URL of your Moodle instance",
      placeholder: "http://localhost:8080"
    },
    {
      key: "token",
      label: "Moodle Token",
      type: "password",
      required: true,
      description: "The API token for accessing Moodle web services",
      descriptionLink: {
        text: "How to get API Token",
        url: "https://docs.moodle.org/en/Using_web_services#How_to_get_a_user_token"
      }
    },
    {
      key: "verifySSL",
      label: "Verify SSL Certificate",
      type: "select",
      required: false,
      options: ["false", "true"],
      description: "Enable SSL certificate verification (disable for self-signed certificates)"
    }
  ],

  validateConfig: (config: IMoodleConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.path) {
      errors.path = "Server Path is required";
      isValid = false;
    }

    if (!config.baseUrl) {
      errors.baseUrl = "Moodle Base URL is required";
      isValid = false;
    }

    if (!config.token) {
      errors.token = "Moodle Token is required";
      isValid = false;
    }

    return { isValid, errors };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IMoodleConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ path: "", baseUrl: "", token: "", verifySSL: false }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("moodle", MoodleServerModule);

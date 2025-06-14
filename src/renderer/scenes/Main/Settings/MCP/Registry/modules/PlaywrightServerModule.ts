import React from "react";
import { IEnhancedServerModule, IPlaywrightConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const PlaywrightServerModule: IEnhancedServerModule<IPlaywrightConfig> = {
  metadata: {
    id: "playwright",
    title: "Playwright Browser Automation MCP Server",
    description: "Microsoft's Playwright MCP server for browser automation, web scraping, testing, and screenshot capture.",
    version: "0.0.29",
    icon: "WebAsset",
    sourceUrl: "https://github.com/microsoft/playwright-mcp",
    platforms: ["windows", "macos", "linux"],
    category: "development"
  },

  defaultConfig: {},

  isConfigured: (config: IPlaywrightConfig) => {
    // Playwright doesn't require any configuration
    return true;
  },

  createClientConfig: (config: IPlaywrightConfig, homedir: string) => ({
    enabled: true,
    command: "npx",
    args: ["-y", "@playwright/mcp"],
    clientName: "playwright-mcp",
    clientVersion: "0.0.29"
  }),

  getDialogFields: (): Field[] => [
    // No configuration fields needed for Playwright
  ],

  validateConfig: (config: IPlaywrightConfig) => {
    return { isValid: true };
  },

  // Store integration methods
  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IPlaywrightConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({}),
  getConfigured: () => true,
  getAutoApproved: () => false
};

serverRegistry.register("playwright", PlaywrightServerModule);

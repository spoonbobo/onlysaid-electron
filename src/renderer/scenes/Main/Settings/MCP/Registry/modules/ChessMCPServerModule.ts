import React from "react";
import { IEnhancedServerModule } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";
import type { IChessConfig } from "@/renderer/stores/MCP/Servers/ChessMCPServer";

export const ChessMCPServerModule: IEnhancedServerModule<IChessConfig> = {
  metadata: {
    id: "chess",
    title: "Chess MCP Server",
    description: "MCP server for chess game functionality and analysis.",
    version: "unknown",
    icon: "Games",
    sourceUrl: "https://github.com/pab1it0/chess-mcp",
    platforms: ["windows", "macos", "linux"],
    category: "other"
  },

  defaultConfig: {},

  isConfigured: (config: IChessConfig) => {
    // Chess server doesn't require configuration, always considered configured
    return true;
  },

  createClientConfig: (config: IChessConfig, homedir: string) => ({
    enabled: true,
    command: "docker",
    args: [
      "run",
      "--rm",
      "-i",
      "pab1it0/chess-mcp"
    ],
    clientName: "chess-mcp",
    clientVersion: "unknown"
  }),

  getDialogFields: (): Field[] => [
    // No configuration fields needed for chess server
  ],

  validateConfig: (config: IChessConfig) => {
    // Chess server doesn't require validation since no config is needed
    return { isValid: true };
  },

  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IChessConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({}),
  getConfigured: () => true, // Always configured since no config needed
  getAutoApproved: () => false
};

serverRegistry.register("chess", ChessMCPServerModule);

// src/stores/MCP/MCPClientStore.ts
import { create } from "zustand";

interface MCPClientState {
  // Actions only
  getMCPPrompts: () => Promise<void>;
  ListMCPTool: (serverName: string) => Promise<any>;
  executeTool: (serverName: string, toolName: string, args: Record<string, any>) => Promise<any>;
}

export const useMCPClientStore = create<MCPClientState>()((set, get) => ({
  // Action placeholders
  getMCPPrompts: async () => {
    console.log("getMCPPrompts action called");
  },

  ListMCPTool: async (serverName: string) => {
    try {
      // Pass an empty object instead of nothing
      const result = await window.electron.mcp.list_tools({ serverName });
      console.log("ListMCPTool returned:", result);
      return result;
    } catch (error) {
      console.error("Error in ListMCPTool:", error);
      throw error;
    }
  },

  executeTool: async (serverName: string, toolName: string, args: Record<string, any>) => {
    try {
      console.log("executeTool action called with:", { serverName, toolName, args });

      const result = await window.electron.mcp.execute_tool({
        serverName,
        toolName,
        arguments: args
      });

      console.log("executeTool returned:", result);
      return result;
    } catch (error) {
      console.error("Error in executeTool:", error);
      throw error;
    }
  },
}));
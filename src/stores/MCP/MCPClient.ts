// src/stores/MCP/MCPClientStore.ts
import { create } from "zustand";

interface MCPClientState {
  // Actions only
  getMCPPrompts: () => Promise<void>;
  ListMCPTool: (serverName: string) => Promise<any>;


  createPlan: (prompt: string) => Promise<void>;
  executeTool: (toolName: string, params: any) => Promise<void>;
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

  createPlan: async (prompt: string) => {
    console.log("createPlan action called with prompt:", prompt);
  },

  executeTool: async (toolName: string, params: any) => {
    console.log("executeTool action called with toolName:", toolName, "params:", params);
  },


}));
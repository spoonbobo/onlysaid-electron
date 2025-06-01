// src/stores/MCP/MCPClientStore.ts
import { create } from "zustand";
import { SERVICE_TYPE_MAPPING } from "@/utils/mcp";

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
      // Map server key to service type for client lookup
      const serviceType = SERVICE_TYPE_MAPPING[serverName] || serverName;
      const result = await window.electron.mcp.list_tools({ serverName: serviceType });
      console.log("ListMCPTool returned:", result);
      return result;
    } catch (error) {
      console.error("Error in ListMCPTool:", error);
      throw error;
    }
  },

  executeTool: async (serverName: string, toolName: string, args: Record<string, any>) => {
    try {
      // Map server key to service type for client lookup
      const serviceType = SERVICE_TYPE_MAPPING[serverName] || serverName;

      console.log("executeTool action called with:", {
        originalServerName: serverName,
        mappedServiceType: serviceType,
        toolName,
        args
      });

      const result = await window.electron.mcp.execute_tool({
        serverName: serviceType, // Use the mapped service type
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
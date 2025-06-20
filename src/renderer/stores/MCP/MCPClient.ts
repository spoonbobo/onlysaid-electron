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

      console.log("🔧 MCP executeTool called with:", {
        originalServerName: serverName,
        mappedServiceType: serviceType,
        toolName,
        args,
        hasMappingForServer: serverName in SERVICE_TYPE_MAPPING
      });

      const result = await window.electron.mcp.execute_tool({
        serverName: serviceType, // Use the mapped service type
        toolName,
        arguments: args
      });

      console.log("🔧 MCP executeTool result:", {
        success: result?.success,
        hasData: !!result?.data,
        dataType: typeof result?.data,
        error: result?.error,
        fullResult: result
      });
      
      return result;
    } catch (error: any) {
      console.error("🔧 Error in MCP executeTool:", {
        message: error.message,
        stack: error.stack,
        serverName,
        toolName,
        args
      });
      throw error;
    }
  },
}));
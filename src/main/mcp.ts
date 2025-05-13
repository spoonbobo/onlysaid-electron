import { ipcMain } from 'electron';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { IMCPTool } from '@/../../types/MCP/tool';

const activeClients: Record<string, Client> = {};

export function setupMCPHandlers() {
  ipcMain.handle('mcp:initialize_client', async (event, { serverName, config }) => {
    try {
      if (activeClients[serverName]) {
        await activeClients[serverName].close();
        delete activeClients[serverName];
      }

      if (!config.enabled) {
        return { success: true, message: `MCP client for ${serverName} is disabled` };
      }

      const transport = new StdioClientTransport({
        command: config.command || "node",
        args: config.args || [],
        env: config.env || {}
      });

      const client = new Client({
        name: config.clientName || "onlysaid-client",
        version: config.clientVersion || "1.0.0",
        env: config.env || {}
      });

      await client.connect(transport);

      let tools: IMCPTool[] = [];
      try {
        const toolsResult = await client.listTools();
        tools = toolsResult.tools.map((tool) => {
          return {
            name: tool.name,
            description: tool.description || "",
            inputSchema: tool.inputSchema
          };
        });
        console.log(
          `Connected to ${serverName} server with tools:`,
          tools.map(({ name }) => name)
        );
      } catch (error) {
        console.warn(`Could not get tools from ${serverName} server:`, error);
      }

      activeClients[serverName] = client;

      return {
        success: true,
        message: `MCP client for ${serverName} initialized successfully`,
        tools: tools
      };
    } catch (error: any) {
      console.error(`Error initializing MCP client for ${serverName}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:list_tools', async (event, params = { serverName: 'default' }) => {
    try {
      const { serverName = 'default' } = params || {};

      const client = serverName === 'default'
        ? Object.values(activeClients)[0]
        : activeClients[serverName];

      if (!client) {
        return { success: false, error: `No active MCP client found` };
      }
      console.log("client", client);

      const tools = await client.listTools();
      console.log("tools", tools);

      return { success: true, data: tools };
    } catch (error: any) {
      console.error(`Error listing tools for MCP client:`, error);
      return { success: false, error: error.message };
    }
  });
}
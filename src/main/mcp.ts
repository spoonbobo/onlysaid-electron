import { ipcMain } from 'electron';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Store active MCP client instances
const activeClients: Record<string, Client> = {};

export function setupMCPHandlers() {
    // Handler to initialize MCP clients
    ipcMain.handle('mcp:initialize_client', async (event, { serverName, config }) => {
        try {
            // Close existing client if it exists
            if (activeClients[serverName]) {
                await activeClients[serverName].close();
                delete activeClients[serverName];
            }

            // Only initialize if enabled
            if (!config.enabled) {
                return { success: true, message: `MCP client for ${serverName} is disabled` };
            }

            // Create a new transport based on config
            const transport = new StdioClientTransport({
                command: config.command || "node",
                args: config.args || [],
                env: config.env || {}
            });

            // Create a new client
            const client = new Client({
                name: config.clientName || "onlysaid-client",
                version: config.clientVersion || "1.0.0",
                env: config.env || {}
            });

            // Connect to the transport
            await client.connect(transport);

            // Store the client
            activeClients[serverName] = client;

            return { success: true, message: `MCP client for ${serverName} initialized successfully` };
        } catch (error: any) {
            console.error(`Error initializing MCP client for ${serverName}:`, error);
            return { success: false, error: error.message };
        }
    });

}

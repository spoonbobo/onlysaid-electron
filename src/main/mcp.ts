import { ipcMain } from 'electron';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn, ChildProcess } from 'child_process';
import { IMCPTool } from '@/../../types/MCP/tool';
import path from 'path';

const activeClients: Record<string, Client> = {};
const activeProcesses: Record<string, ChildProcess> = {};

// Global spawn override for Windows
let originalSpawn: typeof spawn | null = null;
let isSpawnPatched = false;

function patchSpawnForWindows() {
  if (process.platform === 'win32' && !isSpawnPatched) {
    const childProcess = require('child_process');
    originalSpawn = childProcess.spawn;
    
    childProcess.spawn = function(command: string, args?: string[], options?: any) {
      // Handle different types of commands appropriately
      let enhancedOptions = { ...options };
      
      // Check if this is a cmd.exe shell command
      const isShellCommand = command === 'cmd.exe' || command === 'C:\\Windows\\system32\\cmd.exe' || 
                            (command.includes('cmd') && args?.includes('/c'));
      
      if (isShellCommand) {
        // For shell commands, we need to be more careful
        enhancedOptions = {
          ...options,
          stdio: options?.stdio || ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          shell: false, // Important: don't use shell for cmd.exe calls
          env: { ...process.env, ...options?.env },
          // Use a less aggressive approach for shell commands
          creationFlags: 0x08000000, // CREATE_NO_WINDOW
        };
        
        console.log(`[MCP] Spawning hidden shell command: ${command} ${args?.join(' ') || ''}`);
      } else {
        // For direct node processes, use full hiding options
        enhancedOptions = {
          ...options,
          stdio: options?.stdio || ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          detached: false,
          shell: false,
          windowsVerbatimArguments: false,
          env: { ...process.env, ...options?.env },
          creationFlags: 0x08000000, // CREATE_NO_WINDOW
        };
        
        console.log(`[MCP] Spawning hidden process: ${command} ${args?.join(' ') || ''}`);
      }
      
      return originalSpawn!(command, args, enhancedOptions);
    };
    
    isSpawnPatched = true;
    console.log('[MCP] Global spawn patched for Windows hidden processes');
  }
}

function restoreOriginalSpawn() {
  if (originalSpawn && isSpawnPatched) {
    require('child_process').spawn = originalSpawn;
    isSpawnPatched = false;
    console.log('[MCP] Original spawn restored');
  }
}

// Simplified transport creation without npm path resolution
function createWindowsCompatibleTransport(options: any) {
  const { command, args, env } = options;
  
  return new StdioClientTransport({
    command,
    args,
    env: { 
      ...process.env, 
      ...env,
      // Ensure npm/npx can find necessary paths
      NPM_CONFIG_YES: 'true', // Auto-confirm npm operations
      NPM_CONFIG_UPDATE_NOTIFIER: 'false', // Disable update notifier
      FORCE_COLOR: '0', // Disable colors to avoid terminal formatting issues
    },
  });
}

// Initialize spawn patching
function ensureHiddenSpawn() {
  if (process.platform === 'win32') {
    patchSpawnForWindows();
    
    // Keep it patched - restore on shutdown
    process.on('exit', restoreOriginalSpawn);
    process.on('SIGINT', restoreOriginalSpawn);
    process.on('SIGTERM', restoreOriginalSpawn);
  }
}

// Call this once when the module loads
ensureHiddenSpawn();

export function setupMCPHandlers() {
  // Ensure spawn is patched before any MCP operations
  ensureHiddenSpawn();
  
  ipcMain.handle('mcp:initialize_client', async (event, { serverName, config }) => {
    try {
      console.log(`[MCP] Initializing client for ${serverName} (Windows hidden: ${process.platform === 'win32'})`);
      console.log(`[MCP] Config for ${serverName}:`, { 
        command: config.command, 
        args: config.args,
        enabled: config.enabled 
      });
      
      // Clean up existing client and process
      if (activeClients[serverName]) {
        try {
          await activeClients[serverName].close();
        } catch (error) {
          console.warn(`[MCP] Error closing existing client ${serverName}:`, error);
        }
        delete activeClients[serverName];
      }
      
      if (activeProcesses[serverName]) {
        try {
          activeProcesses[serverName].kill('SIGTERM');
        } catch (error) {
          console.warn(`[MCP] Error killing existing process ${serverName}:`, error);
        }
        delete activeProcesses[serverName];
      }

      if (!config.enabled) {
        return { success: true, message: `MCP client for ${serverName} is disabled` };
      }

      // Prepare transport options with Windows compatibility
      const transportOptions = {
        command: config.command || "node",
        args: config.args || [],
        env: { 
          ...process.env, 
          ...config.env,
          // Add helpful environment variables
          NPM_CONFIG_YES: 'true',
          NPM_CONFIG_UPDATE_NOTIFIER: 'false',
          FORCE_COLOR: '0',
          NO_UPDATE_NOTIFIER: '1',
        }
      };

      console.log(`[MCP] Creating transport for ${serverName}:`, {
        command: transportOptions.command,
        args: transportOptions.args,
        platform: process.platform,
        spawnPatched: isSpawnPatched
      });

      // Create transport - let the spawn patch handle the hiding
      const transport = createWindowsCompatibleTransport(transportOptions);

      const client = new Client({
        name: config.clientName || "onlysaid-client",
        version: config.clientVersion || "1.0.0",
        env: transportOptions.env
      });

      console.log(`[MCP] Connecting client for ${serverName}...`);
      
      // Add timeout for connection
      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000);
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      console.log(`[MCP] Client connected for ${serverName}`);

      let tools: IMCPTool[] = [];
      try {
        console.log(`[MCP] Listing tools for ${serverName}...`);
        const toolsResult = await client.listTools();
        tools = toolsResult.tools.map((tool) => {
          return {
            name: tool.name,
            description: tool.description || "",
            inputSchema: tool.inputSchema
          };
        });
        console.log(`[MCP] Found ${tools.length} tools for ${serverName}:`, tools.map(t => t.name));
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
      
      // Clean up on error
      if (activeClients[serverName]) {
        try {
          await activeClients[serverName].close();
        } catch (cleanupError) {
          console.warn(`Error during cleanup for ${serverName}:`, cleanupError);
        }
        delete activeClients[serverName];
      }
      
      return { 
        success: false, 
        error: error.message,
        details: error.stack 
      };
    }
  });

  ipcMain.handle('mcp:list_tools', async (event, params = { serverName: 'default' }) => {
    try {
      const { serverName = 'default' } = params || {};

      const client = serverName === 'default'
        ? Object.values(activeClients)[0]
        : activeClients[serverName];

      if (!client) {
        return { success: false, error: `No active MCP client found for ${serverName}` };
      }

      const tools = await client.listTools();

      return { success: true, data: tools };
    } catch (error: any) {
      console.error(`Error listing tools for MCP client ${params?.serverName || 'default'}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('mcp:execute_tool', async (event, params) => {
    try {
      const { serverName = 'default', toolName, arguments: toolArgs } = params;

      console.log(`🔧 [MCP Main] Executing tool ${toolName} on ${serverName} with args:`, {
        serverName,
        toolName,
        toolArgs,
        hasClient: !!activeClients[serverName] || !!Object.values(activeClients)[0]
      });

      const client = serverName === 'default'
        ? Object.values(activeClients)[0]
        : activeClients[serverName];

      if (!client) {
        const error = `No active MCP client found for server: ${serverName}`;
        console.error(`🔧 [MCP Main] ${error}`);
        return { success: false, error };
      }

      console.log(`🔧 [MCP Main] Found client for ${serverName}, executing tool...`);

      const result = await client.callTool({
        name: toolName,
        arguments: toolArgs || {}
      });

      console.log(`🔧 [MCP Main] Tool ${toolName} execution completed:`, {
        hasResult: !!result,
        resultType: typeof result,
        result
      });

      return {
        success: true,
        data: result,
        toolName,
        serverName
      };
    } catch (error: any) {
      console.error(`🔧 [MCP Main] Error executing tool ${params?.toolName} on ${params?.serverName}:`, {
        message: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: error.message,
        toolName: params?.toolName,
        serverName: params?.serverName
      };
    }
  });

  ipcMain.handle('mcp:cleanup', async (event, serverName?: string) => {
    try {
      console.log(`[MCP] Cleaning up ${serverName || 'all clients'}`);
      
      if (serverName) {
        if (activeClients[serverName]) {
          await activeClients[serverName].close();
          delete activeClients[serverName];
        }
        if (activeProcesses[serverName]) {
          activeProcesses[serverName].kill('SIGTERM');
          delete activeProcesses[serverName];
        }
      } else {
        for (const [name, client] of Object.entries(activeClients)) {
          try {
            await client.close();
          } catch (error) {
            console.warn(`Failed to close client ${name}:`, error);
          }
        }
        
        for (const [name, process] of Object.entries(activeProcesses)) {
          try {
            process.kill('SIGTERM');
          } catch (error) {
            console.warn(`Failed to kill process ${name}:`, error);
          }
        }
        
        Object.keys(activeClients).forEach(key => delete activeClients[key]);
        Object.keys(activeProcesses).forEach(key => delete activeProcesses[key]);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error during MCP cleanup:', error);
      return { success: false, error: error.message };
    }
  });
}
import { IEnhancedServerModule, IAirbnbConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const AirbnbServerModule: IEnhancedServerModule<IAirbnbConfig> = {
    metadata: {
        id: "airbnb",
        title: "Airbnb MCP Server",
        description: "MCP Server for searching Airbnb and get listing details.",
        version: "unknown",
        icon: "Home",
        sourceUrl: "https://github.com/openbnb-org/mcp-server-airbnb",
        platforms: ["windows", "macos", "linux"],
        category: "accommodation"
    },

    defaultConfig: {},

    isConfigured: (config: IAirbnbConfig) => {
        // Airbnb doesn't require any configuration
        return true;
    },

    createClientConfig: (config: IAirbnbConfig, homedir: string) => ({
        enabled: true,
        command: "npx",
        args: ["-y", "@openbnb/mcp-server-airbnb"],
        clientName: "airbnb-mcp",
        clientVersion: "1.0.0"
    }),

    getDialogFields: (): Field[] => [
        // No configuration fields needed for Airbnb
    ],

    validateConfig: (config: IAirbnbConfig) => {
        return { isValid: true };
    },

    // Store integration methods
    setEnabled: async (enabled: boolean) => { },
    setConfig: (config: Partial<IAirbnbConfig>) => { },
    setAutoApproved: (autoApproved: boolean) => { },
    getEnabled: () => false,
    getConfig: () => ({}),
    getConfigured: () => true,
    getAutoApproved: () => false
};

serverRegistry.register("airbnb", AirbnbServerModule);

import { IEnhancedServerModule, ILocationConfig } from "@/../../types/MCP/server";
import { Field } from "@/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const LocationServerModule: IEnhancedServerModule<ILocationConfig> = {
    metadata: {
        id: "location",
        title: "open-streetmap-mcp",
        description: "An OpenStreetMap MCP server implementation that enhances LLM capabilities with location-based services and geospatial data.",
        version: "unknown",
        icon: "LocationOn",
        sourceUrl: "https://github.com/jagan-shanmugam/open-streetmap-mcp",
        platforms: ["windows", "macos", "linux"],
        category: "location"
    },

    defaultConfig: {
        path: ""
    },

    isConfigured: (config: ILocationConfig) => {
        return !!config.path;
    },

    createClientConfig: (config: ILocationConfig, homedir: string) => ({
        enabled: true,
        command: "node",
        args: [`${config.path}/dist/index.js`],
        clientName: "location-mcp",
        clientVersion: "1.0.0"
    }),

    getDialogFields: (): Field[] => [
        {
            key: "path",
            label: "Path to OpenStreetMap MCP repository",
            type: "text",
            required: true,
            description: "Full path to the cloned OpenStreetMap MCP repository",
            descriptionLink: {
                text: "Clone Repository",
                url: "https://github.com/jagan-shanmugam/open-streetmap-mcp"
            }
        }
    ],

    validateConfig: (config: ILocationConfig) => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!config.path) {
            errors.path = "Path to OpenStreetMap MCP repository is required";
            isValid = false;
        }

        return { isValid, errors };
    },

    // Store integration methods
    setEnabled: async (enabled: boolean) => { },
    setConfig: (config: Partial<ILocationConfig>) => { },
    setAutoApproved: (autoApproved: boolean) => { },
    getEnabled: () => false,
    getConfig: () => ({ path: "" }),
    getConfigured: () => false,
    getAutoApproved: () => false
};

serverRegistry.register("location", LocationServerModule);

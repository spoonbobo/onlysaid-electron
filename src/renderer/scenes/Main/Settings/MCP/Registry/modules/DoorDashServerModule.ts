import { IEnhancedServerModule, IDoorDashConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const DoorDashServerModule: IEnhancedServerModule<IDoorDashConfig> = {
    metadata: {
        id: "doordash",
        title: "DoorDash MCP Server",
        description: "MCP server for food delivery integration with DoorDash.",
        version: "1.1.0",
        icon: "DeliveryDining",
        platforms: ["windows", "macos", "linux"],
        category: "delivery"
    },

    defaultConfig: {
        apiKey: "",
        endpoint: "https://api.doordash.com",
        region: "US"
    },

    isConfigured: (config: IDoorDashConfig) => {
        return !!config.apiKey && !!config.endpoint && !!config.region;
    },

    createClientConfig: (config: IDoorDashConfig, homedir: string) => ({
        enabled: true,
        command: "npx",
        args: ["-y", "doordash-mcp"],
        env: {
            DOORDASH_API_KEY: config.apiKey,
            DOORDASH_ENDPOINT: config.endpoint,
            DOORDASH_REGION: config.region
        },
        clientName: "doordash-mcp",
        clientVersion: "1.1.0"
    }),

    getDialogFields: (): Field[] => [
        {
            key: "apiKey",
            label: "DoorDash API Key",
            type: "password",
            required: true,
            description: "API key for DoorDash integration",
            descriptionLink: {
                text: "Get API Key",
                url: "https://developer.doordash.com/"
            }
        },
        {
            key: "endpoint",
            label: "DoorDash API Endpoint",
            type: "text",
            required: true,
            placeholder: "https://api.doordash.com"
        },
        {
            key: "region",
            label: "Region",
            type: "select",
            required: true,
            options: ["US", "CA", "AU", "JP"]
        }
    ],

    validateConfig: (config: IDoorDashConfig) => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!config.apiKey) {
            errors.apiKey = "DoorDash API Key is required";
            isValid = false;
        }
        if (!config.endpoint) {
            errors.endpoint = "DoorDash endpoint is required";
            isValid = false;
        }
        if (!config.region) {
            errors.region = "Region is required";
            isValid = false;
        }

        return { isValid, errors };
    },

    // Store integration methods
    setEnabled: async (enabled: boolean) => { },
    setConfig: (config: Partial<IDoorDashConfig>) => { },
    setAutoApproved: (autoApproved: boolean) => { },
    getEnabled: () => false,
    getConfig: () => ({ apiKey: "", endpoint: "https://api.doordash.com", region: "US" }),
    getConfigured: () => false,
    getAutoApproved: () => false
};

serverRegistry.register("doorDash", DoorDashServerModule);

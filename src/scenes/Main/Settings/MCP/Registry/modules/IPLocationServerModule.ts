import { IEnhancedServerModule, IIPLocationConfig } from "@/../../types/MCP/server";
import { Field } from "@/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const IPLocationServerModule: IEnhancedServerModule<IIPLocationConfig> = {
    metadata: {
        id: "ip-location",
        title: "ip-location-mcp",
        description: "Server that uses the ipinfo.io API to get detailed information about an IP address. This can be used to determine where the user is located (approximately) and what network they are used.",
        version: "unknown",
        icon: "LocationOn",
        sourceUrl: "https://github.com/briandconnelly/mcp-server-ipinfo",
        platforms: ["windows", "macos", "linux"],
        category: "location"
    },

    defaultConfig: {
        apiKey: ""
    },

    isConfigured: (config: IIPLocationConfig) => {
        return !!config.apiKey;
    },

    createClientConfig: (config: IIPLocationConfig, homedir: string) => ({
        enabled: true,
        command: "npx",
        args: ["-y", "mcp-server-ipinfo"],
        env: {
            IPINFO_API_KEY: config.apiKey
        },
        clientName: "ip-location-mcp",
        clientVersion: "1.0.0"
    }),

    getDialogFields: (): Field[] => [
        {
            key: "apiKey",
            label: "IPInfo API Key",
            type: "password",
            required: true,
            description: "API key for IPInfo.io service",
            descriptionLink: {
                text: "Get API Key",
                url: "https://ipinfo.io/signup"
            }
        }
    ],

    validateConfig: (config: IIPLocationConfig) => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!config.apiKey) {
            errors.apiKey = "IPInfo API Key is required";
            isValid = false;
        }

        return { isValid, errors };
    },

    // Store integration methods
    setEnabled: async (enabled: boolean) => { },
    setConfig: (config: Partial<IIPLocationConfig>) => { },
    setAutoApproved: (autoApproved: boolean) => { },
    getEnabled: () => false,
    getConfig: () => ({ apiKey: "" }),
    getConfigured: () => false,
    getAutoApproved: () => false
};

serverRegistry.register("ipLocation", IPLocationServerModule);

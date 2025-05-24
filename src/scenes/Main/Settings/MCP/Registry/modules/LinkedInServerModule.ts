import { IEnhancedServerModule, ILinkedInConfig } from "@/../../types/MCP/server";
import { Field } from "@/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const LinkedInServerModule: IEnhancedServerModule<ILinkedInConfig> = {
    metadata: {
        id: "linkedin",
        title: "LinkedIn MCP Server",
        description: "MCP server for LinkedIn professional network integration.",
        version: "1.0.0",
        icon: "LinkedIn",
        sourceUrl: "https://github.com/adhikasp/mcp-linkedin",
        platforms: ["windows", "macos", "linux"],
        category: "communication"
    },

    defaultConfig: {
        email: "",
        password: ""
    },

    isConfigured: (config: ILinkedInConfig) => {
        return !!config.email && !!config.password;
    },

    createClientConfig: (config: ILinkedInConfig, homedir: string) => ({
        enabled: true,
        command: "npx",
        args: ["-y", "mcp-linkedin"],
        env: {
            LINKEDIN_EMAIL: config.email,
            LINKEDIN_PASSWORD: config.password
        },
        clientName: "linkedin-mcp",
        clientVersion: "1.0.0"
    }),

    getDialogFields: (): Field[] => [
        {
            key: "email",
            label: "LinkedIn Email",
            type: "text",
            required: true,
            description: "Your LinkedIn account email address"
        },
        {
            key: "password",
            label: "LinkedIn Password",
            type: "password",
            required: true,
            description: "Your LinkedIn account password"
        }
    ],

    validateConfig: (config: ILinkedInConfig) => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!config.email) {
            errors.email = "LinkedIn email is required";
            isValid = false;
        }
        if (!config.password) {
            errors.password = "LinkedIn password is required";
            isValid = false;
        }

        return { isValid, errors };
    },

    // Store integration methods
    setEnabled: async (enabled: boolean) => { },
    setConfig: (config: Partial<ILinkedInConfig>) => { },
    setAutoApproved: (autoApproved: boolean) => { },
    getEnabled: () => false,
    getConfig: () => ({ email: "", password: "" }),
    getConfigured: () => false,
    getAutoApproved: () => false
};

serverRegistry.register("linkedIn", LinkedInServerModule);

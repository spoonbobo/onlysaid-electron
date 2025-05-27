import { IEnhancedServerModule, IGitHubConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const GitHubServerModule: IEnhancedServerModule<IGitHubConfig> = {
    metadata: {
        id: "github",
        title: "GitHub MCP Server (Docker Required)",
        description: "MCP server for GitHub repository management and code access.",
        version: "0.2.1",
        icon: "GitHub",
        sourceUrl: "https://github.com/github/github-mcp-server",
        platforms: ["windows", "macos", "linux"],
        category: "development"
    },

    defaultConfig: {
        accessToken: ""
    },

    isConfigured: (config: IGitHubConfig) => {
        return !!config.accessToken;
    },

    createClientConfig: (config: IGitHubConfig, homedir: string) => ({
        enabled: true,
        command: "docker",
        args: [
            "run",
            "-i",
            "--rm",
            "-e", `GITHUB_PERSONAL_ACCESS_TOKEN=${config.accessToken}`,
            "mcp/github"
        ],
        env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: config.accessToken
        },
        clientName: "github-mcp",
        clientVersion: "0.2.1"
    }),

    getDialogFields: (): Field[] => [
        {
            key: "accessToken",
            label: "GitHub Personal Access Token",
            type: "password",
            required: true,
            description: "Personal access token for GitHub API access",
            descriptionLink: {
                text: "Create Token",
                url: "https://github.com/settings/tokens"
            }
        }
    ],

    validateConfig: (config: IGitHubConfig) => {
        const errors: Record<string, string> = {};
        let isValid = true;

        if (!config.accessToken) {
            errors.accessToken = "GitHub Personal Access Token is required";
            isValid = false;
        }

        return { isValid, errors };
    },

    // Store integration methods
    setEnabled: async (enabled: boolean) => { },
    setConfig: (config: Partial<IGitHubConfig>) => { },
    setAutoApproved: (autoApproved: boolean) => { },
    getEnabled: () => false,
    getConfig: () => ({ accessToken: "" }),
    getConfigured: () => false,
    getAutoApproved: () => false
};

serverRegistry.register("github", GitHubServerModule);

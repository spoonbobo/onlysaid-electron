import { IEnhancedServerModule, IWeb3ResearchConfig } from "@/../../types/MCP/server";
import { Field } from "@/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const Web3ResearchServerModule: IEnhancedServerModule<IWeb3ResearchConfig> = {
  metadata: {
    id: "web3-research",
    title: "Web3 Research MCP",
    description: "MCP server for Web3 and blockchain research capabilities.",
    version: "0.9.0",
    icon: "Wallet",
    platforms: ["windows", "macos", "linux"],
    category: "research"
  },

  defaultConfig: {
    apiKey: "",
    endpoint: ""
  },

  isConfigured: (config: IWeb3ResearchConfig) => {
    return !!config.apiKey && !!config.endpoint;
  },

  createClientConfig: (config: IWeb3ResearchConfig, homedir: string) => ({
    enabled: true,
    command: "npx",
    args: ["-y", "web3-research-mcp"],
    env: {
      WEB3_API_KEY: config.apiKey,
      WEB3_ENDPOINT: config.endpoint
    },
    clientName: "web3-research-mcp",
    clientVersion: "0.9.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      description: "API key for Web3 research services"
    },
    {
      key: "endpoint",
      label: "Service Endpoint",
      type: "text",
      required: true,
      placeholder: "https://api.web3research.com"
    }
  ],

  validateConfig: (config: IWeb3ResearchConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.apiKey) {
      errors.apiKey = "API Key is required";
      isValid = false;
    }
    if (!config.endpoint) {
      errors.endpoint = "Service endpoint is required";
      isValid = false;
    }

    return { isValid, errors };
  },

  // Store integration methods
  setEnabled: async (enabled: boolean) => { },
  setConfig: (config: Partial<IWeb3ResearchConfig>) => { },
  setAutoApproved: (autoApproved: boolean) => { },
  getEnabled: () => false,
  getConfig: () => ({ apiKey: "", endpoint: "" }),
  getConfigured: () => false,
  getAutoApproved: () => false
};

serverRegistry.register("web3Research", Web3ResearchServerModule);

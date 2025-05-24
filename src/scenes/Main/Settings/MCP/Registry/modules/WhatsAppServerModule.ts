import { IEnhancedServerModule, IWhatsAppConfig } from "@/../../types/MCP/server";
import { Field } from "@/components/Dialog/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const WhatsAppServerModule: IEnhancedServerModule<IWhatsAppConfig> = {
  metadata: {
    id: "whatsapp",
    title: "WhatsApp MCP Server",
    description: "MCP server for WhatsApp messaging integration (Linux only).",
    version: "0.0.1",
    icon: "WhatsApp",
    sourceUrl: "https://github.com/lharries/whatsapp-mcp?tab=readme-ov-file#installation",
    platforms: ["linux"],
    category: "communication"
  },

  defaultConfig: {
    path: ""
  },

  isConfigured: (config: IWhatsAppConfig) => {
    return !!config.path && config.path.trim().length > 0;
  },

  createClientConfig: (config: IWhatsAppConfig, homedir: string) => ({
    enabled: true,
    command: "node",
    args: [`${config.path}/dist/index.js`],
    clientName: "whatsapp-mcp",
    clientVersion: "0.0.1"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "path",
      label: "Path to whatsapp-mcp repository",
      type: "text",
      required: true,
      description: "Enter the FULL path to the whatsapp-mcp repository",
      descriptionLink: {
        text: "You must complete the pre-requisites before using this service.",
        url: "https://github.com/lharries/whatsapp-mcp?tab=readme-ov-file#installation"
      }
    }
  ],

  validateConfig: (config: IWhatsAppConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.path || config.path.trim().length === 0) {
      errors.path = "Path is required";
      isValid = false;
    }

    return { isValid, errors };
  },

  // Store integration methods (these would be implemented by the store)
  setEnabled: async (enabled: boolean) => {
    // Implementation handled by store
  },
  setConfig: (config: Partial<IWhatsAppConfig>) => {
    // Implementation handled by store
  },
  setAutoApproved: (autoApproved: boolean) => {
    // Implementation handled by store
  },
  getEnabled: () => false, // Implementation handled by store
  getConfig: () => ({ path: "" }), // Implementation handled by store
  getConfigured: () => false, // Implementation handled by store
  getAutoApproved: () => false // Implementation handled by store
};

// Auto-register the module
serverRegistry.register("whatsApp", WhatsAppServerModule);
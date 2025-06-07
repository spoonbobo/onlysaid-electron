import { IEnhancedServerModule, IMSTeamsConfig } from "@/../../types/MCP/server";
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { serverRegistry } from "../ServerRegistry";

export const MSTeamsServerModule: IEnhancedServerModule<IMSTeamsConfig> = {
  metadata: {
    id: "ms-teams", // Consistent with SERVICE_TYPE_MAPPING in MCPStore
    title: "Microsoft Teams MCP Server",
    description: "MCP server for Microsoft Teams integration.",
    version: "1.0.0", // Placeholder version
    icon: "Chat", // Example Material UI icon name, adjust as needed
    sourceUrl: "https://github.com/InditexTech/mcp-teams-server",
    platforms: ["windows", "macos", "linux"],
    category: "communication"
  },

  defaultConfig: {
    appId: "",
    appPassword: "",
    appType: "SingleTenant",
    tenantId: "",
    teamId: "",
    channelId: "",
  },

  isConfigured: (config: IMSTeamsConfig) => {
    return !!config.appId &&
      !!config.appPassword &&
      !!config.appType &&
      !!config.teamId &&
      !!config.channelId &&
      (config.appType === "MultiTenant" || (config.appType === "SingleTenant" && !!config.tenantId));
  },

  createClientConfig: (config: IMSTeamsConfig, homedir: string) => ({
    enabled: true, // This should ideally be tied to the actual enabled state from the store
    command: "uv",
    args: ["run", "mcp-teams-server"],
    env: {
      "TEAMS_APP_ID": config.appId,
      "TEAMS_APP_PASSWORD": config.appPassword,
      "TEAMS_APP_TYPE": config.appType,
      "TEAMS_APP_TENANT_ID": config.tenantId || "",
      "TEAM_ID": config.teamId,
      "TEAMS_CHANNEL_ID": config.channelId,
    },
    clientName: "msteams-client",
    clientVersion: "1.0.0"
  }),

  getDialogFields: (): Field[] => [
    {
      key: "appId",
      label: "MS Entra ID Application ID",
      type: "text",
      required: true,
      description: "UUID for your MS Entra ID application ID.",
    },
    {
      key: "appPassword",
      label: "Client Secret",
      type: "password",
      required: true,
      description: "Client secret for the MS Entra ID application.",
    },
    {
      key: "appType",
      label: "Application Type",
      type: "select",
      required: true,
      options: [
        "SingleTenant",
        "MultiTenant",
      ],
      description: "Specify if the application is SingleTenant or MultiTenant.",
    },
    {
      key: "tenantId",
      label: "Tenant ID (for SingleTenant)",
      type: "text",
      required: false,
      description: "Tenant UUID, required if Application Type is SingleTenant.",
    },
    {
      key: "teamId",
      label: "MS Teams Group/Team ID",
      type: "text",
      required: true,
      description: "The ID of the Microsoft Teams Group or Team.",
    },
    {
      key: "channelId",
      label: "MS Teams Channel ID",
      type: "text",
      required: true,
      description: "The ID of the Microsoft Teams Channel (URL escaped characters if necessary).",
    },
  ],

  validateConfig: (config: IMSTeamsConfig) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!config.appId) {
      errors.appId = "Application ID is required";
      isValid = false;
    }
    if (!config.appPassword) {
      errors.appPassword = "Client Secret is required";
      isValid = false;
    }
    if (!config.teamId) {
      errors.teamId = "Team ID is required";
      isValid = false;
    }
    if (!config.channelId) {
      errors.channelId = "Channel ID is required";
      isValid = false;
    }
    if (config.appType === "SingleTenant" && !config.tenantId) {
      errors.tenantId = "Tenant ID is required for SingleTenant applications";
      isValid = false;
    }

    return { isValid, errors };
  },

  // These are placeholder implementations.
  // In a real scenario, these would interact with the Zustand store (useMCPStore)
  // to get/set the actual server state. The IEnhancedServerModule might need
  // to be adjusted or these methods provided with access to the store.
  setEnabled: async (enabled: boolean) => { console.log(`MSTeams enabled: ${enabled}`) },
  setConfig: (config: Partial<IMSTeamsConfig>) => { console.log("MSTeams config set:", config) },
  setAutoApproved: (autoApproved: boolean) => { console.log(`MSTeams autoApproved: ${autoApproved}`) },
  getEnabled: () => false, // Placeholder
  getConfig: () => ({ // Placeholder
    appId: "", appPassword: "", appType: "SingleTenant", teamId: "", channelId: "",
  }),
  getConfigured: () => false, // Placeholder
  getAutoApproved: () => false // Placeholder
};

serverRegistry.register("msTeams", MSTeamsServerModule); // Use the same key as in MCPStore

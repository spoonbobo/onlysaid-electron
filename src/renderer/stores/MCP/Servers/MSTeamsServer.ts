import { toast } from "@/utils/toast";
import type { IServerModule } from "@/../../types/MCP/server";

// TODO: Move these interfaces to a central types file like "@/../../types/MCP/server.d.ts"
export interface IMSTeamsConfig {
  appId: string;
  appPassword: string;
  appType: "SingleTenant" | "MultiTenant";
  tenantId?: string; // Required if appType is "SingleTenant"
  teamId: string;
  channelId: string;
}

export interface IMSTeamsState {
  msTeamsEnabled?: boolean;
  msTeamsConfig?: IMSTeamsConfig;
  msTeamsAutoApproved?: boolean;
}
// End of TODO

export const createMSTeamsServer = (
  get: () => any, // MCPState & IMSTeamsState
  set: (partial: any) => void, // Partial<MCPState & IMSTeamsState>
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IMSTeamsConfig> => {

  const defaultConfig: IMSTeamsConfig = {
    appId: "",
    appPassword: "",
    appType: "SingleTenant",
    tenantId: "",
    teamId: "",
    channelId: "",
  };

  const isConfigured = (config: IMSTeamsConfig): boolean => {
    return !!config.appId &&
      !!config.appPassword &&
      !!config.appType &&
      !!config.teamId &&
      !!config.channelId &&
      (config.appType === "MultiTenant" || (config.appType === "SingleTenant" && !!config.tenantId));
  };

  const createClientConfig = (config: IMSTeamsConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "uv", // Assuming 'uv' is in PATH
    args: [
      "run",
      "mcp-teams-server" // From the provided GitHub link
    ],
    env: {
      "TEAMS_APP_ID": config.appId,
      "TEAMS_APP_PASSWORD": config.appPassword,
      "TEAMS_APP_TYPE": config.appType,
      "TEAMS_APP_TENANT_ID": config.tenantId || "",
      "TEAM_ID": config.teamId,
      "TEAMS_CHANNEL_ID": config.channelId,
    },
    clientName: "msteams-client", // A descriptive name
    clientVersion: "1.0.0" // Placeholder version
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      msTeamsEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("ms-teams"); // Use a consistent serviceType key
      if (!result.success) {
        toast.error(`MS Teams service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          msTeamsEnabled: false
        }));
      } else {
        toast.success("MS Teams service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IMSTeamsConfig>) => {
    set((state: any) => ({
      ...state,
      msTeamsConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.msTeamsEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.msTeamsConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      msTeamsAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.msTeamsAutoApproved || false;
  };

  return {
    defaultConfig,
    isConfigured,
    createClientConfig,
    setEnabled,
    setConfig,
    getEnabled,
    getConfig,
    getConfigured,
    setAutoApproved,
    getAutoApproved
  };
};

// Export for backward compatibility or direct use if needed
export const isMSTeamsConfigured = (config: IMSTeamsConfig): boolean => {
  return !!config.appId &&
    !!config.appPassword &&
    !!config.appType &&
    !!config.teamId &&
    !!config.channelId &&
    (config.appType === "MultiTenant" || (config.appType === "SingleTenant" && !!config.tenantId));
};

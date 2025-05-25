import { toast } from "@/utils/toast";
import type { IServerModule, IMS365Config } from "@/../../types/MCP/server";

export const createMS365Server = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IMS365Config> => {

  const defaultConfig: IMS365Config = {
    readOnly: false,
  };

  // MS365 server is considered configured by default as it uses its own auth flow.
  // Specific checks might be added if certain initial setup is required by the app itself.
  const isConfigured = (config: IMS365Config): boolean => {
    return true; // Always considered configured, auth is handled by the MCP server's tools
  };

  const createClientConfig = (config: IMS365Config, homedir: string) => {
    const envVars: Record<string, string> = {};
    if (config.readOnly) {
      envVars["READ_ONLY"] = "true";
    }

    return {
      enabled: getEnabled(),
      command: "npx",
      args: [
        "-y",
        "@softeria/ms-365-mcp-server"
      ],
      env: envVars,
      clientName: "ms-365-client", // Consistent naming convention
      clientVersion: "1.0.0" // Placeholder version
    };
  };

  const setEnabled = async (enabled: boolean) => {
    // No specific API key check needed here as auth is handled by the server's login tool.
    set((state: any) => ({
      ...state,
      ms365Enabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("ms365"); // Use "ms365" as serviceType
      if (!result.success) {
        toast.error(`MS365 service error: ${result.error || 'Failed to initialize'}`);
        set((state: any) => ({
          ...state,
          ms365Enabled: false
        }));
      } else {
        toast.success("MS365 service enabled successfully. Use its 'login' tool to authenticate.");
      }
    }
  };

  const setConfig = (config: Partial<IMS365Config>) => {
    set((state: any) => ({
      ...state,
      ms365Config: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.ms365Enabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.ms365Config || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      ms365AutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.ms365AutoApproved || false;
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

// Export for potential direct use if needed, though store interaction is primary.
export const isMS365Configured = (config: IMS365Config): boolean => {
  return true; // As per above, auth is internal to the MCP server
};

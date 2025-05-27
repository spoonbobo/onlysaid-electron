import { toast } from "@/utils/toast";
import type { IServerModule, IGoogleCalendarConfig, IGoogleCalendarState } from "@/../../types/MCP/server"; // Ensure IGoogleCalendarState is imported if you follow this pattern strictly

export const createGoogleCalendarServer = (
  get: () => any, // Should ideally be typed further, e.g., () => MCPState & IGoogleCalendarState
  set: (partial: any) => void, // e.g., (partial: Partial<MCPState & IGoogleCalendarState>) => void
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IGoogleCalendarConfig> => {

  const defaultConfig: IGoogleCalendarConfig = {
    indexPath: "", // Example: "/path/to/your/google-calendar-mcp/build/index.js"
  };

  const isConfigured = (config: IGoogleCalendarConfig): boolean => {
    return !!config.indexPath; // Considered configured if the path is set
  };

  // The 'homedir' argument might not be directly relevant here if 'indexPath' is absolute.
  // If 'indexPath' could be relative to 'homedir' or some other base, this would change.
  const createClientConfig = (config: IGoogleCalendarConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "node",
    args: [
      config.indexPath // Using the configured path
    ],
    // No 'env' needed as per your specification
    clientName: "google-calendar-client",
    clientVersion: "1.0.0" // Placeholder version
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) {
      toast.warning("Google Calendar Server: Index path not configured.");
      return;
    }

    set((state: any) => ({
      ...state,
      googleCalendarEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("google-calendar");
      if (!result.success) {
        toast.error(`Google Calendar service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          googleCalendarEnabled: false
        }));
      } else {
        toast.success("Google Calendar service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IGoogleCalendarConfig>) => {
    set((state: any) => ({
      ...state,
      googleCalendarConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.googleCalendarEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.googleCalendarConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      googleCalendarAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.googleCalendarAutoApproved || false;
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

// Optional: Export for direct use if needed elsewhere
export const isGoogleCalendarConfigured = (config: IGoogleCalendarConfig): boolean => {
  return !!config.indexPath;
};

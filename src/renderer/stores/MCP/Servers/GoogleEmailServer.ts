import { toast } from "@/utils/toast";
import type { IServerModule, IGoogleGmailConfig } from "@/../../types/MCP/server";

export const createGoogleGmailServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IGoogleGmailConfig> => {

  const defaultConfig: IGoogleGmailConfig = {};

  const isConfigured = (config: IGoogleGmailConfig): boolean => {
    return true; // No config required for Gmail AutoAuth
  };

  const createClientConfig = (config: IGoogleGmailConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "npx",
    args: [
      "-y",
      "@gongrzhe/server-gmail-autoauth-mcp"
    ],
    clientName: "gmail-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    set((state: any) => ({
      ...state,
      googleGmailEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("googleGmail");
      if (!result.success) {
        toast.error(`Google Gmail service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          googleGmailEnabled: false
        }));
      } else {
        toast.success("Google Gmail service enabled successfully");
      }
    }
  };

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      googleGmailAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.googleGmailAutoApproved || false;
  };

  const setConfig = (config: Partial<IGoogleGmailConfig>) => {
    set((state: any) => ({
      ...state,
      googleGmailConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.googleGmailEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.googleGmailConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

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

export const isGoogleGmailConfigured = (config: IGoogleGmailConfig): boolean => {
  return true;
};

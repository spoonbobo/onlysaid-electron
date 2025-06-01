import { toast } from "@/utils/toast";
import type { IServerModule, ILaraConfig, ILaraState } from "@/../../types/MCP/server";

export const createLaraServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<ILaraConfig> => {

  const defaultConfig: ILaraConfig = {
    accessKeyId: "",
    accessKeySecret: "",
  };

  const isConfigured = (config: ILaraConfig): boolean => {
    return !!config.accessKeyId && !!config.accessKeySecret;
  };

  const createClientConfig = (config: ILaraConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "npx",
    args: [
      "-y",
      "@translated/lara-mcp@latest"
    ],
    env: {
      "LARA_ACCESS_KEY_ID": config.accessKeyId,
      "LARA_ACCESS_KEY_SECRET": config.accessKeySecret
    },
    clientName: "lara-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      laraEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("lara-translate");
      if (!result.success) {
        toast.error(`Lara translation service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          laraEnabled: false
        }));
      } else {
        toast.success("Lara translation service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<ILaraConfig>) => {
    set((state: any) => ({
      ...state,
      laraConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.laraEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.laraConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      laraAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.laraAutoApproved || false;
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

// Export for backward compatibility
export const isLaraConfigured = (config: ILaraConfig): boolean => {
  return !!config.accessKeyId && !!config.accessKeySecret;
};

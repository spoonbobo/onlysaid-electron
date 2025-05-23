import { toast } from "@/utils/toast";
import type { IServerModule, IWhatsAppConfig } from "@/../../types/MCP/server";

export const createWhatsAppServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IWhatsAppConfig> => {

  const defaultConfig: IWhatsAppConfig = {
    path: ""
  };

  const isConfigured = (config: IWhatsAppConfig): boolean => {
    return !!config.path;
  };

  const createClientConfig = (config: IWhatsAppConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: `${homedir}/.local/bin/uv`,
    args: [
      "--directory",
      config.path,
      "run",
      "main.py"
    ],
    clientName: "whatsapp-client",
    clientVersion: "0.8.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      whatsAppEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("whatsapp");
      if (!result.success) {
        toast.error(`WhatsApp service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          whatsAppEnabled: false
        }));
      } else {
        toast.success("WhatsApp service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IWhatsAppConfig>) => {
    set((state: any) => ({
      ...state,
      whatsAppConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.whatsAppEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.whatsAppConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      whatsAppAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.whatsAppAutoApproved || false;
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

export const isWhatsAppConfigured = (config: IWhatsAppConfig): boolean => {
  return !!config.path;
};

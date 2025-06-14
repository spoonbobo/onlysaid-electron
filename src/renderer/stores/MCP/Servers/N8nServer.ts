import { toast } from "@/utils/toast";
import type { IServerModule, IN8nConfig, IN8nState } from "@/../../types/MCP/server";

export const createN8nServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IN8nConfig> => {

  const defaultConfig: IN8nConfig = {
    apiUrl: "",
    apiKey: "",
    webhookUsername: "",
    webhookPassword: ""
  };

  const isConfigured = (config: IN8nConfig): boolean => {
    return !!(config.apiUrl && config.apiKey);
  };

  const createClientConfig = (config: IN8nConfig, homedir: string) => {
    const env: Record<string, string> = {
      "N8N_API_URL": config.apiUrl,
      "N8N_API_KEY": config.apiKey
    };

    // Add webhook credentials if provided
    if (config.webhookUsername) {
      env["N8N_WEBHOOK_USERNAME"] = config.webhookUsername;
    }
    if (config.webhookPassword) {
      env["N8N_WEBHOOK_PASSWORD"] = config.webhookPassword;
    }

    return {
      enabled: getEnabled(),
      command: "npx",
      args: [
        "-y",
        "@leonardsellem/n8n-mcp-server@0.1.4"
      ],
      env,
      clientName: "n8n-client",
      clientVersion: "0.1.4"
    };
  };

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      n8nEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("n8n");
      if (!result.success) {
        toast.error(`N8n service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          n8nEnabled: false
        }));
      } else {
        toast.success("N8n service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IN8nConfig>) => {
    set((state: any) => ({
      ...state,
      n8nConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.n8nEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.n8nConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      n8nAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.n8nAutoApproved || false;
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
export const isN8nConfigured = (config: IN8nConfig): boolean => {
  return !!(config.apiUrl && config.apiKey);
};

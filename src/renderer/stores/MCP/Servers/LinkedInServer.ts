import { toast } from "@/utils/toast";
import type { IServerModule, ILinkedInConfig } from "@/../../types/MCP/server";

export const createLinkedInServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<ILinkedInConfig> => {

  const defaultConfig: ILinkedInConfig = {
    email: "",
    password: ""
  };

  const isConfigured = (config: ILinkedInConfig): boolean => {
    return !!config.email && !!config.password;
  };

  const createClientConfig = (config: ILinkedInConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "uvx",
    args: [
      "--from",
      "git+https://github.com/adhikasp/mcp-linkedin",
      "mcp-linkedin"
    ],
    env: {
      "LINKEDIN_EMAIL": config.email,
      "LINKEDIN_PASSWORD": config.password
    },
    clientName: "linkedin-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      linkedInEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("linkedin");
      if (!result.success) {
        toast.error(`LinkedIn service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          linkedInEnabled: false
        }));
      } else {
        toast.success("LinkedIn service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<ILinkedInConfig>) => {
    set((state: any) => ({
      ...state,
      linkedInConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.linkedInEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.linkedInConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      linkedInAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.linkedInAutoApproved || false;
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

export const isLinkedInConfigured = (config: ILinkedInConfig): boolean => {
  return !!config.email && !!config.password;
};

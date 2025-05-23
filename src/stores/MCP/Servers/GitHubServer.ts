import { toast } from "@/utils/toast";
import type { IServerModule, IGitHubConfig } from "@/../../types/MCP/server";

export const createGitHubServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IGitHubConfig> => {

  const defaultConfig: IGitHubConfig = {
    accessToken: ""
  };

  const isConfigured = (config: IGitHubConfig): boolean => {
    return !!config.accessToken;
  };

  const createClientConfig = (config: IGitHubConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "docker",
    args: [
      "run",
      "-i",
      "--rm",
      "-e",
      "GITHUB_PERSONAL_ACCESS_TOKEN",
      "ghcr.io/github/github-mcp-server"
    ],
    env: {
      "GITHUB_PERSONAL_ACCESS_TOKEN": config.accessToken
    },
    clientName: "github-client",
    clientVersion: "1.2.0"
  });

  const setEnabled = async (enabled: boolean) => {
    if (enabled && !isConfigured(getConfig())) return;

    set((state: any) => ({
      ...state,
      gitHubEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("github");
      if (!result.success) {
        toast.error(`GitHub service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          gitHubEnabled: false
        }));
      } else {
        toast.success("GitHub service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IGitHubConfig>) => {
    set((state: any) => ({
      ...state,
      gitHubConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.gitHubEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.gitHubConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      gitHubAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.gitHubAutoApproved || false;
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

export const isGitHubConfigured = (config: IGitHubConfig): boolean => {
  return !!config.accessToken;
};

import { toast } from "@/utils/toast";
import type { IServerModule, IPlaywrightConfig } from "@/../../types/MCP/server";

export const createPlaywrightServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IPlaywrightConfig> => {

  const defaultConfig: IPlaywrightConfig = {};

  const isConfigured = (config: IPlaywrightConfig): boolean => {
    return true; // No config required for Playwright
  };

  const createClientConfig = (config: IPlaywrightConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "npx",
    args: [
      "-y",
      "@playwright/mcp"
    ],
    clientName: "playwright-client",
    clientVersion: "0.0.29"
  });

  const setEnabled = async (enabled: boolean) => {
    set((state: any) => ({
      ...state,
      playwrightEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("playwright");
      if (!result.success) {
        toast.error(`Playwright service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          playwrightEnabled: false
        }));
      } else {
        toast.success("Playwright service enabled successfully");
      }
    }
  };

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      playwrightAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.playwrightAutoApproved || false;
  };

  const setConfig = (config: Partial<IPlaywrightConfig>) => {
    set((state: any) => ({
      ...state,
      playwrightConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.playwrightEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.playwrightConfig || defaultConfig;
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

export const isPlaywrightConfigured = (config: IPlaywrightConfig): boolean => {
  return true;
};

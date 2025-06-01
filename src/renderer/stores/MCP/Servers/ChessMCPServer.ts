import { toast } from "@/utils/toast";
import type { IServerModule } from "@/../../types/MCP/server";

export interface IChessConfig {
  // Chess server doesn't require any configuration - it runs via Docker
}

export interface IChessState {
  chessEnabled: boolean;
  chessConfig: IChessConfig;
  chessAutoApproved?: boolean;
}

export const createChessServer = (
  get: () => any,
  set: (partial: any) => void,
  initializeClient: (serviceType: string) => Promise<{ success: boolean; message?: string; error?: string }>
): IServerModule<IChessConfig> => {

  const defaultConfig: IChessConfig = {};

  const isConfigured = (config: IChessConfig): boolean => {
    // Chess server doesn't require configuration, always considered configured
    return true;
  };

  const createClientConfig = (config: IChessConfig, homedir: string) => ({
    enabled: getEnabled(),
    command: "docker",
    args: [
      "run",
      "--rm",
      "-i",
      "pab1it0/chess-mcp"
    ],
    clientName: "chess-client",
    clientVersion: "1.0.0"
  });

  const setEnabled = async (enabled: boolean) => {
    set((state: any) => ({
      ...state,
      chessEnabled: enabled
    }));

    if (enabled) {
      const result = await initializeClient("chess");
      if (!result.success) {
        toast.error(`Chess service error: ${result.error}`);
        set((state: any) => ({
          ...state,
          chessEnabled: false
        }));
      } else {
        toast.success("Chess service enabled successfully");
      }
    }
  };

  const setConfig = (config: Partial<IChessConfig>) => {
    set((state: any) => ({
      ...state,
      chessConfig: { ...getConfig(), ...config }
    }));
  };

  const getEnabled = () => {
    const state = get();
    return state.chessEnabled || false;
  };

  const getConfig = () => {
    const state = get();
    return state.chessConfig || defaultConfig;
  };

  const getConfigured = () => isConfigured(getConfig());

  const setAutoApproved = (autoApproved: boolean) => {
    set((state: any) => ({
      ...state,
      chessAutoApproved: autoApproved
    }));
  };

  const getAutoApproved = () => {
    const state = get();
    return state.chessAutoApproved || false;
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
export const isChessConfigured = (config: IChessConfig): boolean => {
  return true; // Chess server doesn't require configuration
};

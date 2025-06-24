declare global {
  interface Window {
    hideEJSLoading?: () => void;
    APP_ENV?: {
      isDevelopment: boolean;
      isBrowser: boolean;
      nodeEnv: string;
      buildTime: string;
    };
    updateEJSProgress?: (percentage: number, stepName: string, mcpProgress?: { current: number, total: number }) => void;
    setEJSLoadingText?: (stepName: string, mcpProgress?: { current: number, total: number }) => void;
  }
}

export {}; 
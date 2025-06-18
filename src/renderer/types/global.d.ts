declare global {
  interface Window {
    hideEJSLoading?: () => void;
    APP_ENV?: {
      isDevelopment: boolean;
      isBrowser: boolean;
      nodeEnv: string;
      buildTime: string;
    };
  }
}

export {}; 
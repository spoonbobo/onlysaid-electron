declare global {
  interface Window {
    electron: {
      openDirectory: () => Promise<string | null>;
    };
  }
}

export { };
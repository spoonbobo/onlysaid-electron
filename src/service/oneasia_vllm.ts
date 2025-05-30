export class OneasiaVLLMAPIService {
  private readonly baseURL: string;

  constructor(baseURL: string = "https://vllm.oasishpc.hk") {
    this.baseURL = baseURL;
  }

  async Authenticate(apiKey: string): Promise<boolean> {
    try {
      // Use IPC to call the main process instead of direct HTTP
      const result = await window.electron.oneasia.authenticate(apiKey);
      return result;
    } catch (error) {
      console.error("Oneasia vLLM authentication failed:", error);
      return false;
    }
  }

  async GetModels(apiKey: string): Promise<any[]> {
    try {
      // Use IPC to call the main process
      const models = await window.electron.oneasia.getModels(apiKey);
      return models;
    } catch (error) {
      console.error("Oneasia vLLM get models failed:", error);
      return [];
    }
  }
}

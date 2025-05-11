import axios from "axios";

export class OllamaAPIService {
  private readonly baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async Authenticate(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      return response.status === 200;
    } catch (error) {
      console.error("Error connecting to Ollama:", error);
      return false;
    }
  }

  async GetLLMModels(): Promise<any[]> {
    try {
      console.log("Ollama base URL:", this.baseURL); // Debug log
      const response = await axios.get(`${this.baseURL}/api/tags`);
      console.log("Ollama response:", response.data); // Debug log
      if (response.status === 200 && response.data.models) {
        return response.data.models.filter((model: any) =>
          !model.name.toLowerCase().includes('embed'));
      }
      return [];
    } catch (error) {
      console.error("Error fetching LLM models:", error);
      return [];
    }
  }

  async GetEmbeddingModels(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/api/tags`);
      if (response.status === 200 && response.data.models) {
        return response.data.models.filter((model: any) =>
          model.name.toLowerCase().includes('embed'));
      }
      return [];
    } catch (error) {
      console.error("Error fetching embedding models:", error);
      return [];
    }
  }
}
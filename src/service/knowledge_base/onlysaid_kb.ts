import axios, { AxiosInstance } from "axios";

export class OnylsaidKBService {
  private readonly baseURL: string;
  private readonly instance: AxiosInstance;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.instance = axios.create({
      baseURL: `${this.baseURL}/api/kb`,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  async queryKnowledgeBase(query: string, knowledgeBaseId: string): Promise<any[]> {
    const response = await this.instance.post(`${this.baseURL}/query`, {
      query,
      knowledgeBaseId
    });
    return response.data;
  }
}

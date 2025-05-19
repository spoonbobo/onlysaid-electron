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

  // TODO: add auth
  async ListKnowledgeBases(workspaceId: string): Promise<any[]> {
    const response = await this.instance.get(
      `${this.baseURL}/list_documents/${workspaceId}`
    );
    return response.data;
  }

  async viewKnowledgeBaseStructure(workspaceId: string): Promise<any[]> {
    const response = await this.instance.get(
      `${this.baseURL}/view/${workspaceId}`
    );
    return response.data;
  }

}

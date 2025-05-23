import axios, { AxiosInstance, AxiosResponse } from "axios";
import { IKnowledgeBase } from "../../../../types/KnowledgeBase/KnowledgeBase";
import { OpenAIMessage } from "../../stores/SSE/StreamStore"; // To type conversation history

// Interface for the payload to be sent to the /api/query endpoint
// This should mirror QueryRequest from your Python backend
interface QueryKnowledgeBasePayload {
  workspace_id: string; // Added
  knowledge_bases?: string[]; // Changed kb_ids to knowledge_bases to match Python
  query: string | string[]; // Changed query_text to query
  conversation_history?: string | string[]; // Added
  streaming: boolean;
  model?: string;
  top_k?: number; // Added
  preferred_language?: string; // Added
  message_id?: string; // Added, could be the assistant's message ID
}

// Interface for the parameters of the service method
export interface QueryKnowledgeBaseParams {
  workspaceId: string; // Added
  queryText: string;
  kbIds?: string[]; // Keep as kbIds for internal consistency, will map to knowledge_bases
  model?: string;
  conversationHistory?: OpenAIMessage[]; // Added, will be formatted
  topK?: number; // Added
  preferredLanguage?: string; // Added
  messageId?: string; // Added
}

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

  async listKnowledgeBases(workspaceId: string): Promise<any[]> {
    const response = await this.instance.get(
      `${this.baseURL}/list_documents/${workspaceId}`
    );
    return response.data;
  }

  async registerKnowledgeBase(kbData: IKnowledgeBase): Promise<any> {
    const response = await this.instance.post(
      `${this.baseURL}/register`,
      kbData
    );
    return response.data;
  }

  async getKnowledgeBaseStatus(workspaceId: string, kbId: string): Promise<any> {
    const response = await this.instance.get(
      `${this.baseURL}/kb_status/${workspaceId}/${kbId}`
    );
    return response.data;
  }

  async viewKnowledgeBaseStructure(workspaceId: string, kbId?: string): Promise<any[]> {
    let url = `${this.baseURL}/view/${workspaceId}`;
    if (kbId) {
      url += `?kb_id=${kbId}`;
    }
    const response = await this.instance.get(url);
    return response.data;
  }

  async updateKnowledgeBaseStatus(kbData: IKnowledgeBase): Promise<any> {
    const response = await this.instance.post(
      `${this.baseURL}/update_kb_status`,
      kbData
    );
    return response.data;
  }

  /**
   * Calls the backend /api/query endpoint to get an answer from knowledge bases.
   * This method expects to initiate a streaming response.
   * @param params Parameters for the query.
   * @returns AxiosResponse, which the caller (Electron main process) can use to handle the SSE stream.
   */
  async queryKnowledgeBase(params: QueryKnowledgeBaseParams): Promise<AxiosResponse> {
    // Format conversation history for the backend
    // The backend QueryRequest expects string or List[str].
    // A simple approach is to join role and content.
    const formattedConversationHistory = params.conversationHistory?.map(
      msg => `${msg.role}: ${msg.content}`
    ) || [];

    const payload: QueryKnowledgeBasePayload = {
      workspace_id: params.workspaceId,
      knowledge_bases: params.kbIds,
      query: params.queryText, // Backend expects 'query'
      conversation_history: formattedConversationHistory,
      streaming: true,
      model: params.model,
      top_k: params.topK || 5, // Default to 5 if not provided
      preferred_language: params.preferredLanguage || "en", // Default to 'en'
      message_id: params.messageId,
    };

    console.log("queryKnowledgeBase payload to be sent:", payload);

    // Ensure the endpoint is /api/query, not /api/kb/query or /query
    const response = await this.instance.post(
      `${this.baseURL}/query`, // Corrected endpoint
      payload,
      {
        responseType: 'stream'
      }
    );
    return response;
  }
}

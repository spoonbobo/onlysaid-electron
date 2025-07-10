import axios, { AxiosInstance, AxiosResponse } from "axios";
import { IKnowledgeBase } from "../../../../types/KnowledgeBase/KnowledgeBase";
import { OpenAIMessage } from "@/renderer/stores/Stream/StreamStore";

// Interface for the parameters of the service method
export interface QueryKnowledgeBaseParams {
  workspaceId: string;
  queryText: string;
  kbIds?: string[];
  model?: string;
  conversationHistory?: OpenAIMessage[];
  topK?: number;
  preferredLanguage?: string;
  messageId?: string;
  mode?: "naive" | "local" | "global" | "hybrid" | "mix" | "bypass";
}

// Interface for non-streaming results
export interface KnowledgeBaseNonStreamingResult {
  status: string;
  results: any;
}

export class LightRAGService {
  private readonly baseURL: string;
  private readonly instance: AxiosInstance;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.instance = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  // Document management methods
  async insertDocument(content: string, description?: string): Promise<any> {
    const response = await this.instance.post('/insert', {
      input: content,
      description: description || ""
    });
    return response.data;
  }

  async insertFile(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.instance.post('/insert_file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  async listDocuments(): Promise<any[]> {
    const response = await this.instance.get('/documents');
    return response.data;
  }

  async deleteDocument(docId: string): Promise<any> {
    const response = await this.instance.delete(`/documents/${docId}`);
    return response.data;
  }

  async getHealth(): Promise<any> {
    const response = await this.instance.get('/health');
    return response.data;
  }

  /**
   * Query LightRAG in streaming mode
   */
  async queryKnowledgeBase(params: QueryKnowledgeBaseParams): Promise<AxiosResponse> {
    // Filter out system messages from conversation history - LightRAG might not accept them
    const filteredConversationHistory = params.conversationHistory?.filter(
      msg => msg.role !== 'system'
    ).map(msg => ({ 
      role: msg.role, 
      content: msg.content || ""
    })) || [];

    // Build payload that matches working Python script
    const payload = {
      query: params.queryText,
      mode: params.mode || "hybrid",
      only_need_context: false,
      only_need_prompt: false,
      response_type: "string",
      top_k: params.topK || 10,
      max_token_for_text_unit: 4000,
      max_token_for_global_context: 4000,
      max_token_for_local_context: 4000,
      conversation_history: filteredConversationHistory,
      history_turns: 3,
      ids: params.kbIds || [],
      user_prompt: ""
    };

    try {
      const response = await this.instance.post('/query/stream', payload, {
        responseType: 'stream',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return response;
    } catch (error: any) {
      console.error("❌ LightRAG request failed:");
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);
      
      // Log payload details for 422 errors to help with debugging
      if (error.response?.status === 422) {
        console.error("🚨 422 Error - Payload rejected by server");
        if (error.response?.data) {
          console.error("Server error details:", error.response.data);
        }
      }
      
      throw error;
    }
  }

  /**
   * Query LightRAG in non-streaming mode
   */
  async queryKnowledgeBaseNonStreaming(params: QueryKnowledgeBaseParams): Promise<KnowledgeBaseNonStreamingResult> {
    // Filter out system messages from conversation history
    const filteredConversationHistory = params.conversationHistory?.filter(
      msg => msg.role !== 'system'
    ).map(msg => ({ 
      role: msg.role, 
      content: msg.content || "" 
    })) || [];

    // Build payload that matches working Python script
    const payload = {
      query: params.queryText,
      mode: params.mode || "hybrid",
      only_need_context: false,
      only_need_prompt: false,
      response_type: "string",
      top_k: params.topK || 10,
      max_token_for_text_unit: 4000,
      max_token_for_global_context: 4000,
      max_token_for_local_context: 4000,
      conversation_history: filteredConversationHistory,
      history_turns: 3,
      ids: params.kbIds || [],
      user_prompt: ""
    };

    try {
      const response = await this.instance.post('/query', payload);
      return response.data as KnowledgeBaseNonStreamingResult;
    } catch (error: any) {
      console.error("❌ LightRAG non-streaming request failed:");
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);
      throw error;
    }
  }

  /**
   * Retrieve documents from LightRAG (context only)
   */
  async retrieveFromKnowledgeBase(params: {
    workspaceId: string;
    queryText: string;
    kbIds?: string[];
    topK?: number;
  }): Promise<{
    status: string;
    results: Array<{
      source: string;
      text: string;
      score: number;
      metadata: any;
    }>;
  }> {
    // Build payload that matches working Python script
    const payload = {
      query: params.queryText,
      mode: "hybrid",
      only_need_context: true,
      only_need_prompt: false,
      response_type: "string",
      top_k: params.topK || 10,
      max_token_for_text_unit: 4000,
      max_token_for_global_context: 4000,
      max_token_for_local_context: 4000,
      conversation_history: [],
      history_turns: 3,
      ids: params.kbIds || [],
      user_prompt: ""
    };

    try {
      const response = await this.instance.post('/query', payload);
      return response.data;
    } catch (error: any) {
      console.error("❌ LightRAG retrieve request failed:");
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);
      throw error;
    }
  }

  /**
   * Scan for new documents in LightRAG
   * Triggers the scanning process for new documents
   */
  async scanDocuments(): Promise<{
    status: string;
    message: string;
  }> {
    try {
      const response = await this.instance.post('/documents/scan');
      return response.data;
    } catch (error: any) {
      console.error("❌ LightRAG scan request failed:");
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);
      throw error;
    }
  }

  // Legacy compatibility methods (for gradual migration)
  async listKnowledgeBases(workspaceId: string): Promise<any[]> {
    return this.listDocuments();
  }

  async registerKnowledgeBase(kbData: IKnowledgeBase): Promise<any> {
    // For LightRAG, this might just return success since documents are managed differently
    console.log("Legacy registerKnowledgeBase called - LightRAG manages documents differently");
    return { status: "success", message: "LightRAG manages documents automatically" };
  }

  async getKnowledgeBaseStatus(workspaceId: string, kbId: string): Promise<any> {
    return this.getHealth();
  }

  async viewKnowledgeBaseStructure(workspaceId: string, kbId?: string): Promise<any[]> {
    return this.listDocuments();
  }

  async updateKnowledgeBaseStatus(kbData: IKnowledgeBase): Promise<any> {
    console.log("Legacy updateKnowledgeBaseStatus called - LightRAG manages status automatically");
    return { status: "success", message: "LightRAG manages status automatically" };
  }

  // Updated legacy synchronize method to use new scan
  async synchronizeKnowledgeBase(workspaceId: string, kbId: string): Promise<any> {
    console.log(`Scanning documents for KB ${kbId} in workspace ${workspaceId}`);
    return this.scanDocuments();
  }
} 
import { create } from "zustand";
import { useSelectedModelStore } from "./SelectedModelStore";
import { useLLMConfigurationStore } from "./LLMConfiguration";
import { OpenAIMessage } from "../SSE/StreamStore"; // Reusing this type for messages
import type OpenAI from 'openai';
import { IChatMessageToolCall } from "@/../../types/Chat/Message"; // Added import
import { v4 as uuidv4 } from 'uuid'; // For generating log IDs

// Define a more specific type for the options that getOpenAICompletion will take
// and pass down to the IPC handler.
interface OpenAICompletionOptions {
  temperature?: number;
  maxTokens?: number;
  // apiKeys and ollamaConfig will be sourced from LLMConfigurationStore internally
  // model and provider will be sourced from SelectedModelStore internally
}

const DBTABLES = { // Added for tool_calls table
  TOOL_CALLS: 'tool_calls',
  LOGS: 'logs', // Add LOGS table reference
};

export interface IToolLog { // Added interface for log objects
  id: string;
  content: string;
  created_at: string;
}

export interface LLMStoreState {
  isLoadingCompletion: boolean;
  error: string | null;
  getOpenAICompletion: (
    messages: OpenAIMessage[],
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
    toolChoice?: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption
  ) => Promise<OpenAI.Chat.Completions.ChatCompletion | null>;
  createToolCalls: (messageId: string, toolCalls: IChatMessageToolCall[]) => Promise<void>;
  getToolCallsByMessageId: (messageId: string) => Promise<IChatMessageToolCall[]>;
  updateToolCallStatus: (toolCallId: string, status: string) => Promise<void>;
  updateToolCallResult: (toolCallId: string, result: string | Record<string, any>) => Promise<void>;
  addLogForToolCall: (toolCallId: string, logContent: string) => Promise<void>;
  getLogsForToolCall: (toolCallId: string) => Promise<IToolLog[]>; // Updated return type
  deleteToolCall: (toolCallId: string) => Promise<void>;
}

export const useLLMStore = create<LLMStoreState>((set, get) => ({
  isLoadingCompletion: false,
  error: null,
  getOpenAICompletion: async (messages, tools, toolChoice) => {
    set({ isLoadingCompletion: true, error: null });

    const { provider, modelId } = useSelectedModelStore.getState();
    const {
      openAIKey,
      deepSeekKey,
      ollamaBaseURL,
      temperature: configTemperature,
    } = useLLMConfigurationStore.getState();

    if (!provider || !modelId) {
      const errMsg = "No model or provider selected.";
      console.error(`[LLMStore] ${errMsg}`);
      set({ isLoadingCompletion: false, error: errMsg });
      return null;
    }

    const apiKeys = {
      openAI: openAIKey,
      deepSeek: deepSeekKey,
    };

    const ollamaConfig = {
      baseUrl: ollamaBaseURL,
    };

    // Prepare options for the IPC call
    const ipcOptions: any = {
      model: modelId,
      provider: provider,
      apiKeys: apiKeys,
      temperature: configTemperature, // Using temperature from LLMConfigurationStore
      // maxTokens: options.maxTokens, // This could be passed in if needed
      tools: tools,
      tool_choice: toolChoice, // Note: OpenAI SDK uses tool_choice
    };
    if (provider === 'ollama') {
      ipcOptions.ollamaConfig = ollamaConfig;
    }


    // Validate required configurations
    if (provider === 'openai' && !apiKeys.openAI) {
      const errMsg = "OpenAI provider selected, but API key is missing.";
      console.error(`[LLMStore] ${errMsg}`);
      set({ isLoadingCompletion: false, error: errMsg });
      return null;
    }
    if (provider === 'deepseek' && !apiKeys.deepSeek) {
      const errMsg = "DeepSeek provider selected, but API key is missing.";
      console.error(`[LLMStore] ${errMsg}`);
      set({ isLoadingCompletion: false, error: errMsg });
      return null;
    }
    if (provider === 'ollama' && (!ollamaConfig.baseUrl || ollamaConfig.baseUrl === '')) {
      const errMsg = "Ollama provider selected, but Base URL is missing or empty.";
      console.error(`[LLMStore] ${errMsg}`);
      set({ isLoadingCompletion: false, error: errMsg });
      return null;
    }


    try {
      console.log("[LLMStore] Calling IPC ai:get_completion with messages:", messages, "options:", ipcOptions);
      const result = await window.electron.ai.getCompletion({ messages, options: ipcOptions });

      if (result.success && result.completion) {
        set({ isLoadingCompletion: false, error: null });
        return result.completion as OpenAI.Chat.Completions.ChatCompletion;
      } else {
        const errMsg = result.error || "Failed to get completion for an unknown reason.";
        console.error("[LLMStore] Failed to get completion:", errMsg);
        set({ isLoadingCompletion: false, error: errMsg });
        return null;
      }
    } catch (e: any) {
      const errMsg = e.message || "An unexpected error occurred while getting completion.";
      console.error("[LLMStore] Error invoking ai:get_completion:", e);
      set({ isLoadingCompletion: false, error: errMsg });
      return null;
    }
  },
  createToolCalls: async (messageId, toolCalls) => {
    if (!toolCalls || toolCalls.length === 0) {
      return;
    }
    try {
      for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        if (toolCall.function) {
          const params = {
            id: toolCall.id,
            message_id: messageId,
            call_index: i,
            type: toolCall.type,
            function_name: toolCall.function.name,
            function_arguments: JSON.stringify(toolCall.function.arguments),
            tool_description: toolCall.tool_description || null,
            status: toolCall.status || 'pending',
          };
          await window.electron.db.query({
            query: `
              insert into ${DBTABLES.TOOL_CALLS}
              (id, message_id, call_index, type, function_name, function_arguments, tool_description, status, created_at)
              values
              (@id, @message_id, @call_index, @type, @function_name, @function_arguments, @tool_description, @status, CURRENT_TIMESTAMP)
            `,
            params: params
          });
          await get().addLogForToolCall(toolCall.id, `Tool call '${toolCall.function.name}' created. Status: ${params.status}.`);
        }
      }
    } catch (error: any) {
      console.error("[LLMStore] Error creating tool calls in DB:", error);
    }
  },
  getToolCallsByMessageId: async (messageId: string): Promise<IChatMessageToolCall[]> => {
    try {
      const results = await window.electron.db.query({
        query: `
          select id, type, function_name, function_arguments, call_index, tool_description, status, result
          from ${DBTABLES.TOOL_CALLS}
          where message_id = @messageId
          order by call_index asc
        `,
        params: { messageId }
      });

      if (Array.isArray(results)) {
        return results.map(row => ({
          id: row.id,
          type: row.type as 'function',
          function: {
            name: row.function_name,
            arguments: JSON.parse(row.function_arguments || '{}')
          },
          tool_description: row.tool_description,
          status: row.status,
          result: row.result ? JSON.parse(row.result) : undefined,
        }));
      }
      return [];
    } catch (error: any) {
      console.error(`[LLMStore] Error fetching tool calls for message ${messageId}:`, error);
      return [];
    }
  },
  updateToolCallStatus: async (toolCallId, status) => {
    try {
      await window.electron.db.query({
        query: `
          update ${DBTABLES.TOOL_CALLS}
          set status = @status
          where id = @toolCallId
        `,
        params: { toolCallId, status }
      });
      // Add a log entry when status is updated
      await get().addLogForToolCall(toolCallId, `Tool call status updated to: ${status}.`);
    } catch (error: any) {
      console.error(`[LLMStore] Error updating tool call ${toolCallId} status to ${status}:`, error);
    }
  },
  updateToolCallResult: async (toolCallId, result) => {
    try {
      const resultString = typeof result === 'string' ? result : JSON.stringify(result);
      await window.electron.db.query({
        query: `
          update ${DBTABLES.TOOL_CALLS}
          set result = @result, status = @status
          where id = @toolCallId
        `,
        params: { toolCallId, result: resultString, status: 'executed' }
      });
      // Add a log entry when result is updated
      await get().addLogForToolCall(toolCallId, `Tool call result updated. Status: executed.`);
    } catch (error: any) {
      console.error(`[LLMStore] Error updating tool call ${toolCallId} result:`, error);
    }
  },
  addLogForToolCall: async (toolCallId, logContent) => {
    try {
      const logId = uuidv4();
      await window.electron.db.query({
        query: `
          insert into ${DBTABLES.LOGS}
          (id, content, reference_id, reference_type, created_at)
          values
          (@id, @content, @reference_id, @reference_type, CURRENT_TIMESTAMP)
        `,
        params: {
          id: logId,
          content: logContent,
          reference_id: toolCallId,
          reference_type: 'tool_call'
        }
      });
    } catch (error: any) {
      console.error(`[LLMStore] Error adding log for tool call ${toolCallId}:`, error);
    }
  },
  getLogsForToolCall: async (toolCallId: string): Promise<IToolLog[]> => {
    try {
      const results = await window.electron.db.query({
        query: `
          select id, content, created_at from ${DBTABLES.LOGS}
          where reference_id = @reference_id and reference_type = @reference_type
          order by created_at asc
        `,
        params: { reference_id: toolCallId, reference_type: 'tool_call' }
      });
      if (Array.isArray(results)) {
        return results.map(row => ({
          id: row.id,
          content: row.content as string,
          created_at: row.created_at as string,
        }));
      }
      return [];
    } catch (error: any) {
      console.error(`[LLMStore] Error fetching logs for tool call ${toolCallId}:`, error);
      return [];
    }
  },
  deleteToolCall: async (toolCallId) => {
    try {
      await window.electron.db.query({
        query: `delete from ${DBTABLES.TOOL_CALLS} where id = @toolCallId`,
        params: { toolCallId }
      });
      await window.electron.db.query({
        query: `delete from ${DBTABLES.LOGS} where reference_id = @toolCallId and reference_type = 'tool_call'`,
        params: { toolCallId }
      });
    } catch (error: any) {
      console.error(`[LLMStore] Error deleting tool call ${toolCallId}:`, error);
    }
  },
}));

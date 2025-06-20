import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type OpenAI from 'openai';

export interface LangChainAgentOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  provider: string;
  apiKeys: {
    openAI?: string;
    deepSeek?: string;
    oneasia?: string;
  };
  ollamaConfig?: {
    baseUrl: string;
    model?: string;
  };
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  systemPrompt?: string;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LangChainAgentService {
  private chatModel: BaseChatModel | null = null;
  private agentExecutor: AgentExecutor | null = null;

  constructor(private options: LangChainAgentOptions) {
    this.initializeChatModel();
  }

  /**
   * Initialize the chat model based on provider
   */
  private initializeChatModel(): void {
    const { provider, model, temperature = 0.7, maxTokens, apiKeys, ollamaConfig } = this.options;

    try {
      switch (provider) {
        case 'openai':
          if (!apiKeys.openAI) {
            throw new Error('OpenAI API key is required');
          }
          this.chatModel = new ChatOpenAI({
            modelName: model,
            temperature,
            maxTokens,
            openAIApiKey: apiKeys.openAI,
            configuration: {
              baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
            },
          });
          break;

        case 'deepseek':
          if (!apiKeys.deepSeek) {
            throw new Error('DeepSeek API key is required');
          }
          this.chatModel = new ChatOpenAI({
            modelName: model,
            temperature,
            maxTokens,
            openAIApiKey: apiKeys.deepSeek,
            configuration: {
              baseURL: 'https://api.deepseek.com',
            },
          });
          break;

        case 'oneasia':
          if (!apiKeys.oneasia) {
            throw new Error('Oneasia API key is required');
          }
          // Map model ID to actual model path for Oneasia
          let actualModel = model;
          if (model === 'oneasia-llama') {
            actualModel = '/pfss/cm/shared/llm_models/Llama-3.3-70B-Instruct';
          }
          
          this.chatModel = new ChatOpenAI({
            modelName: actualModel,
            temperature,
            maxTokens,
            openAIApiKey: 'dummy', // Oneasia uses different auth
            configuration: {
              baseURL: 'https://vllm.oasishpc.hk/v1',
              defaultHeaders: {
                'apiKey': apiKeys.oneasia,
              },
            },
          });
          break;

        case 'ollama':
          if (!ollamaConfig?.baseUrl) {
            throw new Error('Ollama base URL is required');
          }
          this.chatModel = new ChatOllama({
            model: model,
            temperature,
            baseUrl: ollamaConfig.baseUrl,
          });
          break;

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      console.log(`[LangChain Agent] Initialized ${provider} chat model with model: ${model}`);
    } catch (error) {
      console.error('[LangChain Agent] Failed to initialize chat model:', error);
      throw error;
    }
  }

  /**
   * Convert OpenAI messages to LangChain messages
   */
  private convertToLangChainMessages(messages: OpenAIMessage[]): BaseMessage[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        default:
          return new HumanMessage(msg.content);
      }
    });
  }

  /**
   * Convert OpenAI tools to LangChain tools (simplified for tool selection only)
   */
  private convertToLangChainTools(openAITools?: OpenAI.Chat.Completions.ChatCompletionTool[]): any[] {
    if (!openAITools || openAITools.length === 0) {
      return [];
    }

    // Since we're not executing tools through LangChain, just return the OpenAI format
    // The model will use these for tool selection, but execution happens through MCP
    return openAITools.map(tool => ({
      type: "function",
      function: {
        name: tool.function?.name,
        description: tool.function?.description,
        parameters: tool.function?.parameters,
      }
    }));
  }

  /**
   * Initialize agent executor with tools
   */
  private async initializeAgentExecutor(tools: any[]): Promise<void> {
    if (!this.chatModel) {
      throw new Error('Chat model not initialized');
    }

    if (tools.length === 0) {
      this.agentExecutor = null;
      return;
    }

    try {
      const systemPrompt = this.options.systemPrompt || 
        "You are a helpful AI assistant. Use the available tools when needed to help the user. Be concise and helpful.";
      
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["placeholder", "{chat_history}"],
        ["human", "{input}"],
        ["placeholder", "{agent_scratchpad}"],
      ]);

      // Create the agent with type assertion
      const agent = await createOpenAIFunctionsAgent({
        llm: this.chatModel as any,
        tools: tools as any,
        prompt,
      });

      // Create agent executor
      this.agentExecutor = new AgentExecutor({
        agent,
        tools: tools as any,
        verbose: process.env.NODE_ENV === 'development',
        maxIterations: 5,
        earlyStoppingMethod: 'generate',
      });

      console.log(`[LangChain Agent] Initialized agent executor with ${tools.length} tools`);
    } catch (error) {
      console.error('[LangChain Agent] Failed to initialize agent executor:', error);
      throw error;
    }
  }

  /**
   * Simple completion without tools
   */
  async getSimpleCompletion(messages: OpenAIMessage[]): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    if (!this.chatModel) {
      throw new Error('Chat model not initialized');
    }

    const langChainMessages = this.convertToLangChainMessages(messages);

    try {
      console.log(`[LangChain Agent] Processing simple completion with ${messages.length} messages`);
      
      const response = await this.chatModel.invoke(langChainMessages);
      
      // Convert LangChain response back to OpenAI format
      const openAIResponse: OpenAI.Chat.Completions.ChatCompletion = {
        id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: this.options.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response.content as string,
              refusal: null,
            },
            logprobs: null,
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 0, // LangChain doesn't provide this easily
          completion_tokens: 0,
          total_tokens: 0,
        },
      };

      console.log(`[LangChain Agent] Simple completion successful, response length: ${response.content?.toString().length || 0}`);
      return openAIResponse;
    } catch (error) {
      console.error('[LangChain Agent] Error in simple completion:', error);
      throw error;
    }
  }

  /**
   * Agent completion with tools
   */
  async getAgentCompletion(messages: OpenAIMessage[]): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const tools = this.convertToLangChainTools(this.options.tools);
    
    if (tools.length === 0) {
      console.log('[LangChain Agent] No tools available, falling back to simple completion');
      return this.getSimpleCompletion(messages);
    }

    try {
      // Don't use agent executor - just get the model to decide which tools to call
      if (!this.chatModel) {
        throw new Error('Chat model not initialized');
      }

      const langChainMessages = this.convertToLangChainMessages(messages);

      // Convert LangChain tools to OpenAI format for the model
      const openAITools = this.options.tools || [];

      console.log(`[LangChain Agent] Processing tool selection with ${openAITools.length} tools`);

      // For ChatOpenAI models, bind tools before invoking
      const modelWithTools = openAITools.length > 0 
        ? (this.chatModel as any).bind({ tools: openAITools, tool_choice: "auto" })
        : this.chatModel;

      const response = await modelWithTools.invoke(langChainMessages);

      // Extract tool calls from the response
      let toolCalls: any[] = [];
      
      // Check various places where tool calls might be stored
      if (response.tool_calls && Array.isArray(response.tool_calls)) {
        toolCalls = response.tool_calls;
      } else if (response.additional_kwargs?.tool_calls) {
        toolCalls = response.additional_kwargs.tool_calls;
      } else if ((response as any).kwargs?.tool_calls) {
        toolCalls = (response as any).kwargs.tool_calls;
      }

      // Format tool calls to match OpenAI structure
      const formattedToolCalls = toolCalls.map((tc: any) => ({
        id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'function' as const,
        function: {
          name: tc.name || tc.function?.name,
          arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args || tc.function?.arguments || {})
        }
      }));

      // Convert result back to OpenAI format
      const openAIResponse: OpenAI.Chat.Completions.ChatCompletion = {
        id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: this.options.model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response.content as string || '',
              refusal: null,
              tool_calls: formattedToolCalls.length > 0 ? formattedToolCalls : undefined,
            },
            logprobs: null,
            finish_reason: formattedToolCalls.length > 0 ? 'tool_calls' : 'stop',
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };

      console.log(`[LangChain Agent] Tool selection completed, tool calls: ${formattedToolCalls.length}`);
      return openAIResponse;
    } catch (error) {
      console.error('[LangChain Agent] Error in agent completion:', error);
      throw error;
    }
  }

  /**
   * Main completion method that decides between simple and agent completion
   */
  async getCompletion(messages: OpenAIMessage[]): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    console.log('[LangChain Agent] Processing completion request:', {
      provider: this.options.provider,
      model: this.options.model,
      messageCount: messages.length,
      hasTools: this.options.tools && this.options.tools.length > 0,
    });

    try {
      // If we have tools, use agent completion, otherwise use simple completion
      if (this.options.tools && this.options.tools.length > 0) {
        return await this.getAgentCompletion(messages);
      } else {
        return await this.getSimpleCompletion(messages);
      }
    } catch (error) {
      console.error('[LangChain Agent] Error in completion:', error);
      throw error;
    }
  }

  /**
   * Update options (useful for changing models, tools, etc.)
   */
  updateOptions(newOptions: Partial<LangChainAgentOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Reinitialize chat model if provider or model changed
    if (newOptions.provider || newOptions.model || newOptions.apiKeys || newOptions.ollamaConfig) {
      this.initializeChatModel();
    }

    // Reset agent executor if tools or system prompt changed
    if (newOptions.tools || newOptions.systemPrompt) {
      this.agentExecutor = null;
    }

    console.log('[LangChain Agent] Options updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): LangChainAgentOptions {
    return { ...this.options };
  }

  /**
   * Check if the service is properly initialized
   */
  isInitialized(): boolean {
    return this.chatModel !== null;
  }
} 
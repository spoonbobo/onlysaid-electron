import { ipcMain } from 'electron';
import { LangChainServiceFactory } from './factory';
import { LangChainAgentOptions, OpenAIMessage } from './agent';

export function setupLangChainHandlers() {
  console.log('[LangChain] Setting up IPC handlers...');

  // Main LangChain completion handler
  ipcMain.handle('ai:get_completion_langchain', async (event, { messages, options }) => {
    console.log('[LangChain] ai:get_completion_langchain received:', {
      messageCount: messages?.length,
      provider: options?.provider,
      model: options?.model,
      hasTools: options?.tools && options.tools.length > 0,
    });

    try {
      const {
        model,
        temperature = 0.7,
        maxTokens,
        provider,
        apiKeys,
        ollamaConfig,
        tools,
        systemPrompt,
      } = options;

      if (!provider || !model) {
        throw new Error('Provider and model are required for LangChain completion.');
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages array is required and cannot be empty.');
      }

      const langChainOptions: LangChainAgentOptions = {
        model,
        temperature,
        maxTokens,
        provider,
        apiKeys: apiKeys || {},
        ollamaConfig,
        tools,
        systemPrompt,
      };

      // Create or get agent service
      const agentService = LangChainServiceFactory.createAgent(langChainOptions);

      // Get completion
      const completion = await agentService.getCompletion(messages as OpenAIMessage[]);

      return { success: true, completion };
    } catch (error: any) {
      console.error('[LangChain] Error in ai:get_completion_langchain:', error);
      return { success: false, error: error.message };
    }
  });

  // Handler to clear LangChain cache
  ipcMain.handle('langchain:clear_cache', async () => {
    try {
      const cacheSize = LangChainServiceFactory.getCacheSize();
      LangChainServiceFactory.clearCache();
      console.log(`[LangChain] Cleared cache with ${cacheSize} instances`);
      return { success: true, clearedInstances: cacheSize };
    } catch (error: any) {
      console.error('[LangChain] Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  });

  // Handler to get cache info
  ipcMain.handle('langchain:get_cache_info', async () => {
    try {
      const cacheSize = LangChainServiceFactory.getCacheSize();
      return { success: true, cacheSize };
    } catch (error: any) {
      console.error('[LangChain] Error getting cache info:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[LangChain] IPC handlers set up successfully');
} 
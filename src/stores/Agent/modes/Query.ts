import { v4 as uuidv4 } from 'uuid';
import { IChatMessage } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';
import { useKBSettingsStore } from '@/stores/KB/KBSettingStore';
import { OpenAIMessage, OpenAIStreamOptions } from '@/stores/SSE/StreamStore';
import { getAgentFromStore } from '@/utils/agent';

// System prompt for Query Mode
export const queryModeSystemPrompt = (
  user: IUser,
  agent: IUser,
  kbIds: string[],
  queryEngine: string,
  embeddingModel: string
) => {
  let kbInfo = "No specific Knowledge Bases are selected for this query.";
  if (kbIds.length > 0) {
    kbInfo = `You should primarily use the following Knowledge Base(s) for your answer: [${kbIds.join(', ')}].`;
    if (queryEngine) {
      kbInfo += `\nUse the "${queryEngine}" query engine.`;
    }
    if (embeddingModel && embeddingModel !== "none") {
      kbInfo += `\nContextual embeddings were generated using "${embeddingModel}".`;
    }
  }

  return `
  You are ${agent.username}, a specialized assistant for ${user.username}.
  Your task is to answer questions based on the provided chat history and available Knowledge Bases.
  ${kbInfo}
  Analyze the user's latest message in the context of the conversation history.
  Formulate a comprehensive answer using the information from the specified Knowledge Bases.
  If the KBs do not contain relevant information, clearly state that.
  Be concise and informative.
  `;
};


interface ProcessQueryModeAIResponseParams {
  activeChatId: string;
  workspaceId: string;
  userMessageText: string;
  modelId: string;
  provider: OpenAIStreamOptions['provider'];
  agent?: IUser | null;
  currentUser: IUser | null;
  existingMessages: IChatMessage[];
  appendMessage: (chatId: string, message: IChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<IChatMessage>) => Promise<void>;
  setStreamingState: (messageId: string | null, chatId: string | null) => void;
  markStreamAsCompleted: (chatId: string, messageText: string, messageId: string) => void;
  streamChatCompletion: (
    messages: OpenAIMessage[],
    options: OpenAIStreamOptions & {
      kbIds?: string[];
      workspaceId?: string;
      topK?: number;
      preferredLanguage?: string;
      messageIdToProcess?: string;
    }
  ) => Promise<string>;
}

export async function processQueryModeAIResponse({
  activeChatId,
  workspaceId,
  userMessageText,
  modelId,
  provider,
  agent,
  currentUser,
  existingMessages,
  appendMessage,
  updateMessage,
  setStreamingState,
  markStreamAsCompleted,
  streamChatCompletion,
}: ProcessQueryModeAIResponseParams): Promise<{ success: boolean; responseText?: string; assistantMessageId?: string; error?: any }> {
  // Use provided agent or get from store
  const assistantSender = agent || getAgentFromStore();
  const assistantSenderId = assistantSender?.id || "query-assistant";

  if (!assistantSender) {
    console.warn("[QueryMode] No agent available, using fallback ID.");
  }

  const { selectedKbIds, queryEngineLLM, embeddingEngine } = useKBSettingsStore.getState();
  const topK = 5;
  const preferredLanguage = "en";

  const assistantMessage: IChatMessage = {
    id: uuidv4(),
    chat_id: activeChatId,
    sender: assistantSenderId,
    sender_object: assistantSender as IUser,
    text: "",
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    status: "pending",
  };

  appendMessage(activeChatId, assistantMessage);
  setStreamingState(assistantMessage.id, activeChatId);

  try {
    const conversationHistoryForPayload: OpenAIMessage[] = existingMessages.slice(-10).map(msg => {
      const role = msg.sender === currentUser?.id ? "user" : "assistant";
      return { role: role, content: msg.text || "" };
    });

    const messagesArgumentForStream: OpenAIMessage[] = [
      ...conversationHistoryForPayload,
      { role: "user", content: userMessageText }
    ];

    const effectiveModelId = queryEngineLLM || modelId;

    const streamOptions: OpenAIStreamOptions & {
      kbIds?: string[];
      workspaceId?: string;
      topK?: number;
      preferredLanguage?: string;
      messageIdToProcess?: string;
    } = {
      model: effectiveModelId,
      streamId: `stream-${assistantMessage.id}`,
      provider: provider,
      workspaceId: workspaceId,
      messageIdToProcess: assistantMessage.id,
      topK: topK,
      preferredLanguage: preferredLanguage
    };

    if (provider === "onlysaid-kb" && selectedKbIds.length > 0) {
      streamOptions.kbIds = selectedKbIds;
    }

    const responseText = await streamChatCompletion(
      messagesArgumentForStream,
      streamOptions
    );

    await updateMessage(activeChatId, assistantMessage.id, {
      text: responseText || "Completed query.",
      sender: assistantSenderId,
      status: "completed"
    });

    markStreamAsCompleted(activeChatId, responseText || "Completed query.", assistantMessage.id);
    return { success: true, responseText: responseText, assistantMessageId: assistantMessage.id };

  } catch (error: any) {
    console.error("Stream error in QueryMode:", error);
    const isAborted = error.name === 'AbortError' || (error.message && error.message.includes('aborted'));
    const errorText = isAborted ? "Knowledge Base query stopped." : `Sorry, I (Agent: ${assistantSender?.username || assistantSenderId}) encountered an error with the Knowledge Base query.`;

    await updateMessage(activeChatId, assistantMessage.id, {
      text: errorText,
      status: isAborted ? "completed" : "failed"
    });
    markStreamAsCompleted(activeChatId, errorText, assistantMessage.id);
    return { success: false, error, assistantMessageId: assistantMessage.id, responseText: errorText };
  } finally {
    setStreamingState(null, null);
  }
}

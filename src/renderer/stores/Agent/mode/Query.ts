import { v4 as uuidv4 } from 'uuid';
import { IChatMessage } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';
import { useKBSettingsStore } from '@/renderer/stores/KB/KBSettingStore';
import { useThreeStore } from '@/renderer/stores/Avatar/ThreeStore';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { OpenAIMessage, OpenAIStreamOptions } from '@/renderer/stores/Stream/StreamStore';
import { getAgentFromStore } from '@/utils/agent';
import { getQueryModeSystemPrompt } from '../prompts';



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
  
  // NEW: Check if we're in avatar mode and get avatar info
  const topicStore = useTopicStore.getState();
  const isAvatarMode = topicStore.selectedContext?.section === 'workspace:avatar';
  
  let assistantSenderId = assistantSender?.id || "query-assistant";
  let assistantSenderObject = assistantSender as IUser;
  
  if (isAvatarMode) {
    // In avatar mode, use avatar name and create a custom sender object
    const { selectedModel, getModelById } = useThreeStore.getState();
    const currentAvatar = getModelById(selectedModel || 'alice-3d');
    const avatarName = currentAvatar?.name || 'Avatar';
    
    // Create a custom sender object with avatar name
    assistantSenderObject = {
      ...assistantSender,
      id: avatarName.toLowerCase(),
      username: avatarName,
      name: avatarName,
      display_name: avatarName,
      settings: {}
    } as IUser;
    
    assistantSenderId = avatarName.toLowerCase();
  }

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
    sender_object: assistantSenderObject,
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

    // Get system prompt with custom prompt support and avatar name
    let systemPromptText = "";
    if (currentUser && assistantSender) {
      const avatarName = isAvatarMode ? assistantSenderObject.username : undefined;
      systemPromptText = getQueryModeSystemPrompt(
        currentUser,
        assistantSender,
        selectedKbIds,
        queryEngineLLM || "",
        embeddingEngine || "",
        avatarName
      );
    }

    const messagesArgumentForStream: OpenAIMessage[] = [];
    
    // Add system prompt if available
    if (systemPromptText) {
      messagesArgumentForStream.push({ role: "system", content: systemPromptText });
    }

    // Add conversation history
    messagesArgumentForStream.push(...conversationHistoryForPayload);
    
    // Add current user message
    messagesArgumentForStream.push({ role: "user", content: userMessageText });

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

    // Update provider check to include both "lightrag" and "onlysaid-kb"
    if ((provider === "lightrag" || provider === "onlysaid-kb") && selectedKbIds.length > 0) {
      streamOptions.kbIds = selectedKbIds;
    }

    const responseText = await streamChatCompletion(
      messagesArgumentForStream,
      streamOptions
    );

    // Better fallback handling - only use fallback if truly empty
    const finalResponseText = responseText && responseText.trim() ? responseText : "No response received from knowledge base.";

    await updateMessage(activeChatId, assistantMessage.id, {
      text: finalResponseText,
      sender: assistantSenderId,
      sender_object: assistantSenderObject,
      status: "completed"
    });

    markStreamAsCompleted(activeChatId, finalResponseText, assistantMessage.id);
    return { success: true, responseText: finalResponseText, assistantMessageId: assistantMessage.id };

  } catch (error: any) {
    console.error("Stream error in QueryMode:", error);
    const isAborted = error.name === 'AbortError' || (error.message && error.message.includes('aborted'));
    const errorText = isAborted ? "Knowledge Base query stopped." : `Sorry, I (Agent: ${assistantSenderObject?.username || assistantSenderId}) encountered an error with the Knowledge Base query.`;

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

import { v4 as uuidv4 } from 'uuid';
import { IChatMessage } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';
import { OpenAIMessage } from '@/stores/SSE/StreamStore';

export const askModeSystemPrompt = (user: IUser, agent: IUser) => {
  return `
  Your name is ${agent.username} and you are assistant for your companion ${user.username}.

  You and your companion ${user.username} will be hearing messages in chats.
  Your responses should be short, concise, friendly, helpful, and professional.
  Use emojis only when appropriate.

  You will be provided a list of messages in a chat with timestamps as contexts for your references.
  `;
};

interface ProcessAskModeAIResponseParams {
  activeChatId: string;
  userMessageText: string;
  modelId: string;
  provider: string;
  agent: IUser | null;
  currentUser: IUser | null;
  existingMessages: IChatMessage[];
  appendMessage: (chatId: string, message: IChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<IChatMessage>) => Promise<void>;
  setStreamingState: (messageId: string | null, chatId: string | null) => void;
  markStreamAsCompleted: (chatId: string, messageText: string) => void;
  streamChatCompletion: (
    messages: OpenAIMessage[],
    options: { model: string; streamId: string; provider: "openai" | "deepseek" | "ollama" }
  ) => Promise<string>;
}

export async function processAskModeAIResponse({
  activeChatId,
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
}: ProcessAskModeAIResponseParams): Promise<{ success: boolean; responseText?: string; assistantMessageId?: string; error?: any }> {
  const assistantSender = agent;
  const assistantSenderId = agent?.id || "assistant"; // Fallback ID
  if (!agent) {
    console.warn("[AskMode] Agent not found in store, using fallback ID for assistant message sender.");
  }
  let systemPrompt = "";
  if (currentUser && agent) {
    systemPrompt = askModeSystemPrompt(currentUser, agent);
  }

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
    const lastMessages = existingMessages.slice(-10).map(msg => {
      const senderName = msg.sender_object?.username || msg.sender;
      const role = msg.sender === currentUser?.id ? "user" : "assistant";
      if (role === "assistant") {
        return {
          role: role,
          content: msg.text || ""
        };
      }
      return {
        role: role,
        content: `[${msg.created_at}] ${senderName}: ${msg.text || ""}`
      };
    });

    if (systemPrompt) {
      lastMessages.unshift({ role: "system", content: systemPrompt });
    }
    const currentUserName = currentUser?.username || "user";
    lastMessages.push({
      role: "user",
      content: `[${new Date().toISOString()}] ${currentUserName}: ${userMessageText}`
    });
    console.log("lastMessages", lastMessages);

    const response = await streamChatCompletion(
      lastMessages as OpenAIMessage[],
      {
        model: modelId,
        streamId: `stream-${assistantMessage.id}`,
        provider: provider as "openai" | "deepseek" | "ollama"
      }
    );

    await updateMessage(activeChatId, assistantMessage.id, {
      text: response,
      sender: assistantSenderId, // Ensure sender is updated if it was a fallback
      status: "completed"
    });

    markStreamAsCompleted(activeChatId, response);
    return { success: true, responseText: response, assistantMessageId: assistantMessage.id };
  } catch (error) {
    console.error("Stream error in AskMode:", error);
    await updateMessage(activeChatId, assistantMessage.id, {
      text: "Error generating response. Please try again.",
      status: "failed"
    });
    markStreamAsCompleted(activeChatId, "Error generating response.");
    return { success: false, error, assistantMessageId: assistantMessage.id };
  }
}

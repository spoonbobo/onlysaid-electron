import { v4 as uuidv4 } from 'uuid';
import { IChatMessage } from '@/../../types/Chat/Message';
import { IUser } from '@/../../types/User/User';
import { OpenAIMessage } from '@/renderer/stores/Stream/StreamStore';
import { useThreeStore } from '@/renderer/stores/Avatar/ThreeStore';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';
import { getAgentFromStore } from '@/utils/agent';
import { getAskModeSystemPrompt, getToolSummarySystemPrompt } from '../prompts';



interface ProcessAskModeAIResponseParams {
  activeChatId: string;
  userMessageText: string;
  modelId: string;
  provider: string;
  agent?: IUser | null;
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
  // Optional file content for copilot mode
  fileContent?: string;
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
  fileContent,
}: ProcessAskModeAIResponseParams): Promise<{ success: boolean; responseText?: string; assistantMessageId?: string; error?: any }> {
  // Use provided agent or get from store
  const assistantSender = agent || getAgentFromStore();
  
  // NEW: Check if we're in avatar mode and get avatar info
  const topicStore = useTopicStore.getState();
  const isAvatarMode = topicStore.selectedContext?.section === 'workspace:avatar';
  
  let assistantSenderId = assistantSender?.id || "assistant";
  let assistantSenderObject = assistantSender as IUser;
  
  if (isAvatarMode) {
    // In avatar mode, use avatar name and create a custom sender object
    const { selectedModel, getModelById } = useThreeStore.getState();
    const currentAvatar = getModelById(selectedModel || 'alice-3d');
    const avatarName = currentAvatar?.name || 'Avatar';
    
    // Create a custom sender object with avatar name
    assistantSenderObject = {
      ...assistantSender,
      id: avatarName.toLowerCase(), // Use avatar name as ID
      username: avatarName,
      name: avatarName,
      display_name: avatarName
    } as IUser;
    
    assistantSenderId = avatarName.toLowerCase();
  }

  if (!assistantSender) {
    console.warn("[AskMode] No agent available, using fallback ID for assistant message sender.");
  }

  let systemPrompt = "";
  if (currentUser && assistantSender) {
    const avatarName = isAvatarMode ? assistantSenderObject.username : undefined;
    
    // Check if we're in copilot mode and extract file information
    const isCopilotMode = topicStore.selectedContext?.section === 'local:copilot';
    let fileName: string | undefined;
    let fileExtension: string | undefined;
    let actualFileContent: string | undefined;
    
    if (isCopilotMode) {
      const { currentDocument, currentFileContent } = useCopilotStore.getState();
      if (currentDocument) {
        fileName = currentDocument.name;
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex > 0) {
          fileExtension = fileName.substring(lastDotIndex + 1);
        }
      }
      actualFileContent = currentFileContent || undefined;
      

    }
    
    systemPrompt = getAskModeSystemPrompt(
      currentUser, 
      assistantSender, 
      avatarName, 
      actualFileContent,
      fileName,
      fileExtension
    );
    

  }

  const assistantMessage: IChatMessage = {
    id: uuidv4(),
    chat_id: activeChatId,
    sender: assistantSenderId,
    sender_object: assistantSenderObject,
    text: "",
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    status: "pending",
    reactions: [],
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
      sender: assistantSenderId,
      sender_object: assistantSenderObject,
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

// New function to summarize tool call results
export async function summarizeToolCallResults({
  activeChatId,
  toolCallResults,
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
}: {
  activeChatId: string;
  toolCallResults: Array<{
    toolName: string;
    result: any;
    executionTime?: number;
    status: string;
  }>;
  modelId: string;
  provider: string;
  agent?: IUser | null;
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
}): Promise<{ success: boolean; responseText?: string; assistantMessageId?: string; error?: any }> {
  const assistantSender = agent || getAgentFromStore();
  const assistantSenderId = assistantSender?.id || "assistant";

  if (!assistantSender) {
    console.warn("[AskMode] No agent available for tool result summarization.");
  }

  const systemPrompt = getToolSummarySystemPrompt(
    assistantSender?.username || 'Assistant',
    currentUser?.username || 'the user'
  );

  const assistantMessage: IChatMessage = {
    id: uuidv4(),
    chat_id: activeChatId,
    sender: assistantSenderId,
    sender_object: assistantSender as IUser,
    text: "",
    created_at: new Date().toISOString(),
    sent_at: new Date().toISOString(),
    status: "pending",
    reactions: [],
  };

  appendMessage(activeChatId, assistantMessage);
  setStreamingState(assistantMessage.id, activeChatId);

  try {
    // Format tool results for the prompt
    const toolResultsSummary = toolCallResults.map(result => {
      const timeInfo = result.executionTime ? ` (completed in ${result.executionTime}s)` : '';
      const statusInfo = result.status === 'executed' ? 'Successfully executed' : 'Failed to execute';

      return `
Tool: ${result.toolName}${timeInfo}
Status: ${statusInfo}
Result: ${JSON.stringify(result.result, null, 2)}
`;
    }).join('\n---\n');

    const messages: OpenAIMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Please summarize the following tool execution results:\n\n${toolResultsSummary}\n\nProvide a clear, helpful summary of what was accomplished.`
      }
    ];

    const response = await streamChatCompletion(
      messages,
      {
        model: modelId,
        streamId: `stream-${assistantMessage.id}`,
        provider: provider as "openai" | "deepseek" | "ollama"
      }
    );

    await updateMessage(activeChatId, assistantMessage.id, {
      text: response,
      sender: assistantSenderId,
      status: "completed"
    });

    markStreamAsCompleted(activeChatId, response);
    return { success: true, responseText: response, assistantMessageId: assistantMessage.id };
  } catch (error) {
    console.error("Error summarizing tool results:", error);
    await updateMessage(activeChatId, assistantMessage.id, {
      text: "Error summarizing tool results. Please try again.",
      status: "failed"
    });
    markStreamAsCompleted(activeChatId, "Error summarizing tool results.");
    return { success: false, error, assistantMessageId: assistantMessage.id };
  }
}

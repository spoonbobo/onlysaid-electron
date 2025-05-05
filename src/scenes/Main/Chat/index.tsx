import { Box } from "@mui/material";
import { useEffect, useRef, useCallback, useState } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage } from "@/models/Chat/Message";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { getUserFromStore } from "@/utils/user";
import { IUser } from "@/models/User/User";
import { IFile } from "@/models/File/File";
import { useSelectedModelStore } from "@/stores/LLM/SelectedModelStore";
import { useStreamStore } from "@/stores/SSE/StreamStore";
import { DeepSeekUser } from "@/stores/Chat/chatStore";
import { v4 as uuidv4 } from 'uuid';
type SectionName = 'Friends' | 'Agents';

function Chat() {
  const { selectedContext, selectedTopics, parentId, replyingToId, setReplyingTo } = useCurrentTopicContext();
  const { tabs } = useWindowStore();

  // Get the parent window/tab
  const parentTab = tabs.find(tab => tab.id === parentId);
  const tabId = parentId || '';

  const {
    activeRoomByTab,
    messages: storeMessages,
    sendMessage,
    setActiveChat,
    fetchMessages,
    getInput,
    setInput,
    appendMessage,
    updateMessage
  } = useChatStore();

  const { modelId, provider, modelName } = useSelectedModelStore();
  const { streamChatCompletion } = useStreamStore();

  const activeRoomId = activeRoomByTab[tabId] || null;
  const input = getInput(activeRoomId || '', tabId);

  const activeSection = Object.keys(selectedTopics).find(
    section => selectedTopics[section] === activeRoomId
  ) as SectionName | undefined;

  const activeTopic = activeSection ? selectedTopics[activeSection] : null;

  const messages = storeMessages[activeRoomId || ''] || [];
  const replyingToMessage = replyingToId ? messages.find(m => m.id === replyingToId) || null : null;

  // Add state for tracking streaming
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTopic && activeTopic !== activeRoomId) {
      setActiveChat(activeTopic, tabId);
    }
  }, [activeTopic, activeRoomId, setActiveChat, tabId]);

  // Fetch messages when active room changes
  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
    }
  }, [activeRoomId, fetchMessages]);

  // Only clear reply state when explicitly needed (not when switching tabs)
  const previousActiveRoomIdRef = useRef<string | null>(null);
  const previousTabIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Only clear reply state when changing rooms within the same tab
    if (activeRoomId && previousActiveRoomIdRef.current &&
      activeRoomId !== previousActiveRoomIdRef.current &&
      tabId === previousTabIdRef.current) {
      setReplyingTo(null);
    }

    previousActiveRoomIdRef.current = activeRoomId;
    previousTabIdRef.current = tabId;
  }, [activeRoomId, tabId, setReplyingTo]);

  const handleReply = (message: IChatMessage) => {
    setReplyingTo(message.id);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSend = async (messageData: Partial<IChatMessage>) => {
    if (
      (messageData.text?.trim() || messageData.files)
      && activeRoomId
    ) {
      try {
        messageData.created_at = new Date().toISOString();

        // Add reply_to if replying to a message
        if (replyingToId) {
          messageData.reply_to = replyingToId;
        }

        const fileIds = messageData.files?.map(file => file.id);
        messageData.files = fileIds as unknown as IFile[];
        console.log(messageData.files);

        const messageId = await sendMessage(activeRoomId, messageData);

        if (messageId) {
          // Create the full message object
          const currentUser = getUserFromStore();
          const newMessage: IChatMessage = {
            id: messageId as string,
            room_id: activeRoomId,
            sender: currentUser?.id || "",
            text: messageData.text || "",
            created_at: messageData.created_at,
            sender_object: currentUser as IUser,
            reply_to: replyingToId || undefined,
            files: messageData.files
          };

          // Add directly to the state instead of refetching
          console.log("newMessage", newMessage);
          appendMessage(activeRoomId, newMessage);

          // Clear input and reply state
          setInput(activeRoomId, '', tabId);
          setReplyingTo(null);

          // Add AI response with streaming if model is selected
          if (modelId && provider && messageData.text) {
            // Create assistant message
            const assistantMessage: IChatMessage = {
              id: uuidv4(),
              room_id: activeRoomId,
              sender: DeepSeekUser?.id || "",
              sender_object: DeepSeekUser,
              text: "",
              created_at: new Date().toISOString(),
            };

            appendMessage(activeRoomId, assistantMessage);

            // Set streaming ID - use the actual message ID
            setStreamingMessageId(assistantMessage.id);

            console.log("streaming", modelId, provider, assistantMessage.id);
            try {
              // Start streaming
              const response = await streamChatCompletion(
                [{ role: "user", content: messageData.text }],
                {
                  model: modelId,
                  streamId: `stream-${assistantMessage.id}`,
                  provider: provider
                }
              );

              // Update message with full response
              updateMessage(activeRoomId, assistantMessage.id, { text: response });
            } catch (error) {
              console.error("Stream error:", error);
              updateMessage(activeRoomId, assistantMessage.id, {
                text: "Error generating response. Please try again."
              });
            } finally {
              setStreamingMessageId(null);
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleInputChange = (newInput: string) => {
    setInput(activeRoomId || '', newInput, tabId);
  };

  // Create a unique instance key for this chat component
  const chatInstanceKey = tabId || "no-parent";

  // Add these refs to the parent component
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add a scroll handler to the parent
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  // Add effect to scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  return (
    <Box
      key={chatInstanceKey}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      <ChatHeader
        selectedContext={selectedContext}
        selectedGroup={activeSection}
        selectedTopic={activeTopic}
        parentTab={parentTab}
      />
      <Box
        sx={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0
        }}
      >
        <ChatUI
          messages={messages}
          onReply={handleReply}
          streamingMessageId={streamingMessageId}
        />
      </Box>
      <ChatInput
        input={input}
        setInput={handleInputChange}
        handleSend={handleSend}
        replyingTo={replyingToMessage}
        onCancelReply={handleCancelReply}
      />
    </Box>
  );
}

export default Chat;
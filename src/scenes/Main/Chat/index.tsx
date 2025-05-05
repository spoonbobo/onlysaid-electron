import { Box } from "@mui/material";
import { useEffect, useRef, useCallback } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage } from "@/models/Chat/Message";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { getUserFromStore } from "@/utils/user";
import { IUser } from "@/models/User/User";

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
    appendMessage
  } = useChatStore();

  const activeRoomId = activeRoomByTab[tabId] || null;
  const input = getInput(activeRoomId || '', tabId);

  const activeSection = Object.keys(selectedTopics).find(
    section => selectedTopics[section] === activeRoomId
  ) as SectionName | undefined;

  const activeTopic = activeSection ? selectedTopics[activeSection] : null;

  const messages = storeMessages[activeRoomId || ''] || [];
  const replyingToMessage = replyingToId ? messages.find(m => m.id === replyingToId) || null : null;

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

  // Clear reply state when changing rooms
  useEffect(() => {
    setReplyingTo(null);
  }, [activeRoomId, setReplyingTo]);

  const handleReply = (message: IChatMessage) => {
    setReplyingTo(message.id);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSend = async (messageData: Partial<IChatMessage>) => {
    if (
      (messageData.text?.trim() || messageData.image || messageData.video || messageData.audio)
      && activeRoomId
    ) {
      try {
        messageData.created_at = new Date().toISOString();

        // Add reply_to if replying to a message
        if (replyingToId) {
          messageData.reply_to = replyingToId;
        }

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
            reply_to: replyingToId || undefined
          };

          // Add directly to the state instead of refetching
          appendMessage(activeRoomId, newMessage);

          // Clear input and reply state
          setInput(activeRoomId, '', tabId);
          setReplyingTo(null);
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
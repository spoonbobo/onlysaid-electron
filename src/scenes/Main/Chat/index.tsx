import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage } from "@/models/Chat/Message";
import { useChatStore } from "@/stores/Chat/chatStore";

type SectionName = 'Friends' | 'Agents';

function Chat() {
  const [input, setInput] = useState("");
  const { selectedContext, selectedTopics } = useCurrentTopicContext();
  const {
    activeRoomId,
    messages: storeMessages,
    sendMessage,
    setActiveChat,
    fetchMessages
  } = useChatStore();

  const activeSection = Object.keys(selectedTopics).find(
    section => selectedTopics[section] === activeRoomId
  ) as SectionName | undefined;

  const activeTopic = activeSection ? selectedTopics[activeSection] : null;

  const messages = storeMessages[activeRoomId || ''] || [];

  useEffect(() => {
    if (activeTopic && activeTopic !== activeRoomId) {
      setActiveChat(activeTopic);
    }
  }, [activeTopic, activeRoomId, setActiveChat]);

  // Fetch messages when active room changes
  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
    }
  }, [activeRoomId, fetchMessages]);

  const handleSend = async (messageData: Partial<IChatMessage>) => {
    if ((messageData.text?.trim() || messageData.image || messageData.video || messageData.audio) && activeRoomId) {
      messageData.created_at = new Date().toISOString();
      await sendMessage(activeRoomId, messageData);

      // Refresh messages after sending
      fetchMessages(activeRoomId);

      setInput("");
    }
  };

  return (
    <Box sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <ChatHeader
        selectedContext={selectedContext}
        selectedGroup={activeSection}
        selectedTopic={activeTopic}
      />
      <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <ChatUI messages={messages} />
      </Box>
      <ChatInput input={input} setInput={setInput} handleSend={handleSend} />
    </Box>
  );
}

export default Chat;
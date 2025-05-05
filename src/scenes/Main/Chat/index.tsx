import { Box } from "@mui/material";
import { useEffect } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage } from "@/models/Chat/Message";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";

type SectionName = 'Friends' | 'Agents';

function Chat() {
  const { selectedContext, selectedTopics, parentId } = useCurrentTopicContext();
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
    setInput
  } = useChatStore();

  const activeRoomId = activeRoomByTab[tabId] || null;
  const input = getInput(activeRoomId || '', tabId);

  const activeSection = Object.keys(selectedTopics).find(
    section => selectedTopics[section] === activeRoomId
  ) as SectionName | undefined;

  const activeTopic = activeSection ? selectedTopics[activeSection] : null;

  const messages = storeMessages[activeRoomId || ''] || [];

  // Log the full hierarchy for debugging
  // console.log(`Window: ${parentTab?.title} > Context: ${selectedContext?.name} > Section: ${activeSection} > Topic: ${activeTopic}`);

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

  const handleSend = async (messageData: Partial<IChatMessage>) => {
    if ((messageData.text?.trim() || messageData.image || messageData.video || messageData.audio) && activeRoomId) {
      messageData.created_at = new Date().toISOString();
      await sendMessage(activeRoomId, messageData);

      // Refresh messages after sending
      fetchMessages(activeRoomId);

      setInput(activeRoomId, '', tabId);
    }
  };

  const handleInputChange = (newInput: string) => {
    setInput(activeRoomId || '', newInput, tabId);
  };

  // Create a unique instance key for this chat component
  const chatInstanceKey = tabId || "no-parent";

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
      <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <ChatUI messages={messages} />
      </Box>
      <ChatInput input={input} setInput={handleInputChange} handleSend={handleSend} />
    </Box>
  );
}

export default Chat;
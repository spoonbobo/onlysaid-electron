import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useCurrentTopicContext } from "../../../stores/Topic/TopicStore";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage } from "../../../models/Chat/Message";
import { getRooms } from '../../../service/chat';

function Chatroom() {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [input, setInput] = useState("");
  const { selectedTopics } = useCurrentTopicContext();

  useEffect(() => {
    const chatService = getRooms(['room1', 'room2'], 'token', 'cookieName')

    // Example with dummy room IDs
    getRooms(['room1', 'room2'], 'token', 'cookieName')
      .then(rooms => {
        // Process rooms data
      })
      .catch(error => {
        console.error('Failed to fetch rooms:', error);
      });
  }, []);

  // Find the first selected group and topic (if any)
  const selectedGroup = Object.keys(selectedTopics).find(
    (group) => selectedTopics[group]
  );
  const selectedTopic = selectedGroup ? selectedTopics[selectedGroup] : null;

  const handleSend = () => {
    if (input.trim()) {
      setMessages([
        ...messages,
        {
          id: (messages.length + 1).toString(),
          content: input,
          created_at: new Date().toISOString(),
          sender: "You",
          avatar: "",
          room_id: "",
        },
      ]);
      setInput("");
    }
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ChatHeader selectedGroup={selectedGroup} selectedTopic={selectedTopic} />
      <ChatUI messages={messages} />
      <ChatInput input={input} setInput={setInput} handleSend={handleSend} />
    </Box>
  );
}

export default Chatroom;

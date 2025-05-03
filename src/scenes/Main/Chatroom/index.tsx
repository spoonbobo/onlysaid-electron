import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage } from "@/models/Chat/Message";
import { toast } from "@/utils/toast";

function Chatroom() {
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [input, setInput] = useState("");
  const { selectedTopics } = useCurrentTopicContext();

  useEffect(() => {
    const fetchRooms = async () => {
      const rooms = await window.electron.chatroom.get({
        roomIds: ['room1', 'room2'],
        token: 'token',
        cookieName: 'cookieName'
      })
      if (rooms.error) {
        toast.error(`Error fetching rooms: ${rooms.error}`, 1000);
      }
    }

    fetchRooms();
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
    <Box sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <ChatHeader selectedGroup={selectedGroup} selectedTopic={selectedTopic} />
      <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <ChatUI messages={messages} />
      </Box>
      <ChatInput input={input} setInput={setInput} handleSend={handleSend} />
    </Box>
  );
}

export default Chatroom;

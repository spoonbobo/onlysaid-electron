import { Box, Typography } from "@mui/material";
import { useChatStore } from "@/stores/Chat/chatStore";

interface ChatHeaderProps {
  selectedContext: { name: string; type: string } | null;
  selectedGroup: string | undefined;
  selectedTopic: string | null;
}

function ChatHeader({ selectedContext, selectedGroup, selectedTopic }: ChatHeaderProps) {
  // Get chat name from store
  const rooms = useChatStore(state => state.rooms);
  const chatRoom = rooms.find(room => room.id === selectedTopic);
  const chatName = chatRoom?.name || selectedTopic;

  return (
    <Box sx={{
      px: 2,
      py: 1.5,
      height: "auto", // TODO: replace with static design system
      borderBottom: 1,
      borderColor: "divider",
      display: "flex",
      alignItems: "center"
    }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
        {selectedContext && selectedGroup && selectedTopic
          ? `# ${selectedContext.name} / ${selectedGroup} / ${chatName}`
          : "# No chat selected"}
      </Typography>
    </Box>
  );
}

export default ChatHeader;

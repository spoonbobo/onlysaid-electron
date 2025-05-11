import { Box, Typography, Stack } from "@mui/material";
import { useChatStore } from "@/stores/Chat/ChatStore";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { useIntl } from "react-intl";

function ChatHeader() {
  const { selectedContext, selectedTopics } = useCurrentTopicContext();
  const headerKey = selectedContext ? `${selectedContext.type}-${selectedContext.name}` : "no-context";
  const chats = useChatStore(state => state.chats);

  const selectedGroup = Object.keys(selectedTopics).find(section => selectedTopics[section]);
  const selectedTopic = selectedGroup ? selectedTopics[selectedGroup] : null;

  const chat = chats.find(chat => chat.id === selectedTopic);
  const chatName = chat?.name || selectedTopic;
  const intl = useIntl();

  return (
    <Box
      key={headerKey}
      sx={{
        px: 2,
        py: 1.5,
        height: "auto",
        display: "flex",
        alignItems: "flex-start"
      }}
    >
      {selectedContext && selectedGroup && selectedTopic ? (
        <Stack direction="column" spacing={0.5}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {intl.formatMessage({ id: `${selectedContext.type}.${selectedGroup}`, defaultMessage: selectedContext.type })}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {chatName}
          </Typography>
        </Stack>
      ) : (
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          {intl.formatMessage({ id: "chat.noChatSelected", defaultMessage: "No chat selected" })}
        </Typography>
      )}
    </Box>
  );
}

export default ChatHeader;

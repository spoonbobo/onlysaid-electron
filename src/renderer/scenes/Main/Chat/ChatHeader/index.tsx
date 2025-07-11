import { Box, Typography, Stack } from "@mui/material";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useThreeStore } from "@/renderer/stores/Avatar/ThreeStore";
import { useIntl } from "react-intl";

function ChatHeader() {
  const { selectedContext, selectedTopics } = useCurrentTopicContext();
  const headerKey = selectedContext ? `${selectedContext.type}-${selectedContext.name}` : "no-context";
  const chats = useChatStore(state => state.chats);
  const { selectedModel, getModelById } = useThreeStore();

  const selectedGroup = selectedContext?.section ||
    Object.keys(selectedTopics).find(section => selectedTopics[section]);
  const selectedTopic = selectedGroup ? selectedTopics[selectedGroup] : null;

  // Check if we're in avatar mode
  const isAvatarMode = selectedContext?.section === 'workspace:avatar';

  // Only find chat if selectedTopic exists and is not empty
  const chat = selectedTopic ? chats.find(chat => chat.id === selectedTopic) : null;
  const chatName = chat?.name || selectedTopic;
  const intl = useIntl();

  // Get current avatar name for avatar mode
  const currentAvatar = getModelById(selectedModel || 'alice-3d');
  const avatarName = currentAvatar?.name || 'Avatar';

  return (
    <Box
      key={headerKey}
      sx={{
        height: "auto",
        display: "flex",
        alignItems: "flex-start"
      }}
    >
      {isAvatarMode ? (
        // Special header for avatar mode
        <Stack direction="column" spacing={0.5}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Avatar Chat
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Chat with {avatarName}
          </Typography>
        </Stack>
      ) : selectedContext && selectedGroup && selectedTopic && chat ? (
        // Regular workspace/home chat header
        <Stack direction="column" spacing={0.5}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {intl.formatMessage({ id: `${selectedContext.type}.${selectedGroup}`, defaultMessage: selectedContext.type })}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            {chatName}
          </Typography>
        </Stack>
      ) : (
        // No chat selected
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          {intl.formatMessage({ id: "chat.noChatSelected", defaultMessage: "No chat selected" })}
        </Typography>
      )}
    </Box>
  );
}

export default ChatHeader;

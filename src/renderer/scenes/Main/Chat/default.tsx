import { Box, Typography, Stack, Button } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AddCommentIcon from "@mui/icons-material/AddComment";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { getUserFromStore, isGuestUser } from "@/utils/user";

function ChatUIWithNoChat() {
  const intl = useIntl();
  const { selectedContext, setSelectedTopic } = useCurrentTopicContext();
  const { createChat, setActiveChat } = useChatStore();

  const currentUser = getUserFromStore();
  const isGuest = isGuestUser();

  const handleCreateNewChat = async () => {
    if (!currentUser) return;

    // Handle workspace chat creation (for logged-in users)
    if (selectedContext?.type === "workspace" && selectedContext?.id && !isGuest) {
      const workspaceId = selectedContext.id;
      const newChat = await createChat(currentUser.id || "", "workspace", workspaceId);

      if (newChat?.id) {
        const section = selectedContext.section || 'workspace:chatroom';
        setSelectedTopic(section, newChat.id);
        setActiveChat(newChat.id, `${selectedContext.name}:${selectedContext.type}`);
      }
    }
    // Handle agent chat creation (for both guest and logged-in users in home context)
    else if (selectedContext?.type === "home" || isGuest) {
      // For home context or guest users, create an agent chat
      const newChat = await createChat(currentUser.id || "", "agent");

      if (newChat?.id) {
        const section = selectedContext?.section || 'agents';
        setSelectedTopic(section, newChat.id);
        setActiveChat(newChat.id, `${selectedContext?.name || 'home'}:${selectedContext?.type || 'home'}`);
      }
    }
  };

  // Determine what type of chat we're creating
  const isWorkspaceContext = selectedContext?.type === "workspace" && !isGuest;
  const isHomeOrGuestContext = selectedContext?.type === "home" || isGuest;

  // Don't show create button if we can't determine the context
  const canCreateChat = isWorkspaceContext || isHomeOrGuestContext;

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 4,
        color: "text.secondary",
      }}
    >
      <Stack spacing={3} alignItems="center" sx={{ maxWidth: 400 }}>
        <ChatBubbleOutlineIcon 
          sx={{ 
            fontSize: 64, 
            color: "text.disabled",
            opacity: 0.5 
          }} 
        />
        
        <Stack spacing={1} alignItems="center">
          <Typography variant="h6" color="text.primary">
            <FormattedMessage 
              id="chat.noChat.title" 
              defaultMessage="No chat selected" 
            />
          </Typography>
          
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {isGuest ? (
              <FormattedMessage 
                id="chat.noChat.description.guest" 
                defaultMessage="Create a new chat to start a conversation with your local AI assistant" 
              />
            ) : isWorkspaceContext ? (
              <FormattedMessage 
                id="chat.noChat.description" 
                defaultMessage="Select a chat from the sidebar or create a new one to get started" 
              />
            ) : (
              <FormattedMessage 
                id="chat.noChat.description.agent" 
                defaultMessage="Create a new chat to start a conversation with an AI agent" 
              />
            )}
          </Typography>
        </Stack>

        {canCreateChat && (
          <Button
            variant="contained"
            startIcon={isWorkspaceContext ? <AddCommentIcon /> : <SmartToyIcon />}
            onClick={handleCreateNewChat}
            sx={{ mt: 2 }}
          >
            {isWorkspaceContext ? (
              <FormattedMessage 
                id="chat.noChat.createNew" 
                defaultMessage="Create New Chat" 
              />
            ) : (
              <FormattedMessage 
                id="chat.noChat.createNewAgent" 
                defaultMessage="Start AI Chat" 
              />
            )}
          </Button>
        )}

        {isGuest && (
          <Typography variant="caption" sx={{ opacity: 0.6, mt: 1 }}>
            <FormattedMessage 
              id="chat.noChat.guestNote" 
              defaultMessage="You're in guest mode - chats are stored locally" 
            />
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export default ChatUIWithNoChat;

import { Box } from "@mui/material";
import { useAvatarStore } from "@/renderer/stores/Avatar/AvatarStore";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useThreeStore } from "@/renderer/stores/Avatar/ThreeStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useEffect } from "react";
import AvatarDisplay from "./Display";
import AvatarDesign from "./Design";
import AvatarVoice from "./Voice";

function Avatar() {
  const { selectedContext, selectedTopics } = useCurrentTopicContext();
  const { 
    initializeWorkspaceAvatar
  } = useAvatarStore();
  
  const { setSelectedModel, getModelById } = useThreeStore();
  const { chats } = useChatStore();

  // Get the current selection from the topic store
  const currentSelection = selectedContext?.section ? selectedTopics[selectedContext.section] || '' : '';
  const [selectionType, selectionId] = currentSelection.split(':');
  
  // Force re-render when context changes
  const contextKey = `${selectedContext?.type}-${selectedContext?.section}-${selectedContext?.id}`;

  const workspaceId = selectedContext?.id;

  // Get avatar name for the chat type
  const currentAvatar = getModelById('alice-3d'); // Always Alice as per requirement
  const avatarName = currentAvatar?.name || 'Alice';
  const avatarChatType = `${workspaceId}:${avatarName.toLowerCase()}`;

  // Initialize workspace avatar when component mounts or workspace changes
  useEffect(() => {
    if (workspaceId) {
      initializeWorkspaceAvatar(workspaceId);
    }
  }, [workspaceId, initializeWorkspaceAvatar]);
  
  // Set default avatar model - always use Alice as the single avatar per workspace
  useEffect(() => {
    if (selectedContext?.section === 'workspace:avatar') {
      setSelectedModel('alice-3d');
    }
  }, [setSelectedModel, selectedContext?.section]);

  // Check if current selection is a chat ID with the correct avatar chat type
  const isSelectedChat = currentSelection && !selectionType && 
    chats.some(chat => chat.id === currentSelection && chat.type === avatarChatType && !chat.workspace_id);

  // Determine what to render based on the current selection
  const renderContent = () => {
    // If a chat is selected, always show the avatar display with chat
    if (isSelectedChat) {
      return <AvatarDisplay />;
    }

    // Design interface for appearance
    if (selectionType === 'design' && selectionId === 'appearance') {
      return <AvatarDesign />;
    }
    
    // Voice settings
    if (selectionType === 'design' && selectionId === 'voice') {
      return <AvatarVoice />;
    }
    
    // Default: Show the avatar display directly
    return <AvatarDisplay />;
  };

  return (
    <Box key={contextKey} sx={{ height: "100%", overflow: "auto" }}>
      {renderContent()}
    </Box>
  );
}

export default Avatar;

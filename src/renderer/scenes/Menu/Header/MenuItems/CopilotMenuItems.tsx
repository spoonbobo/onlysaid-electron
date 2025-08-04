import React from 'react';
import { MenuItem, IconButton, Tooltip, Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { Add as AddIcon } from "@mui/icons-material";
import CopilotMenu from "@/renderer/scenes/Menu/Copilot";
import { useCopilotStore } from "@/renderer/stores/Copilot/CopilotStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { getUserFromStore } from "@/utils/user";

interface CopilotMenuItemsProps {
  handleClose: () => void;
}

export default function CopilotMenuItems({ handleClose }: CopilotMenuItemsProps) {
  // For copilot, we don't need a complex dropdown menu since the main content
  // is already shown in the sidebar. Return empty menu to avoid duplication.
  return null;
}

export const RenderCopilotActions = ({
  selectedSection,
  handleAction
}: {
  selectedSection: string | null,
  handleAction?: (action: string) => void
}) => {
  const { currentDocument } = useCopilotStore();
  const { createChat, updateChat } = useChatStore();
  const { setSelectedTopic } = useTopicStore();
  const { selectedContext } = useCurrentTopicContext();

  const handleCreateCopilotChat = async () => {
    const user = getUserFromStore();
    if (!user || !user.id) return;

    const documentName = currentDocument?.name || 'Document';
    const chatName = `Copilot: ${documentName}`;
    
    try {
      const newChat = await createChat(
        user.id,
        'copilot', // Chat type
        undefined // No workspace for copilot chats
      );

      if (newChat && selectedContext?.section) {
        // Update chat name to include document name
        await updateChat(newChat.id, { name: chatName }, true);
        
        // Select the new chat
        setSelectedTopic(selectedContext.section, newChat.id);
      }
    } catch (error) {
      console.error('Error creating copilot chat:', error);
    }
    
    handleAction?.('newCopilotChat');
  };

  if (!selectedSection || selectedSection !== 'copilot') {
    return null;
  }

  return (
    <Box sx={{
      display: 'flex',
      py: 0.5,
      px: 2,
      minHeight: '32px',
      backgroundColor: 'inherit',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <Tooltip title={<FormattedMessage id="menu.copilot.newChat" defaultMessage="New Copilot Chat" />}>
        <IconButton
          size="small"
          onClick={handleCreateCopilotChat}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

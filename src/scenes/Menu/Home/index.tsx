import { Box, IconButton, Menu, MenuItem } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useChatStore } from "@/stores/Chat/ChatStore";
import MenuListItem from "@/components/Navigation/MenuListItem";
import ChatUpdate from '@/components/Dialog/ChatUpdate';
import { IChatRoom } from '@/../../types/Chat/Chatroom';
import { getUserFromStore } from "@/utils/user";

export default function HomeMenu() {
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);
  const chats = useChatStore((state) => state.chats);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const deleteChat = useChatStore((state) => state.deleteChat);

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [chatUpdateOpen, setChatUpdateOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<IChatRoom | null>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const activeSection = selectedContext?.type === 'home'
    ? selectedContext.section || 'agents'
    : null;

  const selectedSubcategory = activeSection ? selectedTopics[activeSection] || '' : '';

  const getContextId = () => {
    if (!selectedContext) return '';
    return `${selectedContext.name}:${selectedContext.type}`;
  };

  const handleSelectChat = (section: string, chatId: string) => {
    setSelectedTopic(section, chatId);
    setActiveChat(chatId, getContextId());
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>, chatId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedChatId(chatId);

    const chat = chats.find(c => c.id === chatId) || null;
    setSelectedChat(chat);

    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  const handleDeleteChat = (id?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const chatIdToDelete = id || selectedChatId;
    if (chatIdToDelete) {
      deleteChat(chatIdToDelete);
    }
    handleCloseMenu();
  };

  const handleRenameChat = (chat: IChatRoom | null) => {
    if (!chat) return;
    setSelectedChat(chat);
    setChatUpdateOpen(true);
    handleCloseMenu();
  };

  useEffect(() => {
    const user = getUserFromStore();
    if (user?.id) {
      useChatStore.getState().getChat(user.id, 'agent').then(() => {
        if (activeSection === 'agents' && selectedSubcategory) {
          const chats = useChatStore.getState().chats;
          const chatIds = chats.filter(chat => chat.type === 'agent').map(chat => chat.id);
          if (!chatIds.includes(selectedSubcategory)) {
            useTopicStore.getState().clearSelectedTopic('agents');
          }
        }
      });
    }
  }, [activeSection, selectedSubcategory]);

  try {
    return (
      <Box sx={{ mt: 2, px: 2 }}>
        {activeSection === 'agents' && (
          <Box sx={{ mt: 2 }}>
            {chats
              .filter(chat => chat.type === 'agent')
              .map((chat) => (
                <MenuListItem
                  key={chat.id}
                  label={chat.name}
                  isSelected={selectedSubcategory === chat.id}
                  onClick={() => handleSelectChat('agents', chat.id)}
                  onContextMenu={(e) => handleContextMenu(e, chat.id)}
                  endIcon={
                    <IconButton
                      size="small"
                      sx={{
                        p: 0.25,
                        opacity: 0,
                        '&:hover': { opacity: 1 },
                        '.MuiListItemButton-root:hover &': { opacity: 1 }
                      }}
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  }
                  sx={{ pl: 4 }}
                />
              ))}
            {chats.filter(chat => chat.type === 'agent').length === 0 && (
              <Box sx={{ pl: 4, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                <FormattedMessage id="home.noAgents" defaultMessage="No agents found" />
              </Box>
            )}
          </Box>
        )}

        {activeSection === 'friends' && (
          <Box sx={{ mt: 2, pl: 4, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
            <FormattedMessage id="home.noFriends" defaultMessage="No friends found" />
          </Box>
        )}

        <Menu
          anchorEl={menuAnchorEl}
          open={menuOpen}
          onClose={handleCloseMenu}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={() => {
            const chat = chats.find(c => c.id === selectedChatId) || null;
            handleRenameChat(chat);
          }} sx={{ minHeight: 36, fontSize: 14 }}>
            <FormattedMessage id="menu.chat.rename" defaultMessage="Rename" />
          </MenuItem>
          <MenuItem onClick={() => handleDeleteChat(selectedChatId)} sx={{ minHeight: 36, fontSize: 14, color: 'error.main' }}>
            <FormattedMessage id="menu.chat.delete" defaultMessage="Delete" />
          </MenuItem>
        </Menu>

        <ChatUpdate
          open={chatUpdateOpen}
          onClose={() => setChatUpdateOpen(false)}
          chat={selectedChat}
        />
      </Box>
    );
  } catch (error) {
    console.error("Error in HomeMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        An error occurred loading the menu.
      </Box>
    );
  }
}

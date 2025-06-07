import { Box, IconButton, Menu, MenuItem, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState, useRef } from "react";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import ChatUpdate from '@/renderer/components/Dialog/Chat/ChatUpdate';
import { IChatRoom } from '@/../../types/Chat/Chatroom';
import { getUserFromStore } from "@/utils/user";

export default function AgentsMenu() {
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);
  const chats = useChatStore((state) => state.chats);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const isLoading = useChatStore((state) => state.isLoading);

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [chatUpdateOpen, setChatUpdateOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<IChatRoom | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const menuOpen = Boolean(menuAnchorEl);

  const activeSection = 'agents';
  const selectedSubcategory = selectedTopics[activeSection] || '';
  const fetchingRef = useRef(false);

  const user = getUserFromStore();

  const getContextId = () => {
    if (!selectedContext) return '';
    return `${selectedContext.name}:${selectedContext.type}`;
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedTopic(activeSection, chatId);
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
    const isLocal = user?.id ? false : true;

    const chatIdToDelete = id || selectedChatId;
    if (chatIdToDelete) {
      deleteChat(chatIdToDelete, isLocal);
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
    const userId = user?.id || "guest";
    fetchingRef.current = true;
    setIsFetching(true);

    useChatStore.getState().getChat(userId, 'agent', undefined)
      .then(() => {
        const allCurrentChats = useChatStore.getState().chats;
        const agentChats = allCurrentChats.filter(chat => chat.type === 'agent');
        const agentChatIds = agentChats.map(chat => chat.id);

        const currentSelectedAgentChatId = useTopicStore.getState().selectedTopics[activeSection];

        const isSelectionValid = currentSelectedAgentChatId && agentChatIds.includes(currentSelectedAgentChatId);

        if (!isSelectionValid) {
          if (agentChats.length > 0) {
            const firstAgentChat = agentChats[0];
            if (currentSelectedAgentChatId !== firstAgentChat.id) {
              setSelectedTopic(activeSection, firstAgentChat.id);
              setActiveChat(firstAgentChat.id, getContextId());
            }
          } else {
            if (currentSelectedAgentChatId) {
              useTopicStore.getState().clearSelectedTopic(activeSection);
            }
          }
        }
      })
      .finally(() => {
        setIsFetching(false);
        fetchingRef.current = false;
      });
  }, [user?.id]);

  return (
    <Box sx={{ mt: 2, px: 2 }}>
      <Box sx={{ mt: 2 }}>
        {isFetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {chats
              .filter(chat => chat.type === 'agent')
              .map((chat) => (
                <MenuListItem
                  key={chat.id}
                  label={chat.name}
                  isSelected={selectedSubcategory === chat.id}
                  onClick={() => handleSelectChat(chat.id)}
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
          </>
        )}
      </Box>

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
}

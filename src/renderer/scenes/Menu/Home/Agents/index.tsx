import { Box, IconButton, Menu, MenuItem, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState, useRef, useMemo } from "react";
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
  const getChat = useChatStore((state) => state.getChat);

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

  // Memoize agent chats to prevent unnecessary recalculations
  const agentChats = useMemo(() => 
    chats.filter(chat => chat.type === 'agent'), 
    [chats]
  );

  // Memoize getContextId to prevent infinite loops
  const getContextId = useMemo(() => {
    if (!selectedContext) return '';
    return `${selectedContext.name}:${selectedContext.type}`;
  }, [selectedContext?.name, selectedContext?.type]);

  // Fetch chats when user changes
  useEffect(() => {
    const currentUser = getUserFromStore();
    if (currentUser?.id) {
      const userId = currentUser.id;
      if (!fetchingRef.current) {
        fetchingRef.current = true;
        setIsFetching(true);
        
        getChat(userId, 'agent', undefined)
          .finally(() => {
            setIsFetching(false);
            fetchingRef.current = false;
          });
      }
    }
  }, [user?.id, getChat]);

  // Handle agent chat selection logic
  useEffect(() => {
    if (agentChats.length > 0) {
      // Check if current selection is valid
      const isSelectionValid = selectedSubcategory && 
        agentChats.some(chat => chat.id === selectedSubcategory);
      
      if (!isSelectionValid) {
        // Add a small delay to let other components finish their restoration
        const timeoutId = setTimeout(() => {
          // Double-check that we still don't have a valid selection
          const currentSelectedSubcategory = useTopicStore.getState().selectedTopics[activeSection] || '';
          const currentlyValid = currentSelectedSubcategory && 
            agentChats.some(chat => chat.id === currentSelectedSubcategory);
          
          if (!currentlyValid) {
            // Fall back to first chat if no valid selection
            const firstChatId = agentChats[0].id;
            setSelectedTopic(activeSection, firstChatId);
            setActiveChat(firstChatId, getContextId);
          }
        }, 50); // Small delay to let other components complete their restoration
        
        return () => clearTimeout(timeoutId);
      }
    } else {
      // When no chats exist, clear selections
      if (selectedSubcategory) {
        setSelectedTopic(activeSection, ''); // Clear the selected topic
      }
      setActiveChat('', getContextId); // Clear active chat
    }
  }, [agentChats, activeSection, getContextId]); // Removed selectedSubcategory from dependencies

  const handleSelectChat = (chatId: string) => {
    setSelectedTopic(activeSection, chatId);
    setActiveChat(chatId, getContextId);
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

  return (
    <Box sx={{ mt: 2, px: 2 }}>
      <Box sx={{ mt: 2 }}>
        {isFetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {agentChats.length > 0 ? (
              agentChats.map((chat) => (
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
              ))
            ) : (
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

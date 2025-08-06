import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, CircularProgress, Menu, MenuItem, IconButton } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { AutoAwesome as CopilotIcon, Close as CloseIcon } from "@mui/icons-material";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useCopilotStore } from "@/renderer/stores/Copilot/CopilotStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { getUserFromStore } from "@/utils/user";
import ChatUpdate from "@/renderer/components/Dialog/Chat/ChatUpdate";
import { IChatRoom } from "@/../../types/Chat/Chatroom";

export default function CopilotMenu() {
  const topicContext = useCurrentTopicContext();
  const selectedContext = topicContext.selectedContext;
  const { currentDocument } = useCopilotStore();
  const { chats, deleteChat, getChat } = useChatStore();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);
  
  // State for context menu and deletion
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<IChatRoom | null>(null);
  const [chatUpdateOpen, setChatUpdateOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const fetchingRef = useRef(false);

  const section = selectedContext?.section || '';
  const selectedChatIdFromTopic = section ? selectedTopics[section] || '' : '';

  // Filter copilot chats
  const copilotChats = useMemo(() => 
    chats.filter(chat => chat.type === 'copilot'), 
    [chats]
  );

  // Load copilot chats when component mounts
  useEffect(() => {
    const currentUser = getUserFromStore();
    if (currentUser?.id) {
      const userId = currentUser.id;
      if (!fetchingRef.current) {
        fetchingRef.current = true;
        setIsFetching(true);
        
        getChat(userId, 'copilot', undefined)
          .finally(() => {
            setIsFetching(false);
            fetchingRef.current = false;
          });
      }
    }
  }, [getChat]);

  const handleSelectChat = (chatId: string) => {
    setSelectedTopic(section, chatId);
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
    // Copilot chats are always local (no workspace)
    const isLocal = true;

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
      {/* Chat List */}
      <Box sx={{ mt: 1 }}>
        {isFetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {copilotChats.length > 0 ? (
              copilotChats.map((chat) => {
                const isChatSelected = selectedChatIdFromTopic === chat.id;
                
                return (
                  <MenuListItem
                    key={chat.id}
                    label={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        width: '100%',
                        pr: 1
                      }}>
                        <CopilotIcon sx={{ mr: 1, fontSize: 16, color: 'primary.main' }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: isChatSelected ? 'medium' : 'regular',
                              color: isChatSelected ? 'primary.main' : 'text.primary',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {chat.name}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {new Date(chat.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    isSelected={isChatSelected}
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
                    sx={{ 
                      pl: 3,
                      py: 1.5,
                      '& .MuiListItemText-root': {
                        margin: 0,
                      }
                    }}
                  />
                );
              })
            ) : (
              <Box sx={{ 
                pl: 3, 
                py: 2, 
                color: 'text.secondary', 
                fontSize: '0.875rem',
                textAlign: 'center'
              }}>
                <CopilotIcon sx={{ fontSize: 24, mb: 1, opacity: 0.5 }} />
                <Typography variant="body2" color="text.secondary">
                  <FormattedMessage id="copilot.menu.noChats" defaultMessage="No copilot sessions yet" />
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  <FormattedMessage id="copilot.menu.createHint" defaultMessage="Use the + button above to create your first session" />
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
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

      {/* Chat Update Dialog */}
      <ChatUpdate
        open={chatUpdateOpen}
        onClose={() => setChatUpdateOpen(false)}
        chat={selectedChat}
      />
    </Box>
  );
}

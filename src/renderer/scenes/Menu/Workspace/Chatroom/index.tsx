import { Box, IconButton, Menu, MenuItem, Badge, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect, useMemo } from "react";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import ChatUpdate from '@/renderer/components/Dialog/Chat/ChatUpdate';
import { IChatRoom } from '@/../../types/Chat/Chatroom';
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { getUserFromStore } from "@/utils/user";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { toast } from "@/utils/toast";
import { IWorkspaceUser } from '@/../../types/Workspace/Workspace';

export default function WorkspaceChatMenu() {
  const { selectedContext } = useCurrentTopicContext();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);
  
  // NEW: Add workspace chat selection methods
  const setWorkspaceSelectedChat = useTopicStore((state) => state.setWorkspaceSelectedChat);
  const getWorkspaceSelectedChat = useTopicStore((state) => state.getWorkspaceSelectedChat);
  
  const chats = useChatStore((state) => state.chats);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const getChat = useChatStore((state) => state.getChat);
  const getUserInWorkspace = useWorkspaceStore((state) => state.getUserInWorkspace);

  // Get notification data for unread counts
  const allNotifications = useNotificationStore(state => state.notifications);

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [chatUpdateOpen, setChatUpdateOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<IChatRoom | null>(null);
  const [workspaceUser, setWorkspaceUser] = useState<IWorkspaceUser | null>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const workspaceId = selectedContext?.id || '';
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  // Move workspaceChats definition before memoized calculations
  const workspaceChats = useMemo(() => 
    chats.filter(chat => chat.workspace_id === workspaceId), 
    [chats, workspaceId]
  );

  // Memoize getContextId to prevent infinite loops
  const getContextId = useMemo(() => {
    if (!selectedContext) return '';
    return `${selectedContext.name}:${selectedContext.type}`;
  }, [selectedContext?.name, selectedContext?.type]);

  // Memoize unread counts for each chat to prevent unnecessary recalculations
  const chatUnreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    if (workspaceId && workspaceChats.length > 0) {
      workspaceChats.forEach(chat => {
        // Get unread notifications for this specific chat in this workspace
        const unreadCount = allNotifications.filter(notification => 
          notification.workspaceId === workspaceId &&
          notification.workspaceSection === 'chatroom' &&
          notification.workspaceContext === chat.id &&
          !notification.read
        ).length;
        
        counts[chat.id] = unreadCount;
      });
    }
    
    return counts;
  }, [allNotifications, workspaceId, workspaceChats]);

  useEffect(() => {
    const currentUser = getUserFromStore();
    if (currentUser?.id && selectedContext?.id) {
      const workspaceId = selectedContext.id || '';
      getChat(currentUser.id, 'chatroom', workspaceId);
    }
  }, [selectedContext?.id, getChat]);

  useEffect(() => {
    if (workspaceChats.length > 0) {
      // NEW: Check if we have a remembered chat for this workspace
      const rememberedChatId = getWorkspaceSelectedChat(workspaceId);
      
      // Check if the remembered chat still exists
      const rememberedChatExists = rememberedChatId && 
        workspaceChats.some(chat => chat.id === rememberedChatId);
      
      if (rememberedChatExists) {
        // Use the remembered chat ONLY if current selection doesn't match
        if (selectedSubcategory !== rememberedChatId) {
          setSelectedTopic(section, rememberedChatId);
          setActiveChat(rememberedChatId, getContextId);
        }
      } else if (!selectedSubcategory || !workspaceChats.some(chat => chat.id === selectedSubcategory)) {
        // ✅ FIX: Add a small delay to let SidebarTabs finish its restoration
        // Only auto-select first chat if no selection is being restored
        const timeoutId = setTimeout(() => {
          // Double-check that we still don't have a valid selection
          const currentSelectedSubcategory = useTopicStore.getState().selectedTopics[section] || '';
          const currentlyValid = currentSelectedSubcategory && 
            workspaceChats.some(chat => chat.id === currentSelectedSubcategory);
          
          if (!currentlyValid) {
            // Fall back to first chat if no remembered chat or it doesn't exist
            const firstChatId = workspaceChats[0].id;
            setSelectedTopic(section, firstChatId);
            setActiveChat(firstChatId, getContextId);
            // Remember this selection
            setWorkspaceSelectedChat(workspaceId, firstChatId);
          }
        }, 50); // Small delay to let SidebarTabs complete its restoration
        
        return () => clearTimeout(timeoutId);
      }
    } else {
      // NEW: When no chats exist, clear all selections
      if (selectedSubcategory) {
        setSelectedTopic(section, ''); // Clear the selected topic
      }
      setWorkspaceSelectedChat(workspaceId, null); // Clear workspace selection
      setActiveChat('', getContextId); // Clear active chat
    }
  }, [workspaceChats, section, workspaceId, getWorkspaceSelectedChat, setWorkspaceSelectedChat, getContextId]); // ✅ REMOVED selectedSubcategory from dependencies

  useEffect(() => {
    const fetchWorkspaceUser = async () => {
      const currentUser = getUserFromStore();
      if (currentUser?.id && workspaceId) {
        const user = await getUserInWorkspace(workspaceId, currentUser.id);
        setWorkspaceUser(user);
      }
    };

    fetchWorkspaceUser();
  }, [workspaceId, getUserInWorkspace]);

  const handleSelectChat = (chatId: string) => {
    setSelectedTopic(section, chatId);
    setActiveChat(chatId, getContextId);
    
    // NEW: Remember this chat selection for the workspace
    setWorkspaceSelectedChat(workspaceId, chatId);
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

  const canModifyChat = workspaceUser?.role === 'admin' || workspaceUser?.role === 'super_admin';

  const handleDeleteChat = (id?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canModifyChat) {
      toast.error("You don't have permission to delete chats");
      return;
    }

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

  const menuItems = [];

  if (canModifyChat) {
    menuItems.push(
      <MenuItem
        key="rename"
        onClick={() => {
          const chat = chats.find(c => c.id === selectedChatId) || null;
          handleRenameChat(chat);
        }}
        sx={{ minHeight: 36, fontSize: 14 }}
      >
        <FormattedMessage id="menu.chat.rename" defaultMessage="Rename" />
      </MenuItem>
    );

    menuItems.push(
      <MenuItem
        key="delete"
        onClick={() => handleDeleteChat(selectedChatId)}
        sx={{ minHeight: 36, fontSize: 14, color: 'error.main' }}
      >
        <FormattedMessage id="menu.chat.delete" defaultMessage="Delete" />
      </MenuItem>
    );
  }

  try {
    return (
      <Box sx={{ mt: 2, px: 2 }}>
        <Box sx={{ mt: 2 }}>
          {workspaceChats.length > 0 ? (
            workspaceChats.map((chat) => {
              const unreadCount = chatUnreadCounts[chat.id] || 0;
              const isUnread = unreadCount > 0;
              
              return (
                <MenuListItem
                  key={chat.id}
                  label={
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      width: '100%',
                      pr: 1
                    }}>
                      <span>{chat.name}</span>
                      {isUnread && (
                        <Badge
                          badgeContent={unreadCount}
                          color="primary"
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.7rem',
                              minWidth: 16,
                              height: 16,
                              padding: '0 4px',
                              borderRadius: '8px'
                            }
                          }}
                        />
                      )}
                    </Box>
                  }
                  isSelected={selectedSubcategory === chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  onContextMenu={(e) => handleContextMenu(e, chat.id)}
                  endIcon={
                    canModifyChat && (
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
                    )
                  }
                  sx={{ 
                    pl: 4,
                    '& .MuiListItemText-root': {
                      margin: 0,
                      '& .MuiListItemText-primary': {
                        overflow: 'hidden'
                      }
                    }
                  }}
                />
              );
            })
          ) : (
            <Box sx={{ pl: 4, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
              <FormattedMessage id="workspace.noChats" defaultMessage="No chats found" />
            </Box>
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
          {menuItems}
        </Menu>

        <ChatUpdate
          open={chatUpdateOpen}
          onClose={() => setChatUpdateOpen(false)}
          chat={selectedChat}
        />
      </Box>
    );
  } catch (error) {
    console.error("Error in WorkspaceChatMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        An error occurred loading the menu.
      </Box>
    );
  }
}

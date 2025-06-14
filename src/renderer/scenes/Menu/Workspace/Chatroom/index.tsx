import { Box, IconButton, Menu, MenuItem } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
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
  const chats = useChatStore((state) => state.chats);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const getChat = useChatStore((state) => state.getChat);
  const getUserInWorkspace = useWorkspaceStore((state) => state.getUserInWorkspace);

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<string>('');
  const [chatUpdateOpen, setChatUpdateOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<IChatRoom | null>(null);
  const [workspaceUser, setWorkspaceUser] = useState<IWorkspaceUser | null>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const workspaceId = selectedContext?.id || '';
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const getContextId = () => {
    if (!selectedContext) return '';
    return `${selectedContext.name}:${selectedContext.type}`;
  };

  useEffect(() => {
    const currentUser = getUserFromStore();
    if (currentUser?.id && selectedContext?.id) {
      const workspaceId = selectedContext.id || '';
      getChat(currentUser.id, "workspace", workspaceId);
    }
  }, [selectedContext?.id, getChat]);

  useEffect(() => {
    const workspaceChats = chats.filter(chat => chat.workspace_id === workspaceId);
    if (workspaceChats.length > 0 && (!selectedSubcategory || !workspaceChats.some(chat => chat.id === selectedSubcategory))) {
      setSelectedTopic(section, workspaceChats[0].id);
      setActiveChat(workspaceChats[0].id, getContextId());
    }
  }, [chats, workspaceId, selectedSubcategory, setSelectedTopic, setActiveChat, section]);

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

  const workspaceChats = chats.filter(chat => chat.workspace_id === workspaceId);

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
            chats.map((chat) => (
              <MenuListItem
                key={chat.id}
                label={chat.name}
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
                sx={{ pl: 4 }}
              />
            ))
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

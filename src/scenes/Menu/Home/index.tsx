import { Box, IconButton, Menu, MenuItem } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useUserStore } from "@/stores/User/UserStore";
import MenuListItem from "@/components/Navigation/MenuListItem";
import ChatUpdate from '@/components/Dialog/ChatUpdate';
import { IChatRoom } from '@/../../types/Chat/Chatroom';

export default function HomeMenu() {
    const selectedContext = useTopicStore((state) => state.selectedContext);
    const selectedTopics = useTopicStore((state) => state.selectedTopics);
    const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);
    const rooms = useChatStore((state) => state.rooms);
    const setActiveChat = useChatStore((state) => state.setActiveChat);
    const deleteChat = useChatStore((state) => state.deleteChat);
    const getChat = useChatStore((state) => state.getChat);
    const user = useUserStore((state) => state.user);

    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedChatId, setSelectedChatId] = useState<string>('');
    const [roomUpdateOpen, setRoomUpdateOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<IChatRoom | null>(null);
    const menuOpen = Boolean(menuAnchorEl);

    const activeSection = selectedContext?.type === 'home'
        ? selectedContext.section || 'agents'
        : null;

    const selectedSubcategory = activeSection ? selectedTopics[activeSection] || '' : '';

    const getContextId = () => {
        if (!selectedContext) return '';
        return `${selectedContext.name}:${selectedContext.type}`;
    };

    useEffect(() => {
        if (user?.id) {
            getChat(user.id, 'agent');
        }
    }, [user?.id, getChat]);

    const handleSelectChat = (section: string, chatId: string) => {
        setSelectedTopic(section, chatId);
        setActiveChat(chatId, getContextId());
    };

    const handleContextMenu = (event: React.MouseEvent<HTMLElement>, chatId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedChatId(chatId);

        const room = rooms.find(r => r.id === chatId) || null;
        setSelectedRoom(room);

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

    const handleRenameChat = (room: IChatRoom | null) => {
        if (!room) return;
        setSelectedRoom(room);
        setRoomUpdateOpen(true);
        handleCloseMenu();
    };

    try {
        return (
            <Box sx={{ mt: 2, px: 2 }}>
                {activeSection === 'agents' && (
                    <Box sx={{ mt: 2 }}>
                        {rooms
                            .filter(room => room.type === 'agent')
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
                        {rooms.filter(room => room.type === 'agent').length === 0 && (
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
                        const room = rooms.find(r => r.id === selectedChatId) || null;
                        handleRenameChat(room);
                    }} sx={{ minHeight: 36, fontSize: 14 }}>
                        <FormattedMessage id="menu.chat.rename" defaultMessage="Rename" />
                    </MenuItem>
                    <MenuItem onClick={() => handleDeleteChat(selectedChatId)} sx={{ minHeight: 36, fontSize: 14, color: 'error.main' }}>
                        <FormattedMessage id="menu.chat.delete" defaultMessage="Delete" />
                    </MenuItem>
                </Menu>

                <ChatUpdate
                    open={roomUpdateOpen}
                    onClose={() => setRoomUpdateOpen(false)}
                    room={selectedRoom}
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

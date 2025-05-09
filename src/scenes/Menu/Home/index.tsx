import { Box, Menu, MenuItem, IconButton } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import MenuSection from "@/components/Navigation/MenuSection";
import MenuListItem from "@/components/Navigation/MenuListItem";
import MenuCollapsibleSection from "@/components/Navigation/MenuCollapsibleSection";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useUserStore } from "@/stores/User/UserStore";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { TopicContext } from "@/stores/Topic/TopicStore";
import ChatUpdate from '@/components/Dialog/ChatUpdate';
import { IChatRoom } from '@/types/Chat/Chatroom';
type SectionName = 'Friends' | 'Agents';

export default function HomeMenu() {
    const {
        selectedTopics,
        setSelectedTopic,
        selectedContext,
        setGroupExpanded,
        getGroupExpanded,
        clearSelectedTopic,
    } = useCurrentTopicContext();

    const { setActiveChat } = useChatStore();

    const { getChat } = useChatStore();
    const user = useUserStore((state) => state.user);

    // State for context menu
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedChatId, setSelectedChatId] = useState<string>('');
    const menuOpen = Boolean(menuAnchorEl);

    const [roomUpdateOpen, setRoomUpdateOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<IChatRoom | null>(null);

    const getCleanContextId = (context: TopicContext | null) => {
        if (!context) return '';
        return `${context.name}:${context.type}`;
    };

    const contextId = getCleanContextId(selectedContext);
    const menuInstanceKey = `${contextId}`;

    useEffect(() => {
        if (selectedContext) {
            if (!getGroupExpanded('Friends') && !getGroupExpanded('Agents')) {
                setGroupExpanded('Friends', true);
                setGroupExpanded('Agents', true);
            }
        }
    }, [selectedContext, setGroupExpanded, getGroupExpanded]);

    useEffect(() => {
        const activeSection = Object.keys(selectedTopics).find(
            section => selectedTopics[section]
        );

        if (activeSection && selectedTopics[activeSection] && contextId) {
            const topicId = selectedTopics[activeSection];
            const rooms = useChatStore.getState().rooms;

            // Only set active chat if the topic ID exists in rooms
            if (rooms.some(room => room.id === topicId)) {
                setActiveChat(topicId, contextId);
            } else {
                console.warn(`Selected topic ${topicId} does not exist in rooms`);

                // Remove invalid topic ID from selectedTopics
                clearSelectedTopic(activeSection);
            }
        }
    }, [contextId, selectedTopics, setActiveChat, clearSelectedTopic]);

    useEffect(() => {
        if (user?.id) {
            getChat(user.id, 'agent');
        }
    }, [user?.id, getChat]);

    useEffect(() => {
        if (contextId) {
            const { activeRoomByContext, rooms } = useChatStore.getState();
            const currentActiveRoom = activeRoomByContext[contextId];

            if (currentActiveRoom && !rooms.some(room => room.id === currentActiveRoom)) {
                const validAgentRoom = rooms.find(room => room.type === 'agent');
                if (validAgentRoom) {
                    setActiveChat(validAgentRoom.id, contextId);
                }
            }

            if (activeRoomByContext[""] && contextId !== "") {
                const chatStore = useChatStore.getState();
                const emptyContextRoom = activeRoomByContext[""];

                chatStore.setActiveChat(emptyContextRoom, contextId);

                const cleanupEmptyContext = () => {
                    const state = useChatStore.getState();
                    const newActiveRoomByContext = { ...state.activeRoomByContext };
                    delete newActiveRoomByContext[""];

                    useChatStore.setState({
                        activeRoomByContext: newActiveRoomByContext
                    });
                };

                cleanupEmptyContext();
            }
        }
    }, [contextId, setActiveChat]);

    useEffect(() => {
        // Clean up any invalid references in the chat store
        const cleanupInvalidReferences = () => {
            const { activeRoomByContext, rooms } = useChatStore.getState();
            let hasInvalidReferences = false;
            const newActiveRoomByContext = { ...activeRoomByContext };

            // Remove any references to non-existent rooms
            Object.entries(newActiveRoomByContext).forEach(([contextKey, roomId]) => {
                if (roomId && !rooms.some(room => room.id === roomId)) {
                    delete newActiveRoomByContext[contextKey];
                    hasInvalidReferences = true;
                }
            });

            if (hasInvalidReferences) {
                useChatStore.setState({ activeRoomByContext: newActiveRoomByContext });
            }
        };

        cleanupInvalidReferences();
    }, []);

    const selectedSubcategory = selectedTopics['Agents'] || '';

    const toggleSection = (section: SectionName) => {
        const isCurrentlyExpanded = getGroupExpanded(section);
        setGroupExpanded(section, !isCurrentlyExpanded);
    };

    const isSectionExpanded = (section: SectionName) => {
        return getGroupExpanded(section);
    };

    const selectTopic = (section: string, topicId: string) => {
        // Validate the topic ID exists in rooms before setting it
        const rooms = useChatStore.getState().rooms;

        if (rooms.some(room => room.id === topicId)) {
            setSelectedTopic(section, topicId);
            setActiveChat(topicId, contextId);
        } else {
            console.warn(`Cannot select non-existent topic: ${topicId}`);
        }
    };

    // Context menu handlers
    const handleContextMenu = (event: React.MouseEvent<HTMLElement>, chatId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedChatId(chatId);

        // Find and set the room object
        const room = useChatStore.getState().rooms.find(r => r.id === chatId) || null;
        setSelectedRoom(room);

        setMenuAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setMenuAnchorEl(null);
    };

    const handleDeleteChat = (id?: string) => {
        const chatIdToDelete = id || selectedChatId;
        if (chatIdToDelete) {
            useChatStore.getState().deleteChat(chatIdToDelete);
        }
        handleCloseMenu();
    };

    const handleRenameChat = (room: IChatRoom | null) => {
        if (!room) return;
        setSelectedRoom(room);
        setRoomUpdateOpen(true);
        handleCloseMenu();
    };

    return (
        <Box key={menuInstanceKey} sx={{ mt: 2, px: 2 }}>
            <MenuSection>
                <Box>
                    <MenuListItem
                        icon={<PeopleAltIcon color="primary" fontSize="small" />}
                        label={<FormattedMessage id="home.friends" defaultMessage="Friends" />}
                        isSelected={false}
                        textColor="primary.main"
                        onClick={() => toggleSection("Friends")}
                        endIcon={isSectionExpanded("Friends") ? <ExpandLess /> : <ExpandMore />}
                        sx={{
                            fontWeight: 700,
                            fontSize: "0.95rem"
                        }}
                    />

                    <MenuCollapsibleSection isOpen={isSectionExpanded("Friends")}>
                        <></>
                    </MenuCollapsibleSection>
                </Box>

                <Box>
                    <MenuListItem
                        icon={<SmartToyIcon color="primary" fontSize="small" />}
                        label={<FormattedMessage id="home.agents" defaultMessage="Agents" />}
                        isSelected={false}
                        textColor="primary.main"
                        onClick={() => toggleSection("Agents")}
                        endIcon={isSectionExpanded("Agents") ? <ExpandLess /> : <ExpandMore />}
                        sx={{
                            fontWeight: 700,
                            fontSize: "0.95rem"
                        }}
                    />

                    <MenuCollapsibleSection isOpen={isSectionExpanded("Agents")}>
                        {useChatStore((state) => state.rooms)
                            .filter(room => room.type === 'agent')
                            .map((chat) => (
                                <MenuListItem
                                    key={chat.id}
                                    label={chat.name}
                                    isSelected={selectedSubcategory === chat.id}
                                    onClick={() => selectTopic('Agents', chat.id)}
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteChat(chat.id);
                                            }}
                                        >
                                            <CloseIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    }
                                    sx={{ pl: 4 }}
                                />
                            ))}
                        {useChatStore((state) => state.rooms).filter(room => room.type === 'agent').length === 0 && (
                            <Box sx={{ pl: 4, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                                <FormattedMessage id="home.noAgents" defaultMessage="No agents found" />
                            </Box>
                        )}
                    </MenuCollapsibleSection>
                </Box>
            </MenuSection>

            {/* Context menu for agent items */}
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
                    const room = useChatStore.getState().rooms.find(r => r.id === selectedChatId) || null;
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
}
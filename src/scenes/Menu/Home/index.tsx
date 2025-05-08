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

type SectionName = 'Friends' | 'Agents';

export default function HomeMenu() {
    const {
        selectedTopics,
        setSelectedTopic,
        selectedContext,
        expandedGroups,
        setGroupExpanded,
    } = useCurrentTopicContext();

    const { setActiveChat } = useChatStore();

    const { getChat } = useChatStore();
    const user = useUserStore((state) => state.user);

    // State for context menu
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedChatId, setSelectedChatId] = useState<string>('');
    const menuOpen = Boolean(menuAnchorEl);

    const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
    const menuInstanceKey = `${contextId}`;

    useEffect(() => {
        if (selectedContext && Object.keys(expandedGroups).length === 0) {
            const updates = {
                'Friends': true,
                'Agents': true
            };

            Object.entries(updates).forEach(([section, expanded]) => {
                setGroupExpanded(section as SectionName, expanded);
            });
        }
    }, [selectedContext, expandedGroups, setGroupExpanded]);

    useEffect(() => {
        const activeSection = Object.keys(selectedTopics).find(
            section => selectedTopics[section]
        );

        if (activeSection && selectedTopics[activeSection] && contextId) {
            setActiveChat(selectedTopics[activeSection], contextId);
        }
    }, [contextId, selectedTopics, setActiveChat]);

    useEffect(() => {
        if (user?.id) {
            getChat(user.id, 'agent');
        }
    }, [user?.id, getChat]);

    const selectedSubcategory = selectedTopics['Agents'] || '';

    const toggleSection = (section: SectionName) => {
        const isCurrentlyExpanded = expandedGroups[section] || false;
        setGroupExpanded(section, !isCurrentlyExpanded);
    };

    const isSectionExpanded = (section: SectionName) => {
        return expandedGroups ? (expandedGroups[section] || false) : true;
    };

    const selectTopic = (section: string, topicId: string) => {
        setSelectedTopic(section, topicId);
        setActiveChat(topicId, contextId);
    };

    // Context menu handlers
    const handleContextMenu = (event: React.MouseEvent<HTMLElement>, chatId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedChatId(chatId);
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

    const handleRenameChat = () => {
        // Implement rename functionality
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
                <MenuItem onClick={handleRenameChat} sx={{ minHeight: 36, fontSize: 14 }}>
                    <FormattedMessage id="menu.chat.rename" defaultMessage="Rename" />
                </MenuItem>
                <MenuItem onClick={() => handleDeleteChat(selectedChatId)} sx={{ minHeight: 36, fontSize: 14, color: 'error.main' }}>
                    <FormattedMessage id="menu.chat.delete" defaultMessage="Delete" />
                </MenuItem>
            </Menu>
        </Box>
    );
}
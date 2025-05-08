import { Box } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import TagIcon from "@mui/icons-material/Tag";
import { useState, useEffect } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { useChatStore } from "@/stores/Chat/chatStore";
import MenuSection from "@/components/Navigation/MenuSection";
import MenuListItem from "@/components/Navigation/MenuListItem";
import MenuCollapsibleSection from "@/components/Navigation/MenuCollapsibleSection";

const groups: any[] = [];

export default function Chatroom() {
    const {
        selectedTopics,
        setSelectedTopic,
        selectedContext
    } = useCurrentTopicContext();

    const { setActiveChat } = useChatStore();

    // Create a unique key for this menu instance using the context
    const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
    const menuKey = `${contextId}`;

    // Initialize openGroups based on selectedTopics
    const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>(() => {
        const initialOpenGroups: { [key: string]: boolean } = {};
        Object.keys(selectedTopics).forEach(groupName => {
            if (selectedTopics[groupName]) {
                initialOpenGroups[groupName] = true;
            }
        });
        return initialOpenGroups;
    });

    // Reset openGroups when context changes
    useEffect(() => {
        setOpenGroups({});
    }, [contextId]);

    // Sync the active room when context changes or when selected topics change
    useEffect(() => {
        // Find the active topic from selectedTopics
        const activeSection = Object.keys(selectedTopics).find(
            section => selectedTopics[section]
        );

        if (activeSection && selectedTopics[activeSection] && contextId) {
            // Set this topic as the active chat for this context
            setActiveChat(selectedTopics[activeSection], contextId);
        }
    }, [contextId, selectedTopics, setActiveChat]);

    const handleGroupClick = (groupName: string) => {
        setOpenGroups((prev) => ({
            ...prev,
            [groupName]: !prev[groupName],
        }));
    };

    const handleTopicClick = (groupName: string, topic: string) => {
        setSelectedTopic(groupName, topic);

        // Also set this as the active chat for the current context
        if (contextId) {
            setActiveChat(topic, contextId);
        }

        // Optional debug log showing the hierarchy
        console.log(`Context: ${selectedContext?.name} > Section: ${groupName} > Topic: ${topic}`);
    };

    return (
        <Box key={menuKey} sx={{ mt: 2, px: 2 }}>
            <MenuSection>
                {groups.map((group) => (
                    <Box key={group.name}>
                        <MenuListItem
                            label={group.name}
                            isSelected={false}
                            textColor="primary.main"
                            onClick={() => handleGroupClick(group.name)}
                            endIcon={openGroups[group.name] ? <ExpandLess /> : <ExpandMore />}
                            sx={{
                                fontWeight: 700,
                                fontSize: "0.95rem"
                            }}
                        />

                        <MenuCollapsibleSection isOpen={!!openGroups[group.name]}>
                            {group.topics.map((topic: any) => (
                                <MenuListItem
                                    key={topic}
                                    icon={<TagIcon fontSize="small" sx={{ color: "text.secondary" }} />}
                                    label={topic}
                                    isSelected={selectedTopics[group.name] === topic}
                                    onClick={() => handleTopicClick(group.name, topic)}
                                    sx={{ pl: 4, py: 0.25, minHeight: 28 }}
                                />
                            ))}
                        </MenuCollapsibleSection>
                    </Box>
                ))}
            </MenuSection>
        </Box>
    );
}

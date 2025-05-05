import { Box } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import TagIcon from "@mui/icons-material/Tag";
import { useState, useEffect } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { useChatStore } from "@/stores/Chat/chatStore";
import MenuSection from "@/components/Navigation/MenuSection";
import MenuListItem from "@/components/Navigation/MenuListItem";
import MenuCollapsibleSection from "@/components/Navigation/MenuCollapsibleSection";

const groups: any[] = [];

export default function Chatroom() {
  const {
    selectedTopics,
    setSelectedTopic,
    selectedContext,
    parentId
  } = useCurrentTopicContext();

  const { tabs } = useWindowStore();
  const { setActiveChat } = useChatStore();
  const parentTab = tabs.find(tab => tab.id === parentId);

  // Create a unique key for this menu instance
  const menuKey = `${parentId || "no-parent"}-${selectedContext?.name || ""}`;

  // Initialize openGroups based on selectedTopics with tab-specific state
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>(() => {
    const initialOpenGroups: { [key: string]: boolean } = {};
    Object.keys(selectedTopics).forEach(groupName => {
      if (selectedTopics[groupName]) {
        initialOpenGroups[groupName] = true;
      }
    });
    return initialOpenGroups;
  });

  // Reset openGroups when parent tab changes
  useEffect(() => {
    setOpenGroups({});
  }, [parentId]);

  // Sync the active room when tab changes or when selected topics change
  useEffect(() => {
    // Find the active topic from selectedTopics
    const activeSection = Object.keys(selectedTopics).find(
      section => selectedTopics[section]
    );

    if (activeSection && selectedTopics[activeSection] && parentId) {
      // Set this topic as the active chat for this tab
      setActiveChat(selectedTopics[activeSection], parentId);
    }
  }, [parentId, selectedTopics, setActiveChat]);

  const handleGroupClick = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleTopicClick = (groupName: string, topic: string) => {
    setSelectedTopic(groupName, topic);

    // Also set this as the active chat for the current tab
    if (parentId) {
      setActiveChat(topic, parentId);
    }

    // Optional debug log showing the full hierarchy
    console.log(`Window: ${parentTab?.title} > Context: ${selectedContext?.name} > Section: ${groupName} > Topic: ${topic}`);
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

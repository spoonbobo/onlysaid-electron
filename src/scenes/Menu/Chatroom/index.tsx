import { Box } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import TagIcon from "@mui/icons-material/Tag";
import { useState } from "react";
import { useChatroomStore } from "../../../stores/Menu/ChatroomStore";
import MenuSection from "../../../components/Navigation/MenuSection";
import MenuListItem from "../../../components/Navigation/MenuListItem";
import MenuCollapsibleSection from "../../../components/Navigation/MenuCollapsibleSection";

const groups: any[] = [];

export default function Chatroom() {
  const selectedTopics = useChatroomStore((state) => state.selectedTopics);
  const setSelectedTopic = useChatroomStore((state) => state.setSelectedTopic);

  // Initialize openGroups based on selectedTopics
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>(() => {
    const initialOpenGroups: { [key: string]: boolean } = {};
    // For each group that has a selected topic, set it to open
    Object.keys(selectedTopics).forEach(groupName => {
      if (selectedTopics[groupName]) {
        initialOpenGroups[groupName] = true;
      }
    });
    return initialOpenGroups;
  });

  const handleGroupClick = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const handleTopicClick = (groupName: string, topic: string) => {
    setSelectedTopic(groupName, topic);
  };

  return (
    <Box sx={{ mt: 2, px: 2 }}>
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

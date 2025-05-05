import { Box } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import MenuSection from "@/components/Navigation/MenuSection";
import MenuListItem from "@/components/Navigation/MenuListItem";
import MenuCollapsibleSection from "@/components/Navigation/MenuCollapsibleSection";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useUserStore } from "@/stores/User/UserStore";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";

type SectionName = 'Friends' | 'Agents';

export default function HomeMenu() {
  const {
    selectedTopics,
    setSelectedTopic,
    selectedContext,
    expandedGroups,
    setGroupExpanded,
    parentId
  } = useCurrentTopicContext();

  const { tabs } = useWindowStore();
  const { setActiveChat } = useChatStore();
  const parentTab = tabs.find(tab => tab.id === parentId);

  const { getChat } = useChatStore();
  const user = useUserStore((state) => state.user);

  const menuInstanceKey = `${parentId || "no-parent"}-${selectedContext?.name || ""}`;

  useEffect(() => {
    if (selectedContext && parentId && Object.keys(expandedGroups).length === 0) {
      const updates = {
        'Friends': true,
        'Agents': true
      };

      Object.entries(updates).forEach(([section, expanded]) => {
        setGroupExpanded(section as SectionName, expanded);
      });
    }
  }, [parentId, selectedContext, setGroupExpanded]);

  useEffect(() => {
    const activeSection = Object.keys(selectedTopics).find(
      section => selectedTopics[section]
    );

    if (activeSection && selectedTopics[activeSection] && parentId) {
      setActiveChat(selectedTopics[activeSection], parentId);
    }
  }, [parentId, selectedTopics, setActiveChat]);

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
    setActiveChat(topicId, parentId || '');
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
    </Box>
  );
}
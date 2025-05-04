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

// Define the section names
type SectionName = 'Friends' | 'Agents';

export default function HomeMenu() {
  const {
    selectedTopics,
    setSelectedTopic,
    selectedContext,
    expandedGroups,
    setGroupExpanded,
  } = useCurrentTopicContext();
  const { getChat } = useChatStore();
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    if (selectedContext && (!expandedGroups || Object.keys(expandedGroups).length === 0)) {
      setGroupExpanded('Friends', true);
      setGroupExpanded('Agents', true);
    }
  }, [selectedContext, expandedGroups]);

  useEffect(() => {
    if (user?.id) {
      getChat(user.id, 'agent');
    }
  }, [user?.id]);

  const selectedSubcategory = selectedTopics['Agents'] || '';

  // Use the store to toggle section expansion
  const toggleSection = (section: SectionName) => {
    const isCurrentlyExpanded = expandedGroups[section] || false;
    setGroupExpanded(section, !isCurrentlyExpanded);
  };

  // Get expansion state from the store with fallbacks
  const isSectionExpanded = (section: SectionName) => {
    return expandedGroups ? (expandedGroups[section] || false) : true;
  };

  return (
    <Box sx={{ mt: 2, px: 2 }}>
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
                  onClick={() => {
                    setSelectedTopic('Agents', chat.id);
                    useChatStore.getState().setActiveChat(chat.id);
                  }}
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

import { Box } from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import MenuSection from "@/components/Navigation/MenuSection";
import MenuListItem from "@/components/Navigation/MenuListItem";
import MenuCollapsibleSection from "@/components/Navigation/MenuCollapsibleSection";

// Define the home subcategories
export const HomeSubcategories = {
  AllFriends: "allFriends",
  OnlineFriends: "onlineFriends",
  FavoriteFriends: "favoriteFriends",
  AllAgents: "allAgents",
  CustomAgents: "customAgents",
  FavoriteAgents: "favoriteAgents",
} as const;

// Define the section names
type SectionName = 'Friends' | 'Agents';

export default function HomeMenu() {
  const {
    selectedTopics,
    setSelectedTopic,
    selectedContext,
    expandedGroups,
    setGroupExpanded
  } = useCurrentTopicContext();

  // Initialize default expanded groups if not set
  useEffect(() => {
    if (selectedContext && (!expandedGroups || Object.keys(expandedGroups).length === 0)) {
      setGroupExpanded('Friends', true);
      setGroupExpanded('Agents', true);
    }
  }, [selectedContext, expandedGroups]);

  const selectedSubcategory = selectedTopics['home'] || HomeSubcategories.AllFriends;

  // Set the selected subcategory
  const setSelectedSubcategory = (subcategory: string) => {
    if (selectedContext) {
      setSelectedTopic('home', subcategory);
    }
  };

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
            <></>
          </MenuCollapsibleSection>
        </Box>
      </MenuSection>
    </Box>
  );
}

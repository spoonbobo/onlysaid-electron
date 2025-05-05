import { Box } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import BuildIcon from "@mui/icons-material/Build";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CodeIcon from "@mui/icons-material/Code";
import { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { UserSettingsSubcategories, UserSectionName } from "@/stores/User/UserSettings";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import MenuSection from "@/components/Navigation/MenuSection";
import MenuListItem from "@/components/Navigation/MenuListItem";
import MenuCollapsibleSection from "@/components/Navigation/MenuCollapsibleSection";
import { useUserSettingsStore } from "@/stores/User/UserSettings";

// Define the section names

export default function UserSettings() {
  const {
    selectedTopics,
    setSelectedTopic,
    selectedContext,
    expandedGroups,
    setGroupExpanded,
    parentId
  } = useCurrentTopicContext();

  const { debugMode } = useUserSettingsStore();

  // Create key for component instance
  const settingsKey = `${parentId || "no-parent"}-settings`;

  // Only initialize expanded groups if not already set
  useEffect(() => {
    if (selectedContext && Object.keys(expandedGroups).length === 0) {
      setGroupExpanded('General', true);
      ['LLM', 'KnowledgeBase', 'MCP', 'Developer', 'DangerZone'].forEach(section => {
        setGroupExpanded(section as UserSectionName, false);
      });
    }
  }, [parentId, selectedContext, expandedGroups]);

  const selectedSubcategory = selectedTopics['settings'] || UserSettingsSubcategories.User;

  // Set the selected subcategory
  const setSelectedSubcategory = (subcategory: string) => {
    if (selectedContext) {
      setSelectedTopic('settings', subcategory);
    }
  };

  // Use the store to toggle section expansion
  const toggleSection = (section: UserSectionName) => {
    const isCurrentlyExpanded = expandedGroups[section] || false;
    setGroupExpanded(section, !isCurrentlyExpanded);
  };

  // Get expansion state from the store with fallbacks
  const isSectionExpanded = (section: UserSectionName) => {
    return expandedGroups ? (expandedGroups[section] || false) :
      section === 'General'; // Default General to open if nothing is stored
  };

  return (
    <Box key={settingsKey} sx={{ mt: 2, px: 2 }}>
      <MenuSection>
        <Box>
          <MenuListItem
            icon={<PersonOutlineIcon color="primary" fontSize="small" />}
            label={<FormattedMessage id="settings.general" />}
            isSelected={false}
            textColor="primary.main"
            onClick={() => toggleSection("General")}
            endIcon={isSectionExpanded("General") ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={isSectionExpanded("General")}>
            <MenuListItem
              label={<FormattedMessage id="settings.user" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.User}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.User)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
          </MenuCollapsibleSection>
        </Box>

        <Box>
          <MenuListItem
            icon={<SmartToyIcon color="primary" fontSize="small" />}
            label={<FormattedMessage id="settings.models" />}
            isSelected={false}
            textColor="primary.main"
            onClick={() => toggleSection("LLM")}
            endIcon={isSectionExpanded("LLM") ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={isSectionExpanded("LLM")}>
            <MenuListItem
              label={<FormattedMessage id="settings.llmSettings" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.LLMSettings}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.LLMSettings)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
            <MenuListItem
              label={<FormattedMessage id="settings.publicLLMs" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.PublicLLM}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.PublicLLM)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
            <MenuListItem
              label={<FormattedMessage id="settings.privateLLMs" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.PrivateLLM}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.PrivateLLM)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
          </MenuCollapsibleSection>
        </Box>

        <Box>
          <MenuListItem
            icon={<MenuBookIcon color="primary" fontSize="small" />}
            label={<FormattedMessage id="settings.knowledgeBase" />}
            isSelected={false}
            textColor="primary.main"
            onClick={() => toggleSection("KnowledgeBase")}
            endIcon={isSectionExpanded("KnowledgeBase") ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={isSectionExpanded("KnowledgeBase")}>
            <MenuListItem
              label={<FormattedMessage id="settings.kbSettings" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.KBSettings}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.KBSettings)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
            <MenuListItem
              label={<FormattedMessage id="settings.cloudKb" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.CloudKB}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.CloudKB)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
            <MenuListItem
              label={<FormattedMessage id="settings.privateKb" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.PrivateKB}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.PrivateKB)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
          </MenuCollapsibleSection>
        </Box>

        <Box>
          <MenuListItem
            icon={<BuildIcon color="primary" fontSize="small" />}
            label={<FormattedMessage id="settings.tools" />}
            isSelected={false}
            textColor="primary.main"
            onClick={() => toggleSection("MCP")}
            endIcon={isSectionExpanded("MCP") ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={isSectionExpanded("MCP")}>
            <MenuListItem
              label={<FormattedMessage id="settings.mcp" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.MCP}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.MCP)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
          </MenuCollapsibleSection>
        </Box>

        <Box>
          <MenuListItem
            icon={<CodeIcon color="primary" fontSize="small" />}
            label={<FormattedMessage id="settings.developer" />}
            isSelected={false}
            textColor="primary.main"
            onClick={() => toggleSection("Developer")}
            endIcon={isSectionExpanded("Developer") ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={isSectionExpanded("Developer")}>
            <MenuListItem
              label={<FormattedMessage id="settings.apiKey" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.DeveloperAPI}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.DeveloperAPI)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
            <MenuListItem
              label={<FormattedMessage id="settings.debugMode" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.DebugMode}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.DebugMode)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
          </MenuCollapsibleSection>
        </Box>

        <Box>
          <MenuListItem
            icon={<DeleteOutlineIcon color="error" fontSize="small" />}
            label={<FormattedMessage id="settings.dangerZone" />}
            isSelected={false}
            textColor="error.main"
            onClick={() => toggleSection("DangerZone")}
            endIcon={isSectionExpanded("DangerZone") ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={isSectionExpanded("DangerZone")}>
            <MenuListItem
              label={<FormattedMessage id="settings.deleteAccount" />}
              textColor="error.main"
              isSelected={selectedSubcategory === UserSettingsSubcategories.DeleteAccount}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.DeleteAccount)}
              sx={{ pl: 4, py: 0.25, minHeight: 28 }}
            />
          </MenuCollapsibleSection>
        </Box>
      </MenuSection>
    </Box>
  );
}

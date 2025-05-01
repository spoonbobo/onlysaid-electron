import { Box } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import BuildIcon from "@mui/icons-material/Build";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { useUserSettingsStore, UserSettingsSubcategories } from "../../../stores/User/UserSettings";
import MenuSection from "../../../components/Navigation/MenuSection";
import MenuListItem from "../../../components/Navigation/MenuListItem";
import MenuCollapsibleSection from "../../../components/Navigation/MenuCollapsibleSection";

// Add this type above the component
type SectionName = 'General' | 'LLM' | 'KnowledgeBase' | 'MCP' | 'DangerZone';

export default function UserSettings() {
  const { selectedSubcategory, setSelectedSubcategory } = useUserSettingsStore();

  // Use a single useState hook with a fixed object structure
  const [openSections, setOpenSections] = useState({
    General: true,
    LLM: false,
    KnowledgeBase: false,
    MCP: false,
    DangerZone: false
  });

  // Use a single handler function for all sections
  const toggleSection = (section: SectionName) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <Box sx={{ mt: 2, px: 2 }}>
      <MenuSection>
        <Box>
          <MenuListItem
            icon={<PersonOutlineIcon color="primary" fontSize="small" />}
            label={<FormattedMessage id="settings.general" />}
            isSelected={false}
            textColor="primary.main"
            onClick={() => toggleSection("General")}
            endIcon={openSections.General ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={openSections.General}>
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
            endIcon={openSections.LLM ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={openSections.LLM}>
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
            endIcon={openSections.KnowledgeBase ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={openSections.KnowledgeBase}>
            <MenuListItem
              label={<FormattedMessage id="settings.knowledgeBase" />}
              isSelected={selectedSubcategory === UserSettingsSubcategories.KnowledgeBase}
              onClick={() => setSelectedSubcategory(UserSettingsSubcategories.KnowledgeBase)}
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
            endIcon={openSections.MCP ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={openSections.MCP}>
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
            icon={<DeleteOutlineIcon color="error" fontSize="small" />}
            label={<FormattedMessage id="settings.dangerZone" />}
            isSelected={false}
            textColor="error.main"
            onClick={() => toggleSection("DangerZone")}
            endIcon={openSections.DangerZone ? <ExpandLess /> : <ExpandMore />}
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem"
            }}
          />

          <MenuCollapsibleSection isOpen={openSections.DangerZone}>
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

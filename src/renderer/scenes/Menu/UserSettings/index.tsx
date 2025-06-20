import { Box } from "@mui/material";
import { UserSettingsSubcategories } from "@/renderer/stores/User/UserSettings";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import UserSettingsSection from "./User";
import LLMSettingsSection from "./LLM";
import KBSettingsSection from "./KnowledgeBase";
import ToolsSettingsSection from "./Tools";
import DeveloperSettingsSection from "./Developer";
import DangerZoneSection from "./DangerZone";
import AgentSettingsSection from "./Agent";

export default function UserSettings() {
  const {
    selectedTopics,
    setSelectedTopic,
    selectedContext,
  } = useCurrentTopicContext();

  // Create key for component instance based on context
  const settingsKey = `settings-${selectedContext?.name || "unknown"}`;

  // Get the active section from context
  const activeSection = selectedContext?.section || 'user';
  const selectedSubcategory = selectedTopics['settings'] || UserSettingsSubcategories.User;

  // Set the selected subcategory
  const setSelectedSubcategory = (subcategory: string) => {
    if (selectedContext) {
      setSelectedTopic('settings', subcategory);
    }
  };

  // Handle action for the settings (configure, etc)
  const handleAction = (action: string) => {
    // Implement configure action
  };

  const sectionProps = {
    selectedSubcategory,
    setSelectedSubcategory,
    UserSettingsSubcategories,
  };

  return (
    <Box key={settingsKey} sx={{ mt: 2, px: 2 }}>
      {/* Show section-specific subitems only when a section is active */}
      {activeSection === 'user' && <UserSettingsSection {...sectionProps} />}
      {activeSection === 'llmSettings' && <LLMSettingsSection {...sectionProps} />}
      {activeSection === 'agent' && <AgentSettingsSection {...sectionProps} />}
      {activeSection === 'kb' && <KBSettingsSection {...sectionProps} />}
      {activeSection === 'tools' && <ToolsSettingsSection {...sectionProps} />}
      {activeSection === 'developer' && <DeveloperSettingsSection {...sectionProps} />}
      {activeSection === 'dangerZone' && <DangerZoneSection {...sectionProps} />}
    </Box>
  );
}

import { Box, Typography } from "@mui/material";
import { UserSettingsSubcategories } from "@/stores/User/UserSettings";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import SettingsSection from "@/components/Settings/SettingsSection";
import UserPreferences from "./UserSettings/UserPreference";
import DeleteAccount from "./UserSettings/DeleteAccount";
import PublicLLMConfiguration from "./LLMModels/Public";
import PrivateLLMConfiguration from "./LLMModels/Private";
import LLMSettings from "./LLMSettings";
import DebugMode from "./UserSettings/DebugMode";
import { FormattedMessage } from "react-intl";

function Settings() {
  const { selectedTopics } = useCurrentTopicContext();

  const selectedSubcategory = selectedTopics['settings'] || UserSettingsSubcategories.User;

  const renderContent = () => {
    switch (selectedSubcategory) {
      case UserSettingsSubcategories.User:
        return <UserPreferences />;

      case UserSettingsSubcategories.DeleteAccount:
        return <DeleteAccount />;

      case UserSettingsSubcategories.PublicLLM:
        return <PublicLLMConfiguration />;

      case UserSettingsSubcategories.PrivateLLM:
        return <PrivateLLMConfiguration />;

      case UserSettingsSubcategories.LLMSettings:
        return <LLMSettings />;

      case UserSettingsSubcategories.DebugMode:
        return <DebugMode />;

      case UserSettingsSubcategories.KnowledgeBase:
        return (
          <SettingsSection title="Knowledge Base">
            <Typography>Knowledge Base settings</Typography>
          </SettingsSection>
        );

      case UserSettingsSubcategories.MCP:
        return (
          <SettingsSection title="MCP">
            <Typography>MCP settings</Typography>
          </SettingsSection>
        );

      default:
        return (
          <SettingsSection title="Select a settings category">
            <Typography>Please select a settings category from the menu</Typography>
          </SettingsSection>
        );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        <FormattedMessage id={`settings.${selectedSubcategory}`} />
      </Typography>
      {renderContent()}
    </Box>
  );
}

export default Settings;

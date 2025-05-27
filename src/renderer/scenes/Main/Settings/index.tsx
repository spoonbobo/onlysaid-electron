import { Box, Typography } from "@mui/material";
import { UserSettingsSubcategories } from "@/renderer/stores/User/UserSettings";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import SettingsSection from "@/renderer/components/Settings/SettingsSection";
import UserPreferences from "./UserSettings/UserPreference";
import DeleteAccount from "./UserSettings/DeleteAccount";
import LLMConfiguration from "./LLMAPI";
import LLMSettings from "./LLMSettings";
import DebugMode from "./UserSettings/DebugMode";
import { FormattedMessage } from "react-intl";
import MCPSettings from "./MCP/index";
import MCPConfiguration from "./MCP/MCPSettings";
import PrivateKB from "./KnowledgeBase";
import KBSettings from "./KnowledgeBase/KBSettings";
import UserAPIKeys from "./UserSettings/UserAPIKeys";

function Settings() {
  const { selectedTopics } = useCurrentTopicContext();

  const selectedSubcategory = selectedTopics['settings'] || UserSettingsSubcategories.User;

  const renderContent = () => {
    switch (selectedSubcategory) {
      case UserSettingsSubcategories.User:
        return <UserPreferences />;

      case UserSettingsSubcategories.UserAPIKeys:
        return <UserAPIKeys />;

      case UserSettingsSubcategories.DeleteAccount:
        return <DeleteAccount />;

      case UserSettingsSubcategories.LLMModels:
        return <LLMConfiguration />;

      case UserSettingsSubcategories.LLMSettings:
        return <LLMSettings />;

      case UserSettingsSubcategories.DebugMode:
        return <DebugMode />;

      case UserSettingsSubcategories.KBSettings:
        return <KBSettings />;

      case UserSettingsSubcategories.KB:
        return <PrivateKB />;

      case UserSettingsSubcategories.MCP:
        return <MCPSettings />;

      case UserSettingsSubcategories.MCPConfiguration:
        return <MCPConfiguration />;

      default:
        return (
          <SettingsSection title="Select a settings category">
            <Typography>Please select a settings category from the menu</Typography>
          </SettingsSection>
        );
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        <FormattedMessage id={`settings.${selectedSubcategory}`} />
      </Typography>
      {renderContent()}
    </Box>
  );
}

export default Settings;

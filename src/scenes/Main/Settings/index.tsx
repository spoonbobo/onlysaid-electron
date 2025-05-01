import { Box, Typography } from "@mui/material";
import { useUserSettingsStore, UserSettingsSubcategories } from "../../../stores/User/UserSettings";
import SettingsSection from "../../../components/Settings/SettingsSection";
import UserPreferences from "./UserSettings/User";
import DeleteAccount from "./UserSettings/DeleteAccount";
import PublicLLMConfiguration from "./LLMModels/Public";
import PrivateLLMConfiguration from "./LLMModels/Private";
import LLMSettings from "./LLMSettings";
function Settings() {
  const selectedSubcategory = useUserSettingsStore(state => state.selectedSubcategory);

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
      <Typography variant="h4" sx={{ mb: 3 }}>{selectedSubcategory}</Typography>
      {renderContent()}
    </Box>
  );
}

export default Settings;

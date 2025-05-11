import { Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import MenuListItem from "@/components/Navigation/MenuListItem";
import { UserSettingsSubcategories } from "@/stores/User/UserSettings";

interface LLMSettingsSectionProps {
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  UserSettingsSubcategories: typeof UserSettingsSubcategories;
}

export default function LLMSettingsSection({
  selectedSubcategory,
  setSelectedSubcategory,
  UserSettingsSubcategories,
}: LLMSettingsSectionProps) {
  return (
    <Box sx={{ mt: 1 }}>
      <MenuListItem
        label={<FormattedMessage id="settings.llmSettings" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.LLMSettings}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.LLMSettings)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
      <MenuListItem
        label={<FormattedMessage id="settings.llm.apiKeys" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.LLMModels}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.LLMModels)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
    </Box>
  );
}
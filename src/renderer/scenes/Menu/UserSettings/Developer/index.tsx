import { Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { UserSettingsSubcategories } from "@/renderer/stores/User/UserSettings";

interface DeveloperSettingsSectionProps {
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  UserSettingsSubcategories: typeof UserSettingsSubcategories;
}

export default function DeveloperSettingsSection({
  selectedSubcategory,
  setSelectedSubcategory,
  UserSettingsSubcategories,
}: DeveloperSettingsSectionProps) {
  return (
    <Box sx={{ mt: 1 }}>
      <MenuListItem
        label={<FormattedMessage id="settings.apiKey" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.DeveloperAPI}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.DeveloperAPI)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
      <MenuListItem
        label={<FormattedMessage id="settings.debugMode" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.DebugMode}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.DebugMode)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
    </Box>
  );
}

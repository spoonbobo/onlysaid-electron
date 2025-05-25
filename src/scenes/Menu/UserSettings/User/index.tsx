import { Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import MenuListItem from "@/components/Navigation/MenuListItem";
import { UserSettingsSubcategories } from "@/stores/User/UserSettings";

interface UserSettingsSectionProps {
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  UserSettingsSubcategories: typeof UserSettingsSubcategories;
}

export default function UserSettingsSection({
  selectedSubcategory,
  setSelectedSubcategory,
  UserSettingsSubcategories,
}: UserSettingsSectionProps) {
  return (
    <Box sx={{ mt: 1 }}>
      <MenuListItem
        label={<FormattedMessage id="settings.general" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.User}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.User)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
      <MenuListItem
        label={<FormattedMessage id="settings.apiKeys" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.UserAPIKeys}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.UserAPIKeys)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
    </Box>
  );
}
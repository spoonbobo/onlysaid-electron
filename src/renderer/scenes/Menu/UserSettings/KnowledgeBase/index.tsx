import { Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { UserSettingsSubcategories } from "@/renderer/stores/User/UserSettings";

interface KBSettingsSectionProps {
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  UserSettingsSubcategories: typeof UserSettingsSubcategories;
}

export default function KBSettingsSection({
  selectedSubcategory,
  setSelectedSubcategory,
  UserSettingsSubcategories,
}: KBSettingsSectionProps) {
  return (
    <Box sx={{ mt: 1 }}>
      <MenuListItem
        label={<FormattedMessage id="settings.kbSettings" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.KBSettings}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.KBSettings)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
      <MenuListItem
        label={<FormattedMessage id="settings.kb" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.KB}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.KB)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
    </Box>
  );
}

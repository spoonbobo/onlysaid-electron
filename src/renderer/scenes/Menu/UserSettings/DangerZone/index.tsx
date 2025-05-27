import { Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { UserSettingsSubcategories } from "@/renderer/stores/User/UserSettings";

interface DangerZoneSectionProps {
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  UserSettingsSubcategories: typeof UserSettingsSubcategories;
}

export default function DangerZoneSection({
  selectedSubcategory,
  setSelectedSubcategory,
  UserSettingsSubcategories,
}: DangerZoneSectionProps) {
  return (
    <Box sx={{ mt: 1 }}>
      <MenuListItem
        label={<FormattedMessage id="settings.deleteAccount" />}
        textColor="error.main"
        isSelected={selectedSubcategory === UserSettingsSubcategories.DeleteAccount}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.DeleteAccount)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14, color: "error.main" }}
      />
    </Box>
  );
}

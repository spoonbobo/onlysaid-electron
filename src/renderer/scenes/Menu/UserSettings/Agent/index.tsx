import { Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { UserSettingsSubcategories } from "@/renderer/stores/User/UserSettings";

interface AgentSettingsSectionProps {
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  UserSettingsSubcategories: typeof UserSettingsSubcategories;
}

export default function AgentSettingsSection({
  selectedSubcategory,
  setSelectedSubcategory,
  UserSettingsSubcategories,
}: AgentSettingsSectionProps) {
  return (
    <Box sx={{ mt: 1 }}>
      <MenuListItem
        label={<FormattedMessage id="settings.agentSettings" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.AgentSettings}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.AgentSettings)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
    </Box>
  );
} 
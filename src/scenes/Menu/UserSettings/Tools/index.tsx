import { Box } from "@mui/material";
import { FormattedMessage } from "react-intl";
import MenuListItem from "@/components/Navigation/MenuListItem";
import { UserSettingsSubcategories } from "@/stores/User/UserSettings";

interface ToolsSettingsSectionProps {
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategory: string) => void;
  UserSettingsSubcategories: typeof UserSettingsSubcategories;
}

export default function ToolsSettingsSection({
  selectedSubcategory,
  setSelectedSubcategory,
  UserSettingsSubcategories,
}: ToolsSettingsSectionProps) {
  return (
    <Box sx={{ mt: 1 }}>
      <MenuListItem
        label={<FormattedMessage id="settings.mcpConfiguration" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.MCPConfiguration}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.MCPConfiguration)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
      <MenuListItem
        label={<FormattedMessage id="settings.mcp" />}
        isSelected={selectedSubcategory === UserSettingsSubcategories.MCP}
        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.MCP)}
        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
      />
    </Box>
  );
}
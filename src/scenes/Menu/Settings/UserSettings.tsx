import { Box, Tooltip, IconButton } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import BuildIcon from "@mui/icons-material/Build";
import CodeIcon from "@mui/icons-material/Code";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import { FormattedMessage } from "react-intl";
import { UserSettingsSubcategories } from "@/stores/User/UserSettings";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import MenuSection from "@/components/Navigation/MenuSection";
import MenuListItem from "@/components/Navigation/MenuListItem";

export default function UserSettings() {
    const {
        selectedTopics,
        setSelectedTopic,
        selectedContext,
    } = useCurrentTopicContext();

    // Create key for component instance based on context
    const settingsKey = `settings-${selectedContext?.name || "unknown"}`;

    // Get the active section from context
    const activeSection = selectedContext?.section || 'user';
    const selectedSubcategory = selectedTopics['settings'] || UserSettingsSubcategories.User;

    // Set the selected subcategory
    const setSelectedSubcategory = (subcategory: string) => {
        if (selectedContext) {
            setSelectedTopic('settings', subcategory);
        }
    };

    // Handle action for the settings (configure, etc)
    const handleAction = (action: string) => {
        // Implement configure action
    };


    return (
        <Box key={settingsKey} sx={{ mt: 2, px: 2 }}>


            {/* Show section-specific subitems only when a section is active */}
            {activeSection === 'user' && (
                <Box sx={{ mt: 1 }}>
                    <MenuListItem
                        label={<FormattedMessage id="settings.general" />}
                        isSelected={selectedSubcategory === UserSettingsSubcategories.User}
                        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.User)}
                        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14 }}
                    />
                </Box>
            )}

            {activeSection === 'llmSettings' && (
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
            )}

            {activeSection === 'kb' && (
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
            )}

            {activeSection === 'tools' && (
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
            )}

            {activeSection === 'developer' && (
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
            )}

            {activeSection === 'dangerZone' && (
                <Box sx={{ mt: 1 }}>
                    <MenuListItem
                        label={<FormattedMessage id="settings.deleteAccount" />}
                        textColor="error.main"
                        isSelected={selectedSubcategory === UserSettingsSubcategories.DeleteAccount}
                        onClick={() => setSelectedSubcategory(UserSettingsSubcategories.DeleteAccount)}
                        sx={{ pl: 4, py: 0.5, minHeight: 28, fontSize: 14, color: "error.main" }}
                    />
                </Box>
            )}
        </Box>
    );
}
import { Box, Typography } from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import SettingsIcon from "@mui/icons-material/Settings";
import SchoolIcon from "@mui/icons-material/School";
import NotificationsIcon from "@mui/icons-material/Notifications";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import StorageIcon from "@mui/icons-material/Storage";

export default function WorkspaceSettingsMenu() {
  const intl = useIntl();
  const { selectedContext } = useCurrentTopicContext();
  const selectedTopics = useTopicStore((state) => state.selectedTopics);
  const setSelectedTopic = useTopicStore((state) => state.setSelectedTopic);

  const workspaceId = selectedContext?.id || '';
  const section = selectedContext?.section || '';
  const selectedSubcategory = section ? selectedTopics[section] || '' : '';

  const handleSelectSettings = (settingsType: string) => {
    setSelectedTopic(section, settingsType);
  };

  // Available settings categories
  const settingsCategories = [
    // {
    //   id: 'general',
    //   name: intl.formatMessage({ id: "workspace.settings.categories.general", defaultMessage: "General Settings" }),
    //   icon: SettingsIcon,
    //   disabled: false
    // },
    {
      id: 'moodle',
      name: intl.formatMessage({ id: "workspace.settings.categories.moodle", defaultMessage: "Moodle Integration" }),
      icon: SchoolIcon,
      disabled: false
    },
    {
      id: 'integrations',
      name: intl.formatMessage({ id: "workspace.settings.categories.integrations", defaultMessage: "Integrations" }),
      icon: IntegrationInstructionsIcon,
      disabled: true
    },
    {
      id: 'notifications',
      name: intl.formatMessage({ id: "workspace.settings.categories.notifications", defaultMessage: "Notifications" }),
      icon: NotificationsIcon,
      disabled: true
    },
    {
      id: 'storage',
      name: intl.formatMessage({ id: "workspace.settings.categories.storage", defaultMessage: "Storage & Data" }),
      icon: StorageIcon,
      disabled: true
    }
  ];

  try {
    return (
      <Box sx={{ mt: 2, px: 2 }}>
        <Box sx={{ mt: 2 }}>
          {settingsCategories.filter(category => !category.disabled).length > 0 ? (
            settingsCategories.filter(category => !category.disabled).map((category) => {
              const IconComponent = category.icon;
              const isCategorySelected = selectedSubcategory === category.id;
              
              return (
                <Box key={category.id}>
                  <MenuListItem
                    label={
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        width: '100%',
                        pr: 1
                      }}>
                        <IconComponent sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {category.name}
                        </Typography>
                      </Box>
                    }
                    isSelected={isCategorySelected}
                    onClick={() => !category.disabled && handleSelectSettings(category.id)}
                    sx={{ 
                      pl: 4,
                      py: 1.5,
                      opacity: category.disabled ? 0.5 : 1,
                      cursor: category.disabled ? 'not-allowed' : 'pointer',
                      pointerEvents: category.disabled ? 'none' : 'auto',
                      '& .MuiListItemText-root': {
                        margin: 0,
                      }
                    }}
                  />
                </Box>
              );
            })
          ) : (
            <Box sx={{ pl: 4, py: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
              <FormattedMessage id="workspace.settings.noCategories" defaultMessage="No settings categories available" />
            </Box>
          )}
        </Box>
      </Box>
    );
  } catch (error) {
    console.error("Error in WorkspaceSettingsMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        An error occurred loading the settings menu.
      </Box>
    );
  }
}

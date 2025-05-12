import { MenuItem, ListSubheader, Divider, Tooltip, IconButton } from "@mui/material";
import { FormattedMessage } from "react-intl";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import BuildIcon from "@mui/icons-material/Build";
import CodeIcon from "@mui/icons-material/Code";
import LogoutIcon from "@mui/icons-material/Logout";
import { useTopicStore } from "@/stores/Topic/TopicStore";

type SettingsMenuItemsProps = {
  handleClose: () => void;
};

function SettingsMenuItems({ handleClose }: SettingsMenuItemsProps) {
  const setSelectedContext = useTopicStore((state) => state.setSelectedContext);

  const handleNavigateToSection = (section: string) => {
    setSelectedContext({
      type: 'settings',
      name: 'settings',
      section: section
    });
    handleClose();
  };

  return (
    <>
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.settings" />
      </ListSubheader>

      <MenuItem onClick={() => handleNavigateToSection('user')} sx={{ minHeight: 36, fontSize: 14 }}>
        <PersonOutlineIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="settings.user" />
      </MenuItem>

      <MenuItem onClick={() => handleNavigateToSection('llmSettings')} sx={{ minHeight: 36, fontSize: 14 }}>
        <SmartToyIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="settings.models" />
      </MenuItem>

      <MenuItem onClick={() => handleNavigateToSection('kb')} sx={{ minHeight: 36, fontSize: 14 }}>
        <MenuBookIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="settings.knowledgeBase" />
      </MenuItem>

      <MenuItem onClick={() => handleNavigateToSection('tools')} sx={{ minHeight: 36, fontSize: 14 }}>
        <BuildIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="settings.tools" />
      </MenuItem>

      <MenuItem onClick={() => handleNavigateToSection('developer')} sx={{ minHeight: 36, fontSize: 14 }}>
        <CodeIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="settings.developer" />
      </MenuItem>

      <Divider sx={{ my: 1 }} />

      <MenuItem onClick={() => handleNavigateToSection('logout')} sx={{ minHeight: 36, fontSize: 14, color: "error.main" }}>
        <LogoutIcon fontSize="small" sx={{ mr: 1.5, color: "error.main" }} />
        <FormattedMessage id="menu.settings.logout" />
      </MenuItem>
    </>
  );
}

// Add actions for settings
export const renderSettingsActions = ({
  selectedSection,
  handleAction
}: {
  selectedSection: string | null,
  handleAction?: (action: string) => void
}) => {
  if (!selectedSection) return null;

  switch (selectedSection) {
    case 'user':
    case 'llmSettings':
    case 'kb':
    case 'tools':
    case 'developer':
    default:
      return null;
  }
};

export default SettingsMenuItems;
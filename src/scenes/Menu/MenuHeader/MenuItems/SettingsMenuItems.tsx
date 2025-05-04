import { MenuItem, ListSubheader, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpIcon from "@mui/icons-material/Help";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

type SettingsMenuItemsProps = {
  handleClose: () => void;
};

function SettingsMenuItems({ handleClose }: SettingsMenuItemsProps) {
  return (
    <>
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.settings" />
      </ListSubheader>
      <MenuItem onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
        <SettingsIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.settings.account" />
      </MenuItem>
      <MenuItem onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
        <HelpIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.settings.notificationPreferences" />
      </MenuItem>
      <MenuItem onClick={handleClose} sx={{ minHeight: 36, fontSize: 14, color: "error.main" }}>
        <ExitToAppIcon fontSize="small" sx={{ mr: 1.5, color: "error.main" }} />
        <FormattedMessage id="menu.settings.logout" />
      </MenuItem>
    </>
  );
}

export default SettingsMenuItems;
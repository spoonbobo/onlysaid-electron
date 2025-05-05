import { MenuItem, ListSubheader, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpIcon from "@mui/icons-material/Help";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { WindowTab } from "@/stores/Topic/WindowStore";

type TeamMenuItemsProps = {
  handleClose: () => void;
  parentTab?: WindowTab;
};

function TeamMenuItems({ handleClose, parentTab }: TeamMenuItemsProps) {
  return (
    <>
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.team" />
      </ListSubheader>
      <MenuItem onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
        <AccountCircleIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.team.addNewChat" />
      </MenuItem>

      <Divider sx={{ my: 1 }} />

      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.team.options" />
      </ListSubheader>
      <MenuItem onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
        <SettingsIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.team.plans" />
      </MenuItem>
      <MenuItem onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
        <HelpIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.team.calendar" />
      </MenuItem>

      <Divider sx={{ my: 1 }} />

      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.team.manage" />
      </ListSubheader>
      <MenuItem onClick={handleClose} sx={{ minHeight: 36, fontSize: 14, color: "error.main" }}>
        <ExitToAppIcon fontSize="small" sx={{ mr: 1.5, color: "error.main" }} />
        <FormattedMessage id="menu.team.exit" />
      </MenuItem>
    </>
  );
}

export default TeamMenuItems;
import { Box, Typography, IconButton, Menu, MenuItem, ListSubheader, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HelpIcon from "@mui/icons-material/Help";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AddNewFriend from "@/components/Dialog/AddNewFriend";

function MenuHeader() {
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const renderMenuItems = () => {
    switch (selectedContext?.type) {
      case 'home':
        return [
          <ListSubheader key="home-friends-header" sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
            <FormattedMessage id="menu.home.friends" />
          </ListSubheader>,
          <MenuItem key="home-add-friend" onClick={() => {
            handleClose();
            setShowAddFriendDialog(true);
          }} sx={{ minHeight: 36, fontSize: 14 }}>
            <AccountCircleIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            <FormattedMessage id="menu.home.addNewFriend" />
          </MenuItem>,

          <Divider key="home-divider-1" sx={{ my: 1 }} />,
          <ListSubheader key="home-agents-header" sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
            <FormattedMessage id="menu.home.agents" />
          </ListSubheader>,
          <MenuItem key="home-new-chat" onClick={() => {
            handleClose();
            console.log('New chat clicked');
          }} sx={{ minHeight: 36, fontSize: 14 }}>
            <AccountCircleIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            <FormattedMessage id="menu.home.newChat" />
          </MenuItem>
        ];
      case 'team':
        return [
          <ListSubheader key="team-header" sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
            <FormattedMessage id="menu.team" />
          </ListSubheader>,
          <MenuItem key="team-add-chat" onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
            <AccountCircleIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            <FormattedMessage id="menu.team.addNewChat" />
          </MenuItem>,

          <Divider key="team-divider-1" sx={{ my: 1 }} />,

          <ListSubheader key="team-options-header" sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
            <FormattedMessage id="menu.team.options" />
          </ListSubheader>,
          <MenuItem key="team-plans" onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
            <SettingsIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            <FormattedMessage id="menu.team.plans" />
          </MenuItem>,
          <MenuItem key="team-calendar" onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
            <HelpIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            <FormattedMessage id="menu.team.calendar" />
          </MenuItem>,

          <Divider key="team-divider-2" sx={{ my: 1 }} />,

          <ListSubheader key="team-manage-header" sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
            <FormattedMessage id="menu.team.manage" />
          </ListSubheader>,
          <MenuItem key="team-exit" onClick={handleClose} sx={{ minHeight: 36, fontSize: 14, color: "error.main" }}>
            <ExitToAppIcon fontSize="small" sx={{ mr: 1.5, color: "error.main" }} />
            <FormattedMessage id="menu.team.exit" />
          </MenuItem>
        ];
      case 'settings':
        return [
          <ListSubheader key="settings-header" sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
            <FormattedMessage id="menu.settings" />
          </ListSubheader>,
          <MenuItem key="settings-account" onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
            <SettingsIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            <FormattedMessage id="menu.settings.account" />
          </MenuItem>,
          <MenuItem key="settings-notifications" onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
            <HelpIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            <FormattedMessage id="menu.settings.notificationPreferences" />
          </MenuItem>,
          <MenuItem key="settings-logout" onClick={handleClose} sx={{ minHeight: 36, fontSize: 14, color: "error.main" }}>
            <ExitToAppIcon fontSize="small" sx={{ mr: 1.5, color: "error.main" }} />
            <FormattedMessage id="menu.settings.logout" />
          </MenuItem>
        ];
      default:
        return [
          <MenuItem key="default-options" onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
            <HelpIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            <FormattedMessage id="menu.options" />
          </MenuItem>
        ];
    }
  };
  return (
    <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
        <FormattedMessage id={`menu.${selectedContext?.name}`} />
      </Typography>

      <IconButton onClick={handleClick} size="small">
        <MoreVertIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {renderMenuItems()}

        {selectedContext?.type === 'settings' && <Divider sx={{ my: 1 }} />}
      </Menu>

      <AddNewFriend open={showAddFriendDialog} onClose={() => setShowAddFriendDialog(false)} />
    </Box>
  );
}

export default MenuHeader;
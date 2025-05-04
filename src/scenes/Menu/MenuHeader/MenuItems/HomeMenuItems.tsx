import { MenuItem, ListSubheader, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

type HomeMenuItemsProps = {
  handleClose: () => void;
  setShowAddFriendDialog: (show: boolean) => void;
  handleCreateChatroom: () => void;
};

function HomeMenuItems({ handleClose, setShowAddFriendDialog, handleCreateChatroom }: HomeMenuItemsProps) {
  return (
    <>
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.home.friends" />
      </ListSubheader>
      <MenuItem onClick={() => {
        handleClose();
        setShowAddFriendDialog(true);
      }} sx={{ minHeight: 36, fontSize: 14 }}>
        <AccountCircleIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.home.addNewFriend" />
      </MenuItem>

      <Divider sx={{ my: 1 }} />
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.home.agents" />
      </ListSubheader>
      <MenuItem onClick={() => {
        handleClose();
        handleCreateChatroom();
      }} sx={{ minHeight: 36, fontSize: 14 }}>
        <AccountCircleIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.home.newChat" />
      </MenuItem>
    </>
  );
}

export default HomeMenuItems;
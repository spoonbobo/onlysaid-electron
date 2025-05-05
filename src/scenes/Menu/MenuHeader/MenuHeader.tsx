import { Box, Typography, IconButton, Menu, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useWindowStore, WindowTab } from "@/stores/Topic/WindowStore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import AddNewFriend from "@/components/Dialog/AddNewFriend";
import HomeMenuItems from "./MenuItems/HomeMenuItems";
import TeamMenuItems from "./MenuItems/TeamMenuItems";
import SettingsMenuItems from "./MenuItems/SettingsMenuItems";
import DefaultMenuItems from "./MenuItems/DefaultMenuItems";
import { useUserStore } from "@/stores/User/UserStore";

// Add parent tab to props
interface MenuHeaderProps {
  parentTab?: WindowTab;
}

function MenuHeader({ parentTab }: MenuHeaderProps) {
  const user = useUserStore((state) => state.user);
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const createChat = useChatStore((state) => state.createChat);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCreateChat = async () => {
    if (user?.id) {
      await createChat(user.id, 'agent');
    }
  };

  const renderMenuItems = () => {
    switch (selectedContext?.type) {
      case 'home':
        return <HomeMenuItems
          handleClose={handleClose}
          setShowAddFriendDialog={setShowAddFriendDialog}
          handleCreateChat={handleCreateChat}
          parentTab={parentTab} // Pass parent tab to menu items
        />;
      case 'team':
        return <TeamMenuItems
          handleClose={handleClose}
          parentTab={parentTab} // Pass parent tab to menu items
        />;
      case 'settings':
        return <SettingsMenuItems
          handleClose={handleClose}
          parentTab={parentTab} // Pass parent tab to menu items
        />;
      default:
        return <DefaultMenuItems
          handleClose={handleClose}
          parentTab={parentTab} // Pass parent tab to menu items
        />;
    }
  };

  return (
    <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
        {/* {parentTab && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            {parentTab.title}:
          </Typography>
        )} */}
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
import { Box, Typography, ListItemButton, ListItemText } from "@mui/material";
import { useState } from "react";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Popover from "@mui/material/Popover";
import SubMenu from "./SubMenu";
import Chatroom from "./Chatroom";
import { useMenuStore } from "../../stores/Menu/MenuStore";
import UserSettings from "./Settings/UserSettings";
import { useIntl } from "../../providers/IntlProvider";
import { FormattedMessage } from "react-intl";

const menuComponentMap: Record<string, React.ReactNode> = {
  Chatroom: <Chatroom />,
  "User Settings": <UserSettings />,
  // Plans: <Plans />,
  // Add more mappings as needed
};

function Menu() {
  const intl = useIntl();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const selectedMenu = useMenuStore((s) => s.selectedMenu);

  const handleMainMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMainMenuClose = () => {
    setAnchorEl(null);
  };

  const mainMenuOpen = Boolean(anchorEl);

  const ContentComponent = menuComponentMap[selectedMenu] || (
    <Box p={2}>Select a menu item</Box>
  );

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{
        borderBottom: 1,
        borderColor: "divider"
      }}>
        <ListItemButton
          sx={{
            width: "100%",
            px: 2,
            py: 0.5,
            minHeight: 36,
            justifyContent: "flex-start",
            textAlign: "left",
          }}
          onClick={handleMainMenuClick}
        >
          <ListItemText
            primary={
              <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", textAlign: "left" }}>
                <FormattedMessage id={`menu.${selectedMenu.toLowerCase()}`} />
              </Typography>
            }
          />
          <Box sx={{ flexGrow: 1 }} />
          {mainMenuOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Popover
          open={mainMenuOpen}
          anchorEl={anchorEl}
          onClose={handleMainMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 220,
                borderRadius: 2,
                boxShadow: 6,
                p: 1,
                bgcolor: "background.paper",
              },
            },
          }}
        >
          <SubMenu onItemClick={handleMainMenuClose} />
        </Popover>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto" }}>
        {ContentComponent}
      </Box>
    </Box>
  );
}

export default Menu;
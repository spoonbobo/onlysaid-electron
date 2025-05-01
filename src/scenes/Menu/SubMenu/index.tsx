import {
  ListSubheader,
  MenuItem,
  Divider,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import EventIcon from "@mui/icons-material/Event";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CodeIcon from "@mui/icons-material/Code";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { MenuItems, useMenuStore } from "../../../stores/Menu/MenuStore";
import { useIntl } from "../../../providers/IntlProvider";
import { FormattedMessage } from "react-intl";

const SubMenu = ({ onItemClick }: { onItemClick?: () => void }) => {
  const setSelectedMenu = useMenuStore((s) => s.setSelectedMenu);
  const intl = useIntl();
  return (
    <>
      {/* Chatroom Section */}
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.chatroom" />
      </ListSubheader>
      <MenuItem
        sx={{ minHeight: 36, fontSize: 14 }}
        onClick={() => {
          setSelectedMenu(MenuItems.Chatroom);
          onItemClick?.();
        }}
      >
        <ChatIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.chatroom" />
      </MenuItem>
      <Divider sx={{ my: 1 }} />

      {/* Plan Section */}
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.plan" />
      </ListSubheader>
      <MenuItem
        sx={{ minHeight: 36, fontSize: 14 }}
        onClick={() => {
          setSelectedMenu(MenuItems.Plan);
          onItemClick?.();
        }}
      >
        <EventIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.plans" />
      </MenuItem>
      <MenuItem
        sx={{ minHeight: 36, fontSize: 14 }}
        onClick={() => {
          setSelectedMenu(MenuItems.Calendar);
          onItemClick?.();
        }}
      >
        <CalendarMonthIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.calendar" />
      </MenuItem>
      <Divider sx={{ my: 1 }} />

      {/* Workbench Section */}
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.workbench" />
      </ListSubheader>
      <MenuItem
        sx={{ minHeight: 36, fontSize: 14 }}
        onClick={() => {
          setSelectedMenu(MenuItems.FileExplorer);
          onItemClick?.();
        }}
      >
        <FolderOpenIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.fileExplorer" />
      </MenuItem>
      <MenuItem
        sx={{ minHeight: 36, fontSize: 14 }}
        onClick={() => {
          setSelectedMenu(MenuItems.CodeEditor);
          onItemClick?.();
        }}
      >
        <CodeIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.codeEditor" />
      </MenuItem>
      <Divider sx={{ my: 1 }} />

      {/* Exit */}
      <MenuItem
        sx={{ minHeight: 36, fontSize: 14, color: "error.main", fontWeight: 600 }}
        onClick={() => {
          setSelectedMenu(MenuItems.Exit);
          onItemClick?.();
        }}
      >
        <ExitToAppIcon fontSize="small" sx={{ mr: 1.5, color: "error.main" }} />
        <FormattedMessage id="menu.exit" />
      </MenuItem>
    </>
  );
};

export default SubMenu;

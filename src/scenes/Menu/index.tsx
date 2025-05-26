import { Box } from "@mui/material";
import WorkspaceMenu from "./Workspace";
import UserSettings from "./UserSettings";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { useFileExplorerStore } from "@/stores/Layout/FileExplorerResize";
import HomeMenu from "./Home";
import FileExplorer from "@/scenes/Menu/FileExplorer";
import MenuHeader from "./Header";
import React from "react";
import CalendarMenu from "./Calendar";
const MIN_CONTENT_HEIGHT = 50;

function Menu() {
  const { selectedContext } = useCurrentTopicContext();
  const selectedContextType = selectedContext?.type || "";
  const { isExpanded } = useFileExplorerStore();

  const menuKey = React.useMemo(() =>
    `${selectedContextType}-${selectedContext?.name || "unknown"}`,
    [selectedContextType, selectedContext?.name]
  );

  const MenuComponent = React.useMemo(() => {
    switch (selectedContextType) {
      case "workspace": return WorkspaceMenu;
      case "settings": return UserSettings;
      case "home": return HomeMenu;
      case "calendar": return CalendarMenu;
      default: return () => <Box p={2}>Select a menu item</Box>;
    }
  }, [selectedContextType]);

  return (
    <Box id="menu-container" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box id="menu-header-wrapper">
        <MenuHeader />
      </Box>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: "hidden"
      }}>
        <Box sx={{
          flex: 1,
          overflow: "auto",
          minHeight: `${MIN_CONTENT_HEIGHT}px`,
          flexShrink: isExpanded ? 1 : 0
        }}>
          <MenuComponent key={menuKey} />
        </Box>
        <FileExplorer minContentHeightAbove={MIN_CONTENT_HEIGHT} />
      </Box>
    </Box>
  );
}

export default Menu;
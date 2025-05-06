import { Box } from "@mui/material";
import Chat from "./Chat";
import UserSettings from "./Settings/UserSettings";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { useFileExplorerStore } from "@/stores/Layout/FileExplorerResize";
import HomeMenu from "./Home";
import FileExplorer from "@/components/FileExplorer/FileExplorer";
import MenuHeader from "./MenuHeader/MenuHeader";
import React from "react";

// Define minimum height for the content area above the file explorer
const MIN_CONTENT_HEIGHT = 50; // px

function Menu() {
  const { selectedContext, parentId } = useCurrentTopicContext();
  const { tabs } = useWindowStore();
  const selectedContextType = selectedContext?.type || "";
  const { isExpanded } = useFileExplorerStore();

  // Get parent window/tab
  const parentTab = tabs.find(tab => tab.id === parentId);

  // Use memoization to prevent excessive rerenders
  const menuKey = React.useMemo(() =>
    `${parentId || "no-parent"}-${selectedContextType}`,
    [parentId, selectedContextType]
  );

  // Render the menu component
  const MenuComponent = React.useMemo(() => {
    switch (selectedContextType) {
      case "team": return Chat;
      case "settings": return UserSettings;
      case "home": return HomeMenu;
      default: return () => <Box p={2}>Select a menu item</Box>;
    }
  }, [selectedContextType]);

  return (
    <Box id="menu-container" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box id="menu-header-wrapper">
        <MenuHeader parentTab={parentTab} />
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
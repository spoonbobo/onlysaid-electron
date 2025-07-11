import { Box } from "@mui/material";
import WorkspaceMenu from "./Workspace";
import UserSettings from "./UserSettings";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useFileExplorerStore } from "@/renderer/stores/Layout/FileExplorerResize";
import HomeMenu from "./Home";
import FileExplorer from "@/renderer/scenes/Menu/FileExplorer";
import MenuHeader from "./Header";
import React from "react";
import CalendarMenu from "./Calendar";
import MenuDefault from "./default";

const MIN_CONTENT_HEIGHT = 50;

function Menu() {
  const { selectedContext, selectedTopics } = useCurrentTopicContext();
  const selectedContextType = selectedContext?.type || "";
  const { isExpanded } = useFileExplorerStore();

  // Get the active context (like chatId) for the current section
  const activeContextId = selectedContext?.section ? selectedTopics[selectedContext.section] || null : null;

  const menuKey = React.useMemo(() =>
    `${selectedContextType}-${selectedContext?.name || "unknown"}-${activeContextId || "none"}`,
    [selectedContextType, selectedContext?.name, activeContextId]
  );

  const MenuComponent = React.useMemo(() => {
    switch (selectedContextType) {
      case "workspace": return WorkspaceMenu;
      case "settings": return UserSettings;
      case "home": return HomeMenu;
      case "calendar": return CalendarMenu;
      default: return MenuDefault;
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

import { Box } from "@mui/material";
import Chatroom from "./Chatroom";
import UserSettings from "./Settings/UserSettings";
import { useIntl } from "@/providers/IntlProvider";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import HomeMenu from "./Home";
import FileExplorer from "./FileExplorer/FileExplorer";
import MenuHeader from "./MenuHeader/MenuHeader";

const menuComponentMap: Record<string, React.ReactNode> = {
  team: <Chatroom />,
  settings: <UserSettings />,
  home: <HomeMenu />
};

// Define minimum height for the content area above the file explorer
const MIN_CONTENT_HEIGHT = 50; // px

function Menu() {
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const selectedContextType = selectedContext?.type || "";

  const ContentComponent = menuComponentMap[selectedContextType] || (
    <Box p={2}>Select a menu item</Box>
  );

  return (
    <Box id="menu-container" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box id="menu-header-wrapper">
        <MenuHeader />
      </Box>
      <Box sx={{ flex: 1, overflow: "auto", minHeight: `${MIN_CONTENT_HEIGHT}px` }}>
        {ContentComponent}
      </Box>
      <FileExplorer minContentHeightAbove={MIN_CONTENT_HEIGHT} />
    </Box>
  );
}

export default Menu;
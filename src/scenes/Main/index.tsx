import Chat from "./Chat";
import Settings from "./Settings";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { Box } from "@mui/material";
import { useEffect } from "react";
import Tabs from "../Tabs";

const menuComponents: Record<string, React.ReactNode> = {
  team: <Chat />,
  settings: <Settings />,
  home: <Chat />,
};

function Main() {
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const { activeTabId, tabs = [], closeTab, addTab } = useWindowStore();

  useEffect(() => {

    const activeTab = tabs.find(tab => tab?.id === activeTabId);
    if (selectedContext && activeTab && activeTab.context) {
      if (selectedContext.type !== activeTab.context.type) {
        console.warn("Context mismatch! selectedContext:", selectedContext.type,
          "vs activeTab.context:", activeTab.context.type);
      }
    }
  }, [selectedContext, activeTabId, tabs]);

  // Set up listener for menu events
  useEffect(() => {
    if (window.electron) {
      // Close tab listener
      const closeTabListener = window.electron.ipcRenderer.on('menu:close-tab', () => {
        if (activeTabId) {
          closeTab(activeTabId);
        }
      });

      // New tab listener
      const newTabListener = window.electron.ipcRenderer.on('menu:new-tab', () => {
        // Create a new tab with home context
        addTab({ name: "home", type: "home" });
      });

      return () => {
        closeTabListener();
        newTabListener();
      };
    }
  }, [activeTabId, closeTab, addTab]);

  // Get the active tab
  const activeTab = activeTabId ? tabs.find(tab => tab?.id === activeTabId) : null;
  const contextToRender = selectedContext || (activeTab?.context || null);
  const contextTypeToRender = contextToRender?.type || "home";

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Tabs />
      <Box sx={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {menuComponents[contextTypeToRender] || menuComponents.home}
      </Box>
    </Box>
  );
}

export default Main;

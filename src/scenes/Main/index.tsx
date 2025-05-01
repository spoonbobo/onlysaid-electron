import Chatroom from "./Chatroom";
import Settings from "./Settings";
import { useTopicStore } from "../../stores/Topic/TopicStore";
import { useWindowStore } from "../../stores/Topic/WindowStore";
import { Box, Typography } from "@mui/material";
import { useEffect } from "react";

const menuComponents: Record<string, React.ReactNode> = {
  team: <Chatroom />,
  settings: <Settings />,
  home: <Chatroom />,
};

function Main() {
  const selectedContext = useTopicStore((state) => state.selectedContext);
  const { activeTabId, tabs = [], closeTab, addTab } = useWindowStore();

  // Log current state for debugging
  useEffect(() => {
    console.log("Main - Selected Context:", selectedContext);
    console.log("Main - Active Tab ID:", activeTabId);
    console.log("Main - Tabs:", tabs);

    // Log any mismatch between selectedContext and active tab context
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

  // Use selected context from the store (primary source of truth)
  // Or fall back to the active tab's context if needed
  const contextToRender = selectedContext || (activeTab?.context || null);

  // Default to home if no context is available
  const contextTypeToRender = contextToRender?.type || "home";

  // Map the context type to the component name for display
  const componentTypeLabel = {
    home: "Home",
    team: "Team",
    settings: "Settings"
  }[contextTypeToRender] || "Home";

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          {contextToRender?.name
            ? contextToRender.name.charAt(0).toUpperCase() + contextToRender.name.slice(1)
            : componentTypeLabel}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {menuComponents[contextTypeToRender] || menuComponents.home}
      </Box>
    </Box>
  );
}

export default Main;

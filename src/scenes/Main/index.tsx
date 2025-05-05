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
  const { selectedContext, contextParents } = useTopicStore();
  const { activeTabId, tabs = [], closeTab, addTab } = useWindowStore();

  useEffect(() => {
    // Validate parent-child relationship between window and context
    const activeTab = tabs.find(tab => tab?.id === activeTabId);
    if (selectedContext && activeTab && activeTab.context) {
      const contextKey = `${selectedContext.name}:${selectedContext.type}`;
      const parentId = contextParents[contextKey];

      // Ensure parent relationship is correctly set
      if (parentId !== activeTabId) {
        console.warn("Parent-child relationship mismatch:", {
          contextKey,
          expectedParent: activeTabId,
          actualParent: parentId
        });

        // Fix the relationship
        useTopicStore.getState().setContextParent(contextKey, activeTabId || "");
      }

      // Also check context type consistency
      if (selectedContext.type !== activeTab.context.type) {
        console.warn("Context type mismatch:", {
          selectedContext: selectedContext.type,
          activeTabContext: activeTab.context.type
        });
      }
    }
  }, [selectedContext, activeTabId, tabs, contextParents]);

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
        // Parent relationship is set in the updated addTab function
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

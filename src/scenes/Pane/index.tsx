import { Box } from "@mui/material";
import { ReactNode } from "react";
import { useWindowStore } from "../../stores/Topic/WindowStore";

interface PaneProps {
  children?: ReactNode;
}

const Pane = ({ children }: PaneProps) => {
  const { activeTabId, tabs } = useWindowStore();

  // Get active tab information
  const activeTab = activeTabId ? tabs.find(tab => tab.id === activeTabId) : null;

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "auto",
        height: "100%"
      }}
      data-tab-id={activeTabId}
      data-context-type={activeTab?.context.type || "unknown"}
    >
      {children}
    </Box>
  );
};

export default Pane;

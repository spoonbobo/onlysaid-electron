import { Box } from "@mui/material";
import { ReactNode } from "react";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";

interface PaneProps {
  children?: ReactNode;
}

const Pane = ({ children }: PaneProps) => {
  const { activeTabId, tabs } = useWindowStore();
  const { selectedContext, parentId } = useCurrentTopicContext();

  const activeTab = activeTabId ? tabs.find(tab => tab.id === activeTabId) : null;

  if (parentId && parentId !== activeTabId && activeTabId) {
    console.warn("Parent-child relationship mismatch in Pane", {
      contextKey: selectedContext ? `${selectedContext.name}:${selectedContext.type}` : 'none',
      expectedParent: activeTabId,
      actualParent: parentId
    });
  }

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "auto",
        height: "100%"
      }}
      data-tab-id={activeTabId}
      data-context-type={activeTab?.context.type || "unknown"}
      data-parent-id={parentId}
    >
      {children}
    </Box>
  );
};

export default Pane;

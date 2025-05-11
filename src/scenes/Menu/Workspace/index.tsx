import { Box } from "@mui/material";

import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import WorkspaceChatMenu from "./Chat";

export default function WorkspaceMenu() {
  const { selectedContext } = useCurrentTopicContext();

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
  const menuKey = `${contextId}`;
  const section = selectedContext?.section || '';

  return (
    <Box key={menuKey}>
      {section.includes('chat') && <WorkspaceChatMenu />}
      {/* Add other section components when implemented */}
    </Box>
  );
}
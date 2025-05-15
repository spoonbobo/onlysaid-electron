import { Box } from "@mui/material";
import { useEffect } from "react";

import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import WorkspaceChatMenu from "./Chatroom";
import { useUserStore } from "@/stores/User/UserStore";
import { useSocketStore } from "@/stores/Socket/SocketStore";

export default function WorkspaceMenu() {
  const { selectedContext } = useCurrentTopicContext();
  const user = useUserStore((state) => state.user);
  const { joinWorkspace, isConnected, isInitialized } = useSocketStore();

  const workspaceId = selectedContext?.id;
  const section = selectedContext?.section || '';

  useEffect(() => {
    if (workspaceId && user?.id && isInitialized && isConnected) {
      console.log(`WorkspaceMenu: Joining workspace ${workspaceId}`);
      joinWorkspace(workspaceId);
    }
  }, [workspaceId, user?.id, isInitialized, isConnected, joinWorkspace]);

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
  const menuKey = `${contextId}`;

  return (
    <Box key={menuKey}>
      {section.includes('chat') && <WorkspaceChatMenu />}
      {/* Add other section components when implemented */}
    </Box>
  );
}
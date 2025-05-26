import { Box } from "@mui/material";
import { useEffect } from "react";

import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import WorkspaceChatMenu from "./Chatroom";
import { useUserStore } from "@/stores/User/UserStore";
import { useSocketStore } from "@/stores/Socket/SocketStore";
import KnowledgeBaseMenu from "./KnowledgeBase";

export default function WorkspaceMenu() {
  const { selectedContext } = useCurrentTopicContext();
  const user = useUserStore((state) => state.user);
  const { joinWorkspace, isConnected } = useSocketStore();

  const workspaceId = selectedContext?.id;
  const section = selectedContext?.section || '';

  useEffect(() => {
    if (workspaceId && user?.id && isConnected) {
      console.log(`WorkspaceMenu: Joining workspace ${workspaceId}`);
      joinWorkspace(workspaceId);
    }
  }, [workspaceId, user?.id, isConnected, joinWorkspace]);

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
  const menuKey = `${contextId}`;


  return (
    <Box key={menuKey} sx={{ p: 1 }}>
      {section.includes('chatroom') && <WorkspaceChatMenu />}
      {selectedContext?.type === 'workspace' && section.includes('knowledgeBase') && <KnowledgeBaseMenu />}
    </Box>
  );
}
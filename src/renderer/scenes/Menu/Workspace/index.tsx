import { Box } from "@mui/material";
import { useEffect } from "react";

import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import WorkspaceChatMenu from "./Chatroom";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useSocketStore } from "@/renderer/stores/Socket/SocketStore";
import KnowledgeBaseMenu from "./KnowledgeBase";
import MembersMenu from "./Members";
import WorkspaceInsightsMenu from "./Insights";

export default function WorkspaceMenu() {
  const { selectedContext, selectedTopics } = useCurrentTopicContext();
  const user = useUserStore((state) => state.user);
  const { joinWorkspace, isConnected } = useSocketStore();

  const workspaceId = selectedContext?.id;
  const section = selectedContext?.section || '';
  const sectionName = section.split(':')[1] || '';

  // Get the active context (like chatId) for the current section
  const activeContextId = selectedContext?.section ? selectedTopics[selectedContext.section] || null : null;

  useEffect(() => {
    if (workspaceId && user?.id && isConnected) {
      joinWorkspace(workspaceId);
    }
  }, [workspaceId, user?.id, isConnected, joinWorkspace]);

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
  const menuKey = `${contextId}-${activeContextId || 'none'}`;

  return (
    <Box key={menuKey} sx={{ p: 1 }}>
      {section.includes('chatroom') && <WorkspaceChatMenu />}
      {selectedContext?.type === 'workspace' && section.includes('knowledgeBase') && <KnowledgeBaseMenu />}
      {selectedContext?.type === 'workspace' && section.includes('members') && <MembersMenu />}
      {selectedContext?.type === 'workspace' && section.includes('insights') && <WorkspaceInsightsMenu />}
    </Box>
  );
}

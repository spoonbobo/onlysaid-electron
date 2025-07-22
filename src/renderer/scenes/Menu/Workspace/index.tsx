import { Box } from "@mui/material";
import { useEffect } from "react";

import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import WorkspaceChatMenu from "./Chatroom";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useSocketStore } from "@/renderer/stores/Socket/SocketStore";
import KnowledgeBaseMenu from "./KnowledgeBase";
import MembersMenu from "./Members";
import WorkspaceInsightsMenu from "./Insights";
import AvatarMenu from "./Avatar";
import MyPartnerMenu from "./MyPartner";

export default function WorkspaceMenu() {
  const { selectedContext, selectedTopics } = useCurrentTopicContext();
  const user = useUserStore((state) => state.user);
  const { joinWorkspace, isConnected } = useSocketStore();

  const workspaceId = selectedContext?.id;
  const section = selectedContext?.section || '';

  useEffect(() => {
    if (workspaceId && user?.id && isConnected) {
      joinWorkspace(workspaceId);
    }
  }, [workspaceId, user?.id, isConnected, joinWorkspace]);

  // Remove the key that causes unnecessary remounts
  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      p: 1 
    }}>
      {section.includes('chatroom') && <WorkspaceChatMenu />}
      {section.includes('avatar') && <AvatarMenu />}
      {selectedContext?.type === 'workspace' && section.includes('knowledgeBase') && <KnowledgeBaseMenu />}
      {selectedContext?.type === 'workspace' && section.includes('members') && <MembersMenu />}
      {selectedContext?.type === 'workspace' && section.includes('insights') && <WorkspaceInsightsMenu />}
      {selectedContext?.type === 'workspace' && section.includes('learningPartner') && <MyPartnerMenu />}
    </Box>
  );
}

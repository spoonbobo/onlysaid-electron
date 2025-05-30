import { Box } from "@mui/material";
import { useEffect } from "react";

import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import WorkspaceChatMenu from "./Chatroom";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useSocketStore } from "@/renderer/stores/Socket/SocketStore";
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import KnowledgeBaseMenu from "./KnowledgeBase";
import MembersMenu from "./Members";

export default function WorkspaceMenu() {
  const { selectedContext, selectedTopics } = useCurrentTopicContext();
  const user = useUserStore((state) => state.user);
  const { joinWorkspace, isConnected } = useSocketStore();
  const { addDummyWorkspaceNotification, enableMockNotifications } = useNotificationStore();

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

  // Mock notifications for current active context (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && enableMockNotifications && workspaceId && activeContextId) {
      const addContextNotifications = () => {
        // Add notifications to the specific active context occasionally
        if (Math.random() > 0.85) {
          addDummyWorkspaceNotification(workspaceId, sectionName, activeContextId);
        }
      };

      const interval = setInterval(addContextNotifications, 45000); // Every 45 seconds
      return () => clearInterval(interval);
    }
  }, [workspaceId, sectionName, activeContextId, enableMockNotifications, addDummyWorkspaceNotification]);

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
  const menuKey = `${contextId}-${activeContextId || 'none'}`;

  return (
    <Box key={menuKey} sx={{ p: 1 }}>
      {section.includes('chatroom') && <WorkspaceChatMenu />}
      {selectedContext?.type === 'workspace' && section.includes('knowledgeBase') && <KnowledgeBaseMenu />}
      {selectedContext?.type === 'workspace' && section.includes('members') && <MembersMenu />}
    </Box>
  );
}

import { Box, Typography, IconButton, Button } from "@mui/material";
import { useDebugStore } from "@/renderer/stores/Debug/DebugStore";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useSocketStore } from "@/renderer/stores/Socket/SocketStore";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useRef, useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { IChatMessage } from "@/../../types/Chat/Message";

interface DebugOverlayProps {
  mainInterfaceRenderCount: number;
}

export default function DebugOverlay({ mainInterfaceRenderCount }: DebugOverlayProps) {
  const { selectedContext, lastSections, selectedTopics } = useTopicStore();
  const { debugOverlayMinimized, setDebugOverlayMinimized } = useDebugStore();
  const { handleNewMessage } = useSocketStore();
  const { user } = useUserStore();
  const { workspaces } = useWorkspaceStore();
  const { chats } = useChatStore();

  const renderCountRef = useRef(0);
  const [startTime] = useState(Date.now());

  // Increment render counter without causing re-renders
  renderCountRef.current += 1;

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : 'none';
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const simulateIncomingMessage = async () => {
    try {
      // Create a fake user ID (different from current user)
      const fakeUserId = `fake_user_${Math.random().toString(36).substr(2, 8)}`;
      const currentUserId = user?.id;
      
      if (!currentUserId) {
        console.warn('No current user found for simulation');
        return;
      }

      // Prioritize workspace chat simulation
      let workspaceId = '';
      let targetChatId = '';
      let simulationContext = 'none';

      // First, try to use a workspace chat (preferably from available workspaces)
      if (workspaces.length > 0) {
        // Find the first workspace that has chats
        let foundWorkspaceChat = false;
        
        for (const workspace of workspaces) {
          const workspaceChats = chats.filter(chat => 
            chat.workspace_id === workspace.id && chat.type === 'workspace'
          );
          
          if (workspaceChats.length > 0) {
            workspaceId = workspace.id;
            // Use a different chat than the currently active one if possible
            const currentActiveChatId = selectedContext?.section ? 
              selectedTopics[selectedContext.section] : null;
            
            const alternativeChat = workspaceChats.find(chat => chat.id !== currentActiveChatId);
            targetChatId = alternativeChat ? alternativeChat.id : workspaceChats[0].id;
            simulationContext = `workspace: ${workspace.name}`;
            foundWorkspaceChat = true;
            break;
          }
        }

        // If no existing workspace chats found, but we have workspaces, use the first workspace
        if (!foundWorkspaceChat && workspaces.length > 0) {
          const firstWorkspace = workspaces[0];
          workspaceId = firstWorkspace.id;
          targetChatId = `debug_chat_${Math.random().toString(36).substr(2, 8)}`;
          simulationContext = `workspace: ${firstWorkspace.name} (temp chat)`;
        }
      } 
      
      // Fallback to agent chat if no workspaces available
      if (!workspaceId) {
        const agentChats = chats.filter(chat => chat.type === 'agent');
        if (agentChats.length > 0) {
          // Use a different agent chat than currently active if possible
          const currentActiveChatId = selectedContext?.section ? 
            selectedTopics[selectedContext.section] : null;
          
          const alternativeChat = agentChats.find(chat => chat.id !== currentActiveChatId);
          targetChatId = alternativeChat ? alternativeChat.id : agentChats[0].id;
          simulationContext = 'agent chat';
        } else {
          targetChatId = `debug_agent_chat_${Math.random().toString(36).substr(2, 8)}`;
          simulationContext = 'agent chat (temp)';
        }
      }

      // Create a simulated message from another user
      const simulatedMessage: IChatMessage = {
        id: uuidv4(),
        chat_id: targetChatId,
        sender: fakeUserId,
        text: `🧪 Debug: Simulated message from another user at ${new Date().toLocaleTimeString()}`,
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        status: 'sent',
        sender_object: {
          id: fakeUserId,
          username: 'DebugUser',
          display_name: 'Debug Test User',
          email: 'debug@test.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };

      // Simulate the message coming through the socket
      await handleNewMessage({
        message: simulatedMessage,
        workspaceId: workspaceId
      });

      console.log('🧪 Debug: Simulated incoming message:', {
        messageId: simulatedMessage.id,
        chatId: targetChatId,
        workspaceId: workspaceId || 'none',
        context: simulationContext,
        currentlyActive: selectedContext?.section ? selectedTopics[selectedContext.section] : 'none',
        shouldCreateNotification: targetChatId !== (selectedContext?.section ? selectedTopics[selectedContext.section] : null),
        text: simulatedMessage.text
      });

    } catch (error) {
      console.error('🧪 Debug: Error simulating message:', error);
    }
  };

  return (
    <Box sx={{
      width: '100%',
      bgcolor: 'background.paper',
      borderRadius: 1,
      overflow: 'hidden',
      border: '1px solid rgba(0, 0, 0, 0.08)'
    }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 1,
        bgcolor: 'primary.light',
        color: 'primary.contrastText'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          Debug Info
        </Typography>
        <IconButton
          size="small"
          onClick={() => setDebugOverlayMinimized(!debugOverlayMinimized)}
          sx={{ color: 'inherit', p: 0.2, height: 20, width: 20 }}
        >
          {debugOverlayMinimized ? "+" : "-"}
        </IconButton>
      </Box>

      {!debugOverlayMinimized && (
        <Box sx={{ p: 1 }}>
          <InfoRow
            label="Current Context"
            value={selectedContext
              ? (selectedContext.type === "workspace"
                ? `${selectedContext.id}:workspace`
                : `${selectedContext.name}:${selectedContext.type}`)
              : 'None'}
          />
          <InfoRow label="Context ID" value={selectedContext?.id || contextId || 'None'} />
          <InfoRow label="Section" value={selectedContext?.section || 'None'} />
          <InfoRow label="Last Section" value={selectedContext?.type ? lastSections[selectedContext.type] || 'None' : 'None'} />
          <InfoRow label="Selected Topic" value={selectedContext?.section ? selectedTopics[selectedContext.section] || 'None' : 'None'} />
          <InfoRow label="Available Workspaces" value={`${workspaces.length}`} />
          <InfoRow label="Available Chats" value={`${chats.length}`} />
          <InfoRow label="DebugOverlay Renders" value={`${renderCountRef.current}`} />
          <InfoRow label="MainIF Renders" value={`${mainInterfaceRenderCount}`} />
          <InfoRow label="Uptime" value={`${uptime}s`} />
          
          {/* Debug Actions */}
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 1, display: 'block' }}>
              Debug Actions:
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={simulateIncomingMessage}
              sx={{ 
                fontSize: '0.7rem',
                py: 0.3,
                px: 1,
                minHeight: 'auto',
                textTransform: 'none'
              }}
              fullWidth
            >
              🧪 Simulate Workspace Message
            </Button>
            <Typography variant="caption" sx={{ 
              color: 'text.disabled', 
              display: 'block', 
              mt: 0.5,
              fontSize: '0.65rem',
              fontStyle: 'italic'
            }}>
              Simulates message from workspace chat (prefers non-active chats)
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
        {label}:
      </Typography>
      <Typography variant="caption" sx={{
        maxWidth: '150px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        userSelect: 'text'
      }}>
        {value}
      </Typography>
    </Box>
  );
}

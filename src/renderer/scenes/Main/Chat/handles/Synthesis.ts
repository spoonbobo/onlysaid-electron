import { useEffect } from 'react';
import { IChatMessage } from "@/../../types/Chat/Message";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";

interface SynthesisHandlerProps {
  activeChatId: string | null;
  workspaceId: string;
  appendMessage: (chatId: string, message: IChatMessage) => void;
}

export const useSynthesisHandler = ({
  activeChatId,
  workspaceId,
  appendMessage
}: SynthesisHandlerProps) => {
  useEffect(() => {
    console.log('[Chat] Setting up LangGraph result synthesis listener...');
    
    const handleResultSynthesized = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; result: string; agentCards: any[] };
      
      console.log('[Chat] 🔮 Received LangGraph result synthesis:', {
        executionId: data.executionId,
        resultLength: data.result?.length || 0,
        agentCount: data.agentCards?.length || 0
      });
      
      if (!activeChatId) {
        console.warn('[Chat] No active chat ID, ignoring result synthesis');
        return;
      }
      
      const { agent } = useAgentStore.getState();
      if (!agent) {
        console.error('[Chat] No agent available for synthesis message');
        return;
      }
      
      const synthesisMessage: IChatMessage = {
        id: `langgraph-synthesis-${data.executionId}`,
        chat_id: activeChatId,
        sender: agent.id || '',
        sender_object: agent,
        text: data.result,
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        status: 'completed',
        workspace_id: workspaceId
      };
      
      try {
        // Save to database
        await window.electron.db.query({
          query: `
            INSERT OR REPLACE INTO messages 
            (id, chat_id, sender, text, created_at, sent_at, status, workspace_id)
            VALUES (@id, @chat_id, @sender, @text, @created_at, @sent_at, @status, @workspace_id)
          `,
          params: {
            id: synthesisMessage.id,
            chat_id: activeChatId,
            sender: agent.id,
            text: synthesisMessage.text,
            created_at: synthesisMessage.created_at,
            sent_at: synthesisMessage.sent_at,
            status: 'completed',
            workspace_id: workspaceId || null,
          }
        });
        
        console.log('[Chat] ✅ Synthesis message saved to database');
        
        // Add to UI
        appendMessage(activeChatId, synthesisMessage);
        
        console.log('[Chat] ✅ Synthesis message displayed in chat');
        
      } catch (error) {
        console.error('[Chat] ❌ Failed to save synthesis message:', error);
        // Still show in UI even if database save failed
        appendMessage(activeChatId, synthesisMessage);
      }
    };

    const unsubscribeResultSynthesis = window.electron?.ipcRenderer?.on?.('agent:result_synthesized', handleResultSynthesized);
    
    return () => {
      console.log('[Chat] Cleaning up LangGraph result synthesis listener');
      unsubscribeResultSynthesis?.();
    };
  }, [activeChatId, appendMessage, workspaceId]);
};

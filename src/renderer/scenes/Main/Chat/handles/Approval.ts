import { useEffect, useState, useCallback } from 'react';
import { IChatMessage, IChatMessageToolCall } from "@/../../types/Chat/Message";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useLLMStore } from "@/renderer/stores/LLM/LLMStore";
import { toast } from "@/utils/toast";

interface ApprovalHandlerProps {
  activeChatId: string | null;
  workspaceId: string;
  appendMessage: (chatId: string, message: IChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<IChatMessage>) => void;
}

export interface LangGraphInteraction {
  interactionId: string;
  request: any;
  messageType: string;
  messageId: string | null;
}

export const useApprovalHandler = ({
  activeChatId,
  workspaceId,
  appendMessage,
  updateMessage
}: ApprovalHandlerProps) => {
  // Add state for LangGraph interactions
  const [langGraphInteractions, setLangGraphInteractions] = useState<Map<string, LangGraphInteraction>>(new Map());

  useEffect(() => {
    console.log('[Chat] Setting up LangGraph human interaction listeners...');
    
    const handleHumanInteractionRequest = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { interactionId: string; request: any };
      
      console.log('[Chat] 🐛 DEBUG: Received LangGraph human interaction request:', {
        interactionId: data.interactionId,
        requestType: data.request.type,
        requestTitle: data.request.title,
        hasToolCall: !!data.request.data?.toolCall,
        hasAgentCard: !!data.request.data?.agentCard
      });
      
      if (!activeChatId) {
        console.warn('[Chat] No active chat ID, ignoring human interaction request');
        return;
      }
      
      const { agent } = useAgentStore.getState();
      if (!agent) {
        console.error('[Chat] No agent available for human interaction message');
        return;
      }
      
      let messageId: string;
      
      // ✅ CRITICAL FIX: Check if message already exists before creating
      if (data.request.type === 'tool_approval' && data.request.data?.toolCall) {
        messageId = `langgraph-tool-${data.interactionId}`;
        
        // ✅ Check if message already exists in chat store
        const existingMessages = useChatStore.getState().messages[activeChatId] || [];
        const existingMessage = existingMessages.find(msg => msg.id === messageId);
        
        if (existingMessage) {
          console.log('[Chat] 🔧 Message already exists, skipping creation:', messageId);
          
          // ✅ Still store interaction for tracking but don't create duplicate message
          (window as any).langGraphInteractions = (window as any).langGraphInteractions || new Map();
          (window as any).langGraphInteractions.set(data.interactionId, {
            interactionId: data.interactionId,
            request: data.request,
            messageType: 'tool_call',
            messageId: messageId
          });
          
          setLangGraphInteractions(prev => new Map(prev).set(data.interactionId, {
            interactionId: data.interactionId,
            request: data.request,
            messageType: 'tool_call',
            messageId: messageId
          }));
          
          return; // ✅ Exit early to prevent duplicate creation
        }
        
        console.log('[Chat] 🔧 Creating tool execution message for actual MCP tool:', data.request.data.toolCall.name);
        
        const toolCallData = data.request.data.toolCall;
        const currentTime = new Date().toISOString();
        
        // Create tool call for actual MCP tool
        const toolCall: IChatMessageToolCall = {
          id: data.interactionId,
          type: 'function',
          function: {
            name: toolCallData.name,
            arguments: typeof toolCallData.arguments === 'string' 
              ? toolCallData.arguments 
              : JSON.stringify(toolCallData.arguments || {}),
          },
          status: 'pending',
          mcp_server: toolCallData.mcpServer || 'unknown',
          tool_description: toolCallData.description,
        };
        
        // ✅ Create message with tool call
        const toolMessage: IChatMessage = {
          id: messageId,
          chat_id: activeChatId,
          sender: agent.id || '',
          sender_object: agent,
          text: '',
          tool_calls: [toolCall],
          created_at: currentTime,
          sent_at: currentTime,
          status: 'completed',
          workspace_id: workspaceId
        };
        
        try {
          // ✅ Check if message exists in database before inserting
          const existingInDb = await window.electron.db.query({
            query: 'SELECT id FROM messages WHERE id = ? AND chat_id = ?',
            params: [messageId, activeChatId]
          });
          
          if (!existingInDb || existingInDb.length === 0) {
            // ✅ Save message to database first using direct database call
            await window.electron.db.query({
              query: `
                INSERT INTO messages 
                (id, chat_id, sender, text, created_at, sent_at, status, workspace_id)
                VALUES (@id, @chat_id, @sender, @text, @created_at, @sent_at, @status, @workspace_id)
              `,
              params: {
                id: messageId,
                chat_id: activeChatId,
                sender: agent.id,
                text: '',
                created_at: currentTime,
                sent_at: currentTime,
                status: 'completed',
                workspace_id: workspaceId || null,
              }
            });
            
            console.log('[Chat] ✅ Message saved to database first');
            
            // ✅ Now save tool call (message exists in database)
            const { createToolCalls } = useLLMStore.getState();
            await createToolCalls(messageId, [toolCall]);
            
            console.log('[Chat] ✅ Tool call saved to database');
          } else {
            console.log('[Chat] ✅ Message already exists in database, skipping insert');
          }
          
          // ✅ Add to UI state
          appendMessage(activeChatId, toolMessage);
          
          console.log('[Chat] ✅ Tool execution message created successfully');
          
        } catch (error) {
          console.error('[Chat] ❌ Failed to save tool message to database:', error);
          // Still add to UI even if database save failed
          appendMessage(activeChatId, toolMessage);
        }
        
      } else {
        // ✅ For ALL other types (agent execution, general approval) - create regular text messages
        messageId = `langgraph-approval-${data.interactionId}`;
        console.log('[Chat] 🔧 Creating approval message (NOT tool call) for:', data.request.type);
        
        let approvalText = '';
        
        if (data.request.type === 'approval' && data.request.data?.agentCard) {
          // Agent execution approval
          const agentCard = data.request.data.agentCard;
          approvalText = `**🤖 Agent Execution Request**\n\n` +
            `**Agent:** ${agentCard.name || agentCard.role}\n` +
            `**Task:** ${data.request.data?.task || data.request.description}\n\n` +
            `*Waiting for your approval to execute this agent...*`;
        } else {
          // General approval (result review, etc.) - DON'T show in UI, just handle silently
          console.log('[Chat] 🔧 General approval request - handling silently without UI display');
          
          // ✅ Store interaction but don't create UI message for general approvals
          (window as any).langGraphInteractions = (window as any).langGraphInteractions || new Map();
          (window as any).langGraphInteractions.set(data.interactionId, {
            interactionId: data.interactionId,
            request: data.request,
            messageType: 'silent_approval',
            messageId: null // No UI message for general approvals
          });
          
          setLangGraphInteractions(prev => new Map(prev).set(data.interactionId, {
            interactionId: data.interactionId,
            request: data.request,
            messageType: 'silent_approval',
            messageId: null
          }));
          
          return; // Exit early - no UI message for general approvals
        }
        
        // ✅ Only create UI message for agent execution approvals
        const approvalMessage: IChatMessage = {
          id: messageId,
          chat_id: activeChatId,
          sender: agent.id || '',
          text: approvalText,
          sender_object: agent,
          created_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          status: 'completed',
          workspace_id: workspaceId
        };
        
        appendMessage(activeChatId, approvalMessage);
      }
      
      // ✅ Store interaction for response handling
      (window as any).langGraphInteractions = (window as any).langGraphInteractions || new Map();
      (window as any).langGraphInteractions.set(data.interactionId, {
        interactionId: data.interactionId,
        request: data.request,
        messageType: data.request.type === 'tool_approval' ? 'tool_call' : 'approval_message',
        messageId: messageId
      });
      
      setLangGraphInteractions(prev => new Map(prev).set(data.interactionId, {
        interactionId: data.interactionId,
        request: data.request,
        messageType: data.request.type === 'tool_approval' ? 'tool_call' : 'approval_message',
        messageId: messageId
      }));
    };

    const unsubscribeHumanInteraction = window.electron?.ipcRenderer?.on?.('agent:human_interaction_request', handleHumanInteractionRequest);
    
    return () => {
      console.log('[Chat] Cleaning up LangGraph human interaction listeners');
      unsubscribeHumanInteraction?.();
    };
  }, [activeChatId, appendMessage, workspaceId]);

  // Add handler for human responses (you'll need to add UI buttons for approve/reject)
  const handleHumanInteractionResponse = useCallback(async (interactionId: string, approved: boolean, userInput?: string) => {
    console.log('[Chat] Handling human interaction response:', { interactionId, approved, userInput });
    
    const interaction = langGraphInteractions.get(interactionId);
    if (!interaction) {
      console.error('[Chat] Interaction not found:', interactionId);
      return;
    }
    
    try {
      // Send response back to AgentStore to resume workflow
      const { resumeLangGraphWorkflow } = useAgentStore.getState();
      const response = {
        id: interactionId,
        approved,
        userInput,
        timestamp: Date.now()
      };
      
      console.log('[Chat] 🔧 Resuming LangGraph workflow with response:', {
        threadId: interaction.request.threadId,
        response
      });
      
      // Resume the workflow with the response
      const resumeResult = await resumeLangGraphWorkflow(interaction.request.threadId, response);
      
      // ✅ NEW: Handle workflow completion here
      if (resumeResult.success && resumeResult.completed && resumeResult.result) {
        console.log('[Chat] Workflow completed, creating final AI response...');
        
        const { agent } = useAgentStore.getState();
        if (agent) {
          const finalResponseMessage: IChatMessage = {
            id: `langgraph-final-${Date.now()}`,
            chat_id: activeChatId || '',
            sender: agent.id || '',
            sender_object: agent,
            text: resumeResult.result,
            created_at: new Date().toISOString(),
            sent_at: new Date().toISOString(),
            status: 'completed',
            workspace_id: workspaceId
          };
          
          // Add to UI and save to database
          appendMessage(activeChatId || '', finalResponseMessage);
          
          try {
            await window.electron.db.query({
              query: `INSERT INTO messages (id, chat_id, sender, text, created_at, sent_at, status, workspace_id) VALUES (@id, @chat_id, @sender, @text, @created_at, @sent_at, @status, @workspace_id)`,
              params: {
                id: finalResponseMessage.id,
                chat_id: activeChatId,
                sender: agent.id,
                text: finalResponseMessage.text,
                created_at: finalResponseMessage.created_at,
                sent_at: finalResponseMessage.sent_at,
                status: 'completed',
                workspace_id: workspaceId || null,
              }
            });
            toast.success('Workflow completed successfully!');
          } catch (dbError) {
            console.error('[Chat] Failed to save final response:', dbError);
          }
        }
      }
      
      // Only update message if messageId exists (not for silent approvals)
      if (interaction.messageId) {
        const decisionText = approved ? '✅ **Approved**' : '❌ **Rejected**';
        const updatedText = `${interaction.request.title}\n\n${interaction.request.description}\n\n${decisionText}${userInput ? `\n\n*User comment: ${userInput}*` : ''}`;
        
        await updateMessage(activeChatId || '', interaction.messageId, {
          text: updatedText,
          status: 'completed'
        });
      }
      
      // Clean up
      setLangGraphInteractions(prev => {
        const newMap = new Map(prev);
        newMap.delete(interactionId);
        return newMap;
      });
      
      console.log('[Chat] ✅ LangGraph workflow resumed successfully');
      
    } catch (error: any) {
      console.error('[Chat] Error handling human interaction response:', error);
      toast.error('Failed to process approval response');
    }
  }, [langGraphInteractions, activeChatId, updateMessage, appendMessage, workspaceId]);

  // ✅ Expose the handler globally so ToolDisplay can use it
  useEffect(() => {
    (window as any).handleHumanInteractionResponse = handleHumanInteractionResponse;
    return () => {
      delete (window as any).handleHumanInteractionResponse;
    };
  }, [handleHumanInteractionResponse]);

  return {
    langGraphInteractions,
    handleHumanInteractionResponse
  };
};

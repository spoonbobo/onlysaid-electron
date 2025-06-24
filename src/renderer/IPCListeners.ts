import { useEffect, useCallback } from 'react';
import { useChatStore } from '@/renderer/stores/Chat/ChatStore';
import { useLLMStore } from '@/renderer/stores/LLM/LLMStore';
import { useMCPClientStore } from '@/renderer/stores/MCP/MCPClient';
import { useToastStore } from '@/renderer/stores/Notification/ToastStore';
import { IChatMessage, IChatMessageToolCall } from "@/../../types/Chat/Message";
import { getUserFromStore } from "@/utils/user";
import { toast } from "@/utils/toast";
import { useHistoryStore } from '@/renderer/stores/Agent/task/HistoryStore';
import { useAgentStore } from './stores/Agent/AgentStore';
import { 
  useAgentManagementStore, 
  useTaskManagementStore, 
  useToolExecutionStore, 
  useExecutionStore, 
  useLogStore, 
  useAgentTaskOrchestrator
} from '@/renderer/stores/Agent/task';

// ✅ LangGraph Interaction interface
interface LangGraphInteraction {
  interactionId: string;
  request: any;
  messageType: string;
  messageId: string | null;
}

interface IPCListenersProps {
  activeChatId: string | null;
  workspaceId: string;
  agent: any;
  appendMessage: (chatId: string, message: IChatMessage) => void;
  updateMessage: (chatId: string, messageId: string, updates: Partial<IChatMessage>) => void;
  osswarmToolRequests: Map<string, {
    approvalId: string;
    request: any;
    messageId: string;
  }>;
  setOSSwarmToolRequests: React.Dispatch<React.SetStateAction<Map<string, {
    approvalId: string;
    request: any;
    messageId: string;
  }>>>;
  langGraphInteractions: Map<string, LangGraphInteraction>;
  setLangGraphInteractions: React.Dispatch<React.SetStateAction<Map<string, LangGraphInteraction>>>;
  resumeLangGraphWorkflow: (threadId: string, response: any) => Promise<any>;
  setGoogleServicesReady: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useIPCListeners = ({
  activeChatId,
  workspaceId,
  agent,
  appendMessage,
  updateMessage,
  osswarmToolRequests,
  setOSSwarmToolRequests,
  langGraphInteractions,
  setLangGraphInteractions,
  resumeLangGraphWorkflow,
  setGoogleServicesReady
}: IPCListenersProps) => {

  // ✅ Human Interaction Response Handler
  const handleHumanInteractionResponse = useCallback(async (interactionId: string, approved: boolean, userInput?: string) => {
    console.log('[IPCListeners] Handling human interaction response:', { interactionId, approved, userInput });
    
    const interaction = langGraphInteractions.get(interactionId);
    if (!interaction) {
      console.error('[IPCListeners] Interaction not found:', interactionId);
      return;
    }
    
    try {
      // Send response back to AgentStore to resume workflow
      const response = {
        id: interactionId,
        approved,
        userInput,
        timestamp: Date.now()
      };
      
      console.log('[IPCListeners] 🔧 Resuming LangGraph workflow with response:', {
        threadId: interaction.request.threadId,
        response
      });
      
      // Resume the workflow with the response
      const resumeResult = await resumeLangGraphWorkflow(interaction.request.threadId, response);
      
      // ✅ Handle workflow completion here
      if (resumeResult.success && resumeResult.completed && resumeResult.result && activeChatId) {
        console.log('[IPCListeners] Workflow completed, creating final AI response...');
        
        if (agent) {
          const finalResponseMessage: IChatMessage = {
            id: `langgraph-final-${Date.now()}`,
            chat_id: activeChatId,
            sender: agent.id || '',
            sender_object: agent,
            text: resumeResult.result,
            created_at: new Date().toISOString(),
            sent_at: new Date().toISOString(),
            status: 'completed',
            workspace_id: workspaceId
          };
          
          // Add to UI and save to database
          appendMessage(activeChatId, finalResponseMessage);
          
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
            console.error('[IPCListeners] Failed to save final response:', dbError);
          }
        }
      }
      
      // Only update message if messageId exists (not for silent approvals)
      if (interaction.messageId && activeChatId) {
        const decisionText = approved ? '✅ **Approved**' : '❌ **Rejected**';
        const updatedText = `${interaction.request.title}\n\n${interaction.request.description}\n\n${decisionText}${userInput ? `\n\n*User comment: ${userInput}*` : ''}`;
        
        await updateMessage(activeChatId, interaction.messageId, {
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
      
      console.log('[IPCListeners] ✅ LangGraph workflow resumed successfully');
      
    } catch (error: any) {
      console.error('[IPCListeners] Error handling human interaction response:', error);
      toast.error('Failed to process approval response');
    }
  }, [langGraphInteractions, activeChatId, updateMessage, appendMessage, workspaceId, agent, resumeLangGraphWorkflow]);

  // ✅ CONSOLIDATED IPC LISTENERS - All in one useEffect
  useEffect(() => {
    console.log('[IPCListeners] Setting up ALL IPC listeners...');
    
    // ==================== AGENT TOOL LISTENERS ====================
    
    const handleToolApprovalRequest = async (event: any, data: { approvalId: string; request: any }) => {
      console.log('[IPCListeners] Received Agent tool approval request:', data);
      
      if (!activeChatId || !agent) {
        console.warn('[IPCListeners] No active chat ID or agent, ignoring tool approval request');
        return;
      }
      
      const currentUser = getUserFromStore();
      const originalMCPServer = data.request.originalMCPServer || 'agent';
      console.log('[IPCListeners] Original MCP server for tool:', originalMCPServer);
      
      const messageId = `agent-tool-${data.approvalId}`;
      const currentTime = new Date().toISOString();
      
      // Create the tool call data
      const toolCall: IChatMessageToolCall = {
        id: data.approvalId,
        type: 'function',
        function: {
          name: data.request.toolCall.name,
          arguments: data.request.toolCall.arguments,
        },
        status: 'pending',
        mcp_server: originalMCPServer,
        tool_description: data.request.toolCall.description,
      };
      
      // Create message using user's agent as sender
      const toolCallMessage: IChatMessage = {
        id: messageId,
        chat_id: activeChatId,
        sender: agent.id || '',
        sender_object: agent,
        text: ``,
        tool_calls: [toolCall],
        created_at: currentTime,
        sent_at: currentTime,
        status: 'completed',
      };

      console.log('[IPCListeners] Adding Agent tool message with agent sender:', agent.username, toolCallMessage);

      // Save message to database using agent ID
      try {
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
        
        // Save the tool call separately
        const { createToolCalls } = useLLMStore.getState();
        await createToolCalls(messageId, [toolCall]);
        
        console.log('[IPCListeners] Agent tool message and tool call saved to database');
      } catch (error) {
        console.error('[IPCListeners] Failed to save Agent tool message to database:', error);
      }

      // Add to UI
      appendMessage(activeChatId, toolCallMessage);
      
      // Track the request
      setOSSwarmToolRequests(prev => new Map(prev).set(data.approvalId, {
        approvalId: data.approvalId,
        request: data.request,
        messageId: toolCallMessage.id,
      }));
      
      console.log('[IPCListeners] Agent tool request tracked, total requests:', osswarmToolRequests.size + 1);
    };

    const handleToolExecutionStart = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; toolName: string; agentId: string; agentRole: string };
      console.log('[IPCListeners] Agent tool execution started:', data);
      
      if (!activeChatId) return;
      
      // Update the tool call status to 'executing'
      const messages = useChatStore.getState().messages[activeChatId] || [];
      const toolMessage = messages.find(msg => msg.id === `agent-tool-${data.executionId}`);
      
      if (toolMessage && toolMessage.tool_calls) {
        const updatedToolCalls = toolMessage.tool_calls.map(tc => 
          tc.id === data.executionId ? { ...tc, status: 'executing' as const } : tc
        );
        
        // Update in chat store
        updateMessage(activeChatId, toolMessage.id, {
          tool_calls: updatedToolCalls
        });
        
        // Update in database
        try {
          const { updateToolCallStatus } = useLLMStore.getState();
          await updateToolCallStatus(data.executionId, 'executing');
          console.log('[IPCListeners] Updated tool call status to executing in database');
        } catch (error) {
          console.error('[IPCListeners] Failed to update tool call status in database:', error);
        }
      }
    };

    const handleToolExecutionComplete = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { 
        executionId: string; 
        toolName: string; 
        result?: string; 
        error?: string; 
        success: boolean;
        executionTime?: number;
        approvalId: string;
      };
      console.log('[IPCListeners] Agent tool execution completed:', data);
      
      if (!activeChatId) return;
      
      const toolCallId = data.approvalId;
      const expectedMessageId = `agent-tool-${toolCallId}`;
      
      console.log('[IPCListeners] 🔧 Looking for tool message:', {
        toolCallId,
        expectedMessageId,
        activeChatId
      });
      
      // Update the tool call with results
      const messages = useChatStore.getState().messages[activeChatId] || [];
      const toolMessage = messages.find(msg => msg.id === expectedMessageId);
      
      if (toolMessage && toolMessage.tool_calls) {
        const targetToolCall = toolMessage.tool_calls.find(tc => tc.id === toolCallId);
        
        if (targetToolCall) {
          console.log('[IPCListeners] 🔧 Found target tool call, updating...');
          
          const updatedToolCalls = toolMessage.tool_calls.map(tc => 
            tc.id === toolCallId ? { 
              ...tc, 
              status: data.success ? 'executed' as const : 'error' as const,
              result: data.result || data.error,
              execution_time_seconds: data.executionTime
            } : tc
          );
          
          // Update in chat store
          updateMessage(activeChatId, toolMessage.id, {
            tool_calls: updatedToolCalls
          });
          
          console.log('[IPCListeners] 🔧 Updated tool call in chat store');
          
          // Update in database
          try {
            const { updateToolCallResult, updateToolCallStatus } = useLLMStore.getState();
            
            if (data.success && data.result) {
              console.log('[IPCListeners] 🔧 Saving tool result to database...');
              
              await updateToolCallResult(
                toolCallId, 
                data.result, 
                data.executionTime
              );
              
              await updateToolCallStatus(toolCallId, 'executed');
              
              console.log('[IPCListeners] ✅ Tool result saved to database successfully');
            } else {
              await updateToolCallStatus(toolCallId, 'error');
              console.log('[IPCListeners] ✅ Tool error status saved to database');
            }
          } catch (error) {
            console.error('[IPCListeners] ❌ Failed to save tool result to database:', error);
          }
        } else {
          console.warn('[IPCListeners] ❌ Could not find target tool call:', {
            toolCallId,
            availableToolCallIds: toolMessage.tool_calls.map(tc => tc.id)
          });
        }
      } else {
        console.warn('[IPCListeners] ❌ Could not find tool message:', {
          expectedMessageId,
          availableMessages: messages.map(m => m.id)
        });
      }
    };

    const handleMCPToolExecution = async (event: any, ...args: unknown[]) => {
      const data = args[0] as {
        executionId: string;
        serverName: string;
        toolName: string;
        arguments: any;
        responseChannel: string;
      };
      
      console.log(`🔍 [IPCListeners-MCP] ==================== MCP TOOL HANDLER START ====================`);
      console.log(`🔍 [IPCListeners-MCP] MCP tool execution request:`, {
        executionId: data.executionId,
        serverName: data.serverName,
        toolName: data.toolName,
        hasArguments: !!data.arguments,
        argumentsType: typeof data.arguments,
        responseChannel: data.responseChannel
      });
      
      try {
        console.log(`🔍 [IPCListeners-MCP] Step 1: Getting MCP client store...`);
        const mcpClientStore = useMCPClientStore.getState();
        console.log(`🔍 [IPCListeners-MCP] MCP Client Store state:`, {
          hasExecuteTool: typeof mcpClientStore.executeTool === 'function',
          storeKeys: Object.keys(mcpClientStore).filter(key => typeof mcpClientStore[key as keyof typeof mcpClientStore] === 'function')
        });
        
        const { executeTool } = mcpClientStore;
        
        if (!executeTool) {
          throw new Error('executeTool function not available in MCP client store');
        }
        
        console.log(`🔍 [IPCListeners-MCP] Step 2: Calling executeTool...`);
        console.log(`🔍 [IPCListeners-MCP] Parameters:`, {
          serverName: data.serverName,
          toolName: data.toolName,
          argumentsType: typeof data.arguments,
          argumentsContent: data.arguments
        });
        
        const result = await executeTool(data.serverName, data.toolName, data.arguments);
        
        console.log(`🔍 [IPCListeners-MCP] ✅ MCP tool execution result:`, {
          success: result?.success,
          hasData: !!result?.data,
          dataType: typeof result?.data,
          error: result?.error,
          executionId: data.executionId
        });
        
        console.log(`🔍 [IPCListeners-MCP] Step 3: Sending result back via IPC channel: ${data.responseChannel}`);
        (window.electron.ipcRenderer as any).send(data.responseChannel, result);
        console.log(`🔍 [IPCListeners-MCP] ✅ Response sent successfully`);
        
      } catch (error: any) {
        console.error(`🔍 [IPCListeners-MCP] ❌ MCP tool execution failed:`, {
          message: error.message,
          stack: error.stack,
          name: error.name,
          executionId: data.executionId,
          toolName: data.toolName,
          serverName: data.serverName
        });
        
        console.log(`🔍 [IPCListeners-MCP] Sending error response via IPC channel: ${data.responseChannel}`);
        (window.electron.ipcRenderer as any).send(data.responseChannel, {
          success: false,
          error: error.message,
          executionId: data.executionId
        });
      } finally {
        console.log(`🔍 [IPCListeners-MCP] ==================== MCP TOOL HANDLER END ====================`);
      }
    };

    // ==================== LANGGRAPH LISTENERS ====================
    
    const handleHumanInteractionRequest = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { interactionId: string; request: any };
      
      console.log('[IPCListeners] 🐛 DEBUG: Received LangGraph human interaction request:', {
        interactionId: data.interactionId,
        requestType: data.request.type,
        requestTitle: data.request.title,
        hasToolCall: !!data.request.data?.toolCall,
        hasAgentCard: !!data.request.data?.agentCard
      });
      
      if (!activeChatId || !agent) {
        console.warn('[IPCListeners] No active chat ID or agent, ignoring human interaction request');
        return;
      }
      
      let messageId: string;
      
      // Check if message already exists before creating
      if (data.request.type === 'tool_approval' && data.request.data?.toolCall) {
        messageId = `langgraph-tool-${data.interactionId}`;
        
        // Check if message already exists in chat store
        const existingMessages = useChatStore.getState().messages[activeChatId] || [];
        const existingMessage = existingMessages.find(msg => msg.id === messageId);
        
        if (existingMessage) {
          console.log('[IPCListeners] 🔧 Message already exists, skipping creation:', messageId);
          
          // Still store interaction for tracking but don't create duplicate message
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
          
          return;
        }
        
        console.log('[IPCListeners] 🔧 Creating tool execution message for actual MCP tool:', data.request.data.toolCall.name);
        
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
        
        // Create message with tool call
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
          // Check if message exists in database before inserting
          const existingInDb = await window.electron.db.query({
            query: 'SELECT id FROM messages WHERE id = ? AND chat_id = ?',
            params: [messageId, activeChatId]
          });
          
          if (!existingInDb || existingInDb.length === 0) {
            // Save message to database first using direct database call
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
            
            console.log('[IPCListeners] ✅ Message saved to database first');
            
            // Now save tool call (message exists in database)
            const { createToolCalls } = useLLMStore.getState();
            await createToolCalls(messageId, [toolCall]);
            
            console.log('[IPCListeners] ✅ Tool call saved to database');
          } else {
            console.log('[IPCListeners] ✅ Message already exists in database, skipping insert');
          }
          
          // Add to UI state
          appendMessage(activeChatId, toolMessage);
          
          console.log('[IPCListeners] ✅ Tool execution message created successfully');
          
        } catch (error) {
          console.error('[IPCListeners] ❌ Failed to save tool message to database:', error);
          // Still add to UI even if database save failed
          appendMessage(activeChatId, toolMessage);
        }
        
      } else {
        // For ALL other types (agent execution, general approval) - create regular text messages
        messageId = `langgraph-approval-${data.interactionId}`;
        console.log('[IPCListeners] 🔧 Creating approval message (NOT tool call) for:', data.request.type);
        
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
          console.log('[IPCListeners] 🔧 General approval request - handling silently without UI display');
          
          // Store interaction but don't create UI message for general approvals
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
        
        // Only create UI message for agent execution approvals
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
      
      // Store interaction for response handling
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

    const handleResultSynthesized = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; result: string; agentCards: any[] };
      
      console.log('[IPCListeners] 🔮 Received LangGraph result synthesis:', {
        executionId: data.executionId,
        resultLength: data.result?.length || 0,
        agentCount: data.agentCards?.length || 0
      });
      
      if (!activeChatId || !agent) {
        console.warn('[IPCListeners] No active chat ID or agent, ignoring result synthesis');
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
        
        console.log('[IPCListeners] ✅ Synthesis message saved to database');
        
        // Add to UI
        appendMessage(activeChatId, synthesisMessage);
        
        console.log('[IPCListeners] ✅ Synthesis message displayed in chat');
        
      } catch (error) {
        console.error('[IPCListeners] ❌ Failed to save synthesis message:', error);
        // Still show in UI even if database save failed
        appendMessage(activeChatId, synthesisMessage);
      }
    };

    // ==================== DATABASE OPERATION LISTENERS ====================
    
    const handleSaveAgentToDb = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; agentId: string; role: string; expertise?: string[] };
      console.log('[IPCListeners-Global-IPC] 🔥 Received save agent request:', data);
      
      try {
        const dbAgentId = await useAgentManagementStore.getState().createAgent(
          data.executionId,
          data.agentId,
          data.role,
          data.expertise
        );
        
        console.log('[IPCListeners-Global-IPC] ✅ Agent saved to database with ID:', dbAgentId);
      } catch (error) {
        console.error('[IPCListeners-Global-IPC] ❌ Error saving agent to database:', error);
      }
    };

    const handleSaveTaskToDb = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; agentId: string; taskDescription: string; priority?: number };
      console.log('[IPCListeners-Global-IPC] 🔥 Received save task request:', data);
      
      try {
        const taskId = await useTaskManagementStore.getState().createTask(
          data.executionId,
          data.agentId,
          data.taskDescription,
          data.priority || 0
        );
        
        console.log('[IPCListeners-Global-IPC] ✅ Task saved to database with ID:', taskId);
      } catch (error) {
        console.error('[IPCListeners-Global-IPC] ❌ Error saving task to database:', error);
      }
    };

    const handleSaveToolExecutionToDb = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { 
        executionId: string; 
        agentId: string; 
        toolName: string; 
        toolArguments?: any; 
        approvalId?: string; 
        taskId?: string; 
        mcpServer?: string 
      };
      console.log('[IPCListeners-Global-IPC] 🔥 Received save tool execution request:', data);
      
      try {
        const toolExecutionId = await useToolExecutionStore.getState().createToolExecution(
          data.executionId,
          data.agentId,
          data.toolName,
          data.toolArguments,
          data.approvalId,
          data.taskId,
          data.mcpServer
        );
        
        console.log('[IPCListeners-Global-IPC] ✅ Tool execution saved to database with ID:', toolExecutionId);
      } catch (error) {
        console.error('[IPCListeners-Global-IPC] ❌ Error saving tool execution to database:', error);
      }
    };

    const handleUpdateExecutionStatus = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; status: string; result?: string; error?: string };
      console.log('[IPCListeners-Global-IPC] 🔥 Received update execution status request:', data);
      
      try {
        await useExecutionStore.getState().updateExecutionStatus(
          data.executionId,
          data.status as any,
          data.result,
          data.error
        );
        
        console.log('[IPCListeners-Global-IPC] ✅ Execution status updated in database');
      } catch (error) {
        console.error('[IPCListeners-Global-IPC] ❌ Error updating execution status in database:', error);
      }
    };

    const handleAddLogToDb = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { 
        executionId: string; 
        logType: string; 
        message: string; 
        agentId?: string; 
        taskId?: string; 
        toolExecutionId?: string; 
        metadata?: any 
      };
      console.log('[IPCListeners-Global-IPC] 🔥 Received add log request:', data);
      
      try {
        await useLogStore.getState().addLog(
          data.executionId,
          data.logType as any,
          data.message,
          data.agentId,
          data.taskId,
          data.toolExecutionId,
          data.metadata
        );
        
        console.log('[IPCListeners-Global-IPC] ✅ Log added to database');
      } catch (error) {
        console.error('[IPCListeners-Global-IPC] ❌ Error adding log to database:', error);
      }
    };

    const handleCreateExecutionRecord = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { 
        executionId: string; 
        taskDescription: string; 
        chatId?: string; 
        workspaceId?: string; 
      };
      console.log('[IPCListeners-Global-IPC] 🔥 Received create execution record request:', data);
      
      try {
        // Check if execution already exists
        const existingExecution = await window.electron.db.query({
          query: `SELECT id FROM osswarm_executions WHERE id = @id`,
          params: { id: data.executionId }
        });
        
        if (!existingExecution || existingExecution.length === 0) {
          // ✅ FIX: Create execution with the specific provided ID instead of using createExecution
          const currentUser = getUserFromStore();
          const now = new Date().toISOString();

          console.log('[IPCListeners-Global-IPC] Creating execution with specific ID:', data.executionId);

          await window.electron.db.query({
            query: `
              INSERT INTO osswarm_executions
              (id, task_description, status, created_at, user_id, chat_id, workspace_id, total_agents, total_tasks, total_tool_executions)
              VALUES (@id, @task_description, @status, @created_at, @user_id, @chat_id, @workspace_id, @total_agents, @total_tasks, @total_tool_executions)
            `,
            params: {
              id: data.executionId,  // ✅ Use the provided ID instead of generating a new one
              task_description: data.taskDescription,
              status: 'pending',
              created_at: now,
              user_id: currentUser?.id || null,
              chat_id: data.chatId || null,
              workspace_id: data.workspaceId || null,
              total_agents: 0,
              total_tasks: 0,
              total_tool_executions: 0
            }
          });

          // Update the execution store state with the correct execution
          const execution = {
            id: data.executionId,
            task_description: data.taskDescription,
            status: 'pending' as const,
            created_at: now,
            user_id: currentUser?.id,
            chat_id: data.chatId,
            workspace_id: data.workspaceId,
            total_agents: 0,
            total_tasks: 0,
            total_tool_executions: 0
          };

          useExecutionStore.getState().setCurrentExecution(execution);
          useHistoryStore.getState().addExecution(execution);

          console.log('[IPCListeners-Global-IPC] ✅ Execution record created with ID:', data.executionId);
        } else {
          console.log('[IPCListeners-Global-IPC] ✅ Execution record already exists:', data.executionId);
        }
      } catch (error) {
        console.error('[IPCListeners-Global-IPC] ❌ Error creating execution record:', error);
      }
    };

    const handleUpdateAgentStatus = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { agentId: string; status: string; currentTask?: string; executionId: string };
      console.log('[IPCListeners-Global-IPC] 🔥 Received update agent status request:', data);
      
      try {
        await useAgentManagementStore.getState().updateAgentStatus(
          data.agentId,
          data.status as any,
          data.currentTask
        );
        
        console.log('[IPCListeners-Global-IPC] ✅ Agent status updated in database');
      } catch (error) {
        console.error('[IPCListeners-Global-IPC] ❌ Error updating agent status in database:', error);
      }
    };

    const handleUpdateTaskStatus = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { taskId: string; status: string; result?: string; error?: string; executionId: string };
      console.log('[IPCListeners-Global-IPC] 🔥 Received update task status request:', data);
      
      try {
        await useTaskManagementStore.getState().updateTaskStatus(
          data.taskId,
          data.status as any,
          data.result,
          data.error
        );
        
        console.log('[IPCListeners-Global-IPC] ✅ Task status updated in database');
      } catch (error) {
        console.error('[IPCListeners-Global-IPC] ❌ Error updating task status in database:', error);
      }
    };

    const handleClearTaskState = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { taskId: string; executionId: string };
      console.log('[IPCListeners-Global-IPC] 🔥 Received clear task state request:', data);
      
      try {
        // ✅ Clear AgentStore state
        const { clearAgentTaskState } = useAgentStore.getState();
        if (clearAgentTaskState) {
          clearAgentTaskState(data.taskId);
          console.log('[IPCListeners-Global-IPC] ✅ AgentStore task state cleared for:', data.taskId);
        }
        
        // ✅ ALSO clear orchestrator state
        const { clearCurrentExecution } = useAgentTaskOrchestrator.getState();
        if (clearCurrentExecution) {
          clearCurrentExecution();
          console.log('[IPCListeners-Global-IPC] ✅ Agent task orchestrator execution cleared');
        }
        
        console.log('[IPCListeners-Global-IPC] ✅ All agent task states cleared for:', data.taskId);
      } catch (error) {
        console.error('[IPCListeners-Global-IPC] ❌ Error clearing agent task state:', error);
      }
    };

    // ==================== GOOGLE SERVICES LISTENERS ====================
    
    const handleGoogleServicesReady = () => {
      console.log('[IPCListeners] Google services ready');
      setGoogleServicesReady(true);
    };

    const handleGoogleServicesError = (event: any, error: any) => {
      console.warn('[IPCListeners] Google services error:', error);
      useToastStore.getState().addToast(
        "Google Calendar services initialization failed",
        "warning",
        5000
      );
      // Still mark as ready to continue initialization
      setGoogleServicesReady(true);
    };

    // ==================== ADD: Real-time update listeners for GraphPanel ====================
    
    const unsubscribeAgentUpdated = window.electron?.ipcRenderer?.on?.('agent:agent_updated', (event, data) => {
      console.log('[IPCListeners] Real-time agent update received:', data);
    });

    const unsubscribeTaskUpdated = window.electron?.ipcRenderer?.on?.('agent:task_updated', (event, data) => {
      console.log('[IPCListeners] Real-time task update received:', data);
    });

    const unsubscribeExecutionUpdated = window.electron?.ipcRenderer?.on?.('agent:execution_updated', (event, data) => {
      console.log('[IPCListeners] Real-time execution update received:', data);
    });

    // ==================== REGISTER ALL LISTENERS ====================
    
    // Agent tool listeners
    const unsubscribeApproval = window.electron?.agent?.onToolApprovalRequest?.(handleToolApprovalRequest);
    const unsubscribeStart = window.electron?.ipcRenderer?.on?.('agent:tool_execution_start', handleToolExecutionStart);
    const unsubscribeComplete = window.electron?.ipcRenderer?.on?.('agent:tool_execution_complete', handleToolExecutionComplete);
    const unsubscribeMCPExecution = window.electron?.ipcRenderer?.on?.('agent:execute_mcp_tool', handleMCPToolExecution);

    // LangGraph listeners
    const unsubscribeHumanInteraction = window.electron?.ipcRenderer?.on?.('agent:human_interaction_request', handleHumanInteractionRequest);
    const unsubscribeResultSynthesis = window.electron?.ipcRenderer?.on?.('agent:result_synthesized', handleResultSynthesized);

    // Database operation listeners
    const unsubscribeGlobalSaveAgent = window.electron?.ipcRenderer?.on?.('agent:save_agent_to_db', handleSaveAgentToDb);
    const unsubscribeGlobalSaveTask = window.electron?.ipcRenderer?.on?.('agent:save_task_to_db', handleSaveTaskToDb);
    const unsubscribeGlobalSaveToolExecution = window.electron?.ipcRenderer?.on?.('agent:save_tool_execution_to_db', handleSaveToolExecutionToDb);
    const unsubscribeGlobalUpdateStatus = window.electron?.ipcRenderer?.on?.('agent:update_execution_status', handleUpdateExecutionStatus);
    const unsubscribeGlobalAddLog = window.electron?.ipcRenderer?.on?.('agent:add_log_to_db', handleAddLogToDb);
    const unsubscribeCreateExecution = window.electron?.ipcRenderer?.on?.('agent:create_execution_record', handleCreateExecutionRecord);
    const unsubscribeUpdateAgentStatus = window.electron?.ipcRenderer?.on?.('agent:update_agent_status', handleUpdateAgentStatus);
    const unsubscribeUpdateTaskStatus = window.electron?.ipcRenderer?.on?.('agent:update_task_status', handleUpdateTaskStatus);
    const unsubscribeClearTaskState = window.electron?.ipcRenderer?.on?.('agent:clear_task_state', handleClearTaskState);

    // Google services listeners
    const removeReadyListener = window.electron.ipcRenderer.on('google-services:ready', handleGoogleServicesReady);
    const removeErrorListener = window.electron.ipcRenderer.on('google-services:error', handleGoogleServicesError);

    console.log('[IPCListeners] ✅ ALL IPC listeners registered successfully');

    // ==================== CLEANUP FUNCTION ====================
    
    return () => {
      console.log('[IPCListeners] Cleaning up ALL IPC listeners');
      
      // Agent tool listeners
      unsubscribeApproval?.();
      unsubscribeStart?.();
      unsubscribeComplete?.();
      unsubscribeMCPExecution?.();
      
      // LangGraph listeners
      unsubscribeHumanInteraction?.();
      unsubscribeResultSynthesis?.();
      
      // Database operation listeners
      unsubscribeGlobalSaveAgent?.();
      unsubscribeGlobalSaveTask?.();
      unsubscribeGlobalSaveToolExecution?.();
      unsubscribeGlobalUpdateStatus?.();
      unsubscribeGlobalAddLog?.();
      unsubscribeCreateExecution?.();
      unsubscribeUpdateAgentStatus?.();
      unsubscribeUpdateTaskStatus?.();
      unsubscribeClearTaskState?.();
      
      // Google services listeners
      removeReadyListener();
      removeErrorListener();

      // ✅ ADD: Real-time update listeners for GraphPanel
      unsubscribeAgentUpdated?.();
      unsubscribeTaskUpdated?.();
      unsubscribeExecutionUpdated?.();
    };
  }, [activeChatId, workspaceId, agent, appendMessage, updateMessage, osswarmToolRequests, setOSSwarmToolRequests, langGraphInteractions, setLangGraphInteractions, resumeLangGraphWorkflow, setGoogleServicesReady]);

  // ✅ EXPOSE GLOBAL HANDLER
  useEffect(() => {
    (window as any).handleHumanInteractionResponse = handleHumanInteractionResponse;
    return () => {
      delete (window as any).handleHumanInteractionResponse;
    };
  }, [handleHumanInteractionResponse]);

  return {
    handleHumanInteractionResponse
  };
};

import { Box, CircularProgress } from "@mui/material";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage, IChatMessageToolCall } from "@/../../types/Chat/Message";
import { getUserFromStore, isGuestUser } from "@/utils/user";
import { IUser } from "@/../../types/User/User";
import { v4 as uuidv4 } from 'uuid';
import { Typography } from "@mui/material";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useCurrentTopicContext, useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useStreamStore, OpenAIMessage, OpenAIStreamOptions } from "@/renderer/stores/Stream/StreamStore";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { toast } from "@/utils/toast";
import { IChatRoom } from "@/../../types/Chat/Chatroom";
import ChatUIWithNoChat from "./ChatUIWithNoChat";
import AgentWorkOverlay from "../../../components/Agent/AgentWorkOverlay";
import { useMCPClientStore } from "@/renderer/stores/MCP/MCPClient";
import { useLLMStore } from "@/renderer/stores/LLM/LLMStore";
import { useAgentTaskStore } from "@/renderer/stores/Agent/AgentTaskStore";

function Chat() {
  const {
    selectedContext,
    selectedTopics,
    replyingToId,
    setReplyingTo,
    streamingState,
    setStreamingState,
    markStreamAsCompleted
  } = useCurrentTopicContext();

  const chatInstanceId = useState(() => uuidv4())[0];

  const {
    messages: storeMessages,
    sendMessage,
    fetchMessages,
    getInput,
    setInput,
    appendMessage,
    updateMessage
  } = useChatStore();

  const { modelId, provider, modelName, aiMode } = useLLMConfigurationStore();
  const {
    messages: streamDataForId,
    isConnecting: storeIsConnecting,
    abortStream,
    streamChatCompletion,
  } = useStreamStore();

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
  const activeChatId = selectedContext?.section ? selectedTopics[selectedContext.section] || null : null;
  const { user: currentUser } = useUserStore();
  const {
    agent,
    isProcessingResponse,
    processAgentResponse,
    createGuestAgent,
    resumeLangGraphWorkflow
  } = useAgentStore();
  const isLocal = currentUser?.id ? false : true;
  let workspaceId = '';
  if (!isLocal) {
    workspaceId = selectedContext?.id || '';
  }

  const { getUsersByWorkspace } = useWorkspaceStore();
  const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);

  const isGuest = isGuestUser();

  useEffect(() => {
    if (workspaceId) {
      const fetchUsers = async () => {
        try {
          const users = await getUsersByWorkspace(workspaceId);
          setWorkspaceUsers(users);
        } catch (error) {
          console.error("Error fetching workspace users:", error);
        }
      };
      fetchUsers();
    }
  }, [workspaceId, getUsersByWorkspace]);

  const messages = storeMessages[activeChatId || ''] || [];
  const replyingToMessage = replyingToId ? messages.find((m: IChatMessage) => m.id === replyingToId) || null : null;

  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const [prevContentLength, setPrevContentLength] = useState(0);
  const lastUpdateTimeRef = useRef<number | null>(null);
  const [tokenRate, setTokenRate] = useState(0);
  const streamStartTimeRef = useRef<number | null>(null);
  const tokenCountRef = useRef(0);
  const tokenRateHistoryRef = useRef<number[]>([]);

  const activeStreamIdForUI = streamingState.messageId ? `stream-${streamingState.messageId}` : null;
  const isCurrentlyConnectingForUI = activeStreamIdForUI ? storeIsConnecting[activeStreamIdForUI] : false;

  const input = getInput(activeChatId || '', contextId);

  const fetchMessagesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (fetchMessagesTimeoutRef.current) {
      clearTimeout(fetchMessagesTimeoutRef.current);
    }

    if (activeChatId && useChatStore.getState().chats.some((chat: IChatRoom) => chat.id === activeChatId)) {
      const topicStoreState = useTopicStore.getState();
      const completedStreamData = topicStoreState.completedStreams[activeChatId];
      let isRecentCompletion = false;

      if (completedStreamData && completedStreamData.completionTime) {
        if ((Date.now() - completedStreamData.completionTime) < 1500) { // Stream completed in the last 1.5 seconds
          isRecentCompletion = true;
        } else {
          // Optional: Clean up very old completedStream entry if it's no longer relevant for this delay logic
          // This might be better done elsewhere, e.g. when a chat is truly "left"
          // useTopicStore.getState().clearCompletedStream(activeChatId); // Be careful with this
        }
      }

      if (isRecentCompletion) {
        console.log(`[Chat/index.tsx] Delaying fetchMessages for ${activeChatId} due to recent stream completion.`);
        fetchMessagesTimeoutRef.current = setTimeout(() => {
          fetchMessages(activeChatId);
        }, 750); // Delay fetch by 750ms
      } else {
        fetchMessages(activeChatId);
      }
    }

    return () => {
      if (fetchMessagesTimeoutRef.current) {
        clearTimeout(fetchMessagesTimeoutRef.current);
      }
    };
  }, [activeChatId, fetchMessages]); // fetchMessages is stable from Zustand

  const previousActiveChatIdRef = useRef<string | null>(null);
  const previousContextIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeChatId && previousActiveChatIdRef.current &&
      activeChatId !== previousActiveChatIdRef.current &&
      contextId === previousContextIdRef.current) {
      setReplyingTo(null);
    }

    previousActiveChatIdRef.current = activeChatId;
    previousContextIdRef.current = contextId;
  }, [activeChatId, contextId, setReplyingTo]);

  useEffect(() => {
    const latestStreamObject = activeStreamIdForUI ? streamDataForId[activeStreamIdForUI] : null;

    if (streamingState.messageId && latestStreamObject) {
      const now = Date.now();

      if (streamStartTimeRef.current === null) {
        streamStartTimeRef.current = now;
        lastUpdateTimeRef.current = now;
        tokenCountRef.current = 0;
        tokenRateHistoryRef.current = [];
      }

      const newContent = latestStreamObject.full || latestStreamObject.content;

      if (newContent !== currentStreamContent) {
        const currentLength = newContent.length;
        const newTokens = Math.max(0, currentLength - prevContentLength);

        if (newTokens > 0 && lastUpdateTimeRef.current) {
          const timeDelta = (now - lastUpdateTimeRef.current) / 1000;

          if (timeDelta > 0) {
            const instantRate = Math.round(newTokens / timeDelta);

            tokenRateHistoryRef.current.push(instantRate);
            if (tokenRateHistoryRef.current.length > 5) {
              tokenRateHistoryRef.current.shift();
            }

            const avgRate = Math.round(
              tokenRateHistoryRef.current.reduce((sum, rate) => sum + rate, 0) /
              tokenRateHistoryRef.current.length
            );

            setTokenRate(avgRate);
          }

          lastUpdateTimeRef.current = now;
        }

        setPrevContentLength(currentLength);
        setCurrentStreamContent(newContent);
        tokenCountRef.current += newTokens;
      }
    } else if (!streamingState.messageId) {
      setCurrentStreamContent("");
      setTokenRate(0);
      setPrevContentLength(0);
      streamStartTimeRef.current = null;
      lastUpdateTimeRef.current = null;
      tokenCountRef.current = 0;
      tokenRateHistoryRef.current = [];
    }
  }, [streamingState.messageId, activeStreamIdForUI, streamDataForId, currentStreamContent]);

  const handleReply = (message: IChatMessage) => {
    setReplyingTo(message.id);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleSend = async (messageData: Partial<IChatMessage>) => {
    if (
      (messageData.text?.trim() || messageData.files?.length)
      && activeChatId
    ) {
      try {
        // Clear any pending fetch for this chat if user sends a message
        if (fetchMessagesTimeoutRef.current && useTopicStore.getState().completedStreams[activeChatId]) {
          // If we were delaying a fetch for this active chat, sending a message should probably trigger a fetch or rely on append.
          // For now, let the optimistic append handle the new message. The delayed fetch will eventually run if not cleared.
        }

        messageData.created_at = new Date().toISOString();

        if (replyingToId) {
          messageData.reply_to = replyingToId;
        }

        const messageId = await sendMessage(activeChatId, messageData, workspaceId);

        if (messageId) {
          const currentUser = getUserFromStore();
          const newMessage: IChatMessage = {
            id: messageId as string,
            chat_id: activeChatId,
            sender: currentUser?.id || "",
            text: messageData.text || "",
            created_at: messageData.created_at,
            sender_object: currentUser as IUser,
            reply_to: replyingToId || undefined,
            files: messageData.files,
            sent_at: messageData.sent_at || new Date().toISOString(),
            status: messageData.status || "pending"
          };

          appendMessage(activeChatId, newMessage);

          setInput(activeChatId, '', contextId);
          setReplyingTo(null);

          // Process AI response based on mode - USE OSSWARM FOR AGENT MODE
          if (aiMode && aiMode !== "none" && modelId && messageData.text && activeChatId) {
            setCurrentStreamContent("");
            streamStartTimeRef.current = null;
            tokenCountRef.current = 0;
            setTokenRate(0);

            try {
              const result = await processAgentResponse({
                activeChatId,
                userMessageText: messageData.text,
                modelId,
                provider: provider || "openai",
                currentUser,
                existingMessages: messages,
                workspaceId: selectedContext?.id,
                aiMode,
                appendMessage,
                updateMessage,
                setStreamingState,
                markStreamAsCompleted,
                streamChatCompletion,
              });

              if (!result.success) {
                console.error(`${aiMode} mode AI response failed:`, result.error);
                toast.error(`Failed to process ${aiMode} response`);
              }
            } catch (e) {
              console.error(`Critical error processing ${aiMode} mode AI response:`, e);
              toast.error(`Critical error in ${aiMode} mode`);
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        toast.error("Failed to send message");
      }
    }
  };

  const handleInputChange = (newInput: string) => {
    setInput(activeChatId || '', newInput, contextId);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  const handleStopGeneration = useCallback(() => {
    if (streamingState.messageId) {
      const fullStreamIdToAbort = `stream-${streamingState.messageId}`;
      abortStream(fullStreamIdToAbort);
      setStreamingState(null, null);
      console.log("Stopping generation for streamId:", fullStreamIdToAbort);
    }
  }, [streamingState.messageId, abortStream, setStreamingState]);

  const messagesWithRoles = useMemo(() => {
    if (!messages.length || !workspaceUsers.length) return messages;

    const userRoleMap = workspaceUsers.reduce((acc, user) => {
      acc[user.user_id] = user.role;
      return acc;
    }, {});

    return messages.map((message: IChatMessage) => ({
      ...message,
      sender_role: userRoleMap[message.sender] || 'user'
    }));
  }, [messages, workspaceUsers]);

  // Ensure guest agent exists when no user is logged in
  useEffect(() => {
    if (isGuest && !agent) {
      createGuestAgent();
      console.log('[Chat] Guest user detected, creating guest agent');
    }
  }, [isGuest, agent, createGuestAgent]);

  const [osswarmToolRequests, setOSSwarmToolRequests] = useState<Map<string, {
    approvalId: string;
    request: any;
    messageId: string;
  }>>(new Map());

  const agentTaskStore = useAgentTaskStore();

  useEffect(() => {
    console.log('[Chat] Setting up Agent listeners...');
    
    // ✅ Keep only tool-related handlers
    const handleToolApprovalRequest = async (event: any, data: { approvalId: string; request: any }) => {
      console.log('[Chat] Received Agent tool approval request:', data);
      
      if (!activeChatId) {
        console.warn('[Chat] No active chat ID, ignoring tool approval request');
        return;
      }
      
      // ✅ Get the current user's agent as the sender
      const { agent } = useAgentStore.getState();
      const currentUser = getUserFromStore();
      
      if (!agent) {
        console.error('[Chat] No agent available for Agent tool message');
        return;
      }
      
      // ✅ Get the original MCP server from the request
      const originalMCPServer = data.request.originalMCPServer || 'agent';
      console.log('[Chat] Original MCP server for tool:', originalMCPServer);
      
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
      
      // ✅ Create message using user's agent as sender
      const toolCallMessage: IChatMessage = {
        id: messageId,
        chat_id: activeChatId,
        sender: agent.id || '', // ✅ Use the user's agent ID
        sender_object: agent, // ✅ Use the actual agent object
        text: ``, // Keep empty text
        tool_calls: [toolCall],
        created_at: currentTime,
        sent_at: currentTime,
        status: 'completed',
      };

      console.log('[Chat] Adding Agent tool message with agent sender:', agent.username, toolCallMessage);

      // ✅ Save message to database using agent ID
      try {
        // Save the basic message first
        await window.electron.db.query({
          query: `
            INSERT INTO messages 
            (id, chat_id, sender, text, created_at, sent_at, status, workspace_id)
            VALUES (@id, @chat_id, @sender, @text, @created_at, @sent_at, @status, @workspace_id)
          `,
          params: {
            id: messageId,
            chat_id: activeChatId,
            sender: agent.id, // ✅ Use agent ID as sender
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
        
        console.log('[Chat] Agent tool message and tool call saved to database');
      } catch (error) {
        console.error('[Chat] Failed to save Agent tool message to database:', error);
      }

      // Add to UI
      appendMessage(activeChatId, toolCallMessage);
      
      // Track the request
      setOSSwarmToolRequests(prev => new Map(prev).set(data.approvalId, {
        approvalId: data.approvalId,
        request: data.request,
        messageId: toolCallMessage.id,
      }));
      
      console.log('[Chat] Agent tool request tracked, total requests:', osswarmToolRequests.size + 1);
    };

    const handleToolExecutionStart = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; toolName: string; agentId: string; agentRole: string };
      console.log('[Chat] Agent tool execution started:', data);
      
      // Update the tool call status to 'executing'
      const messages = useChatStore.getState().messages[activeChatId || ''] || [];
      const toolMessage = messages.find(msg => msg.id === `agent-tool-${data.executionId}`);
      
      if (toolMessage && toolMessage.tool_calls) {
        const updatedToolCalls = toolMessage.tool_calls.map(tc => 
          tc.id === data.executionId ? { ...tc, status: 'executing' as const } : tc
        );
        
        // Update in chat store
        updateMessage(activeChatId || '', toolMessage.id, {
          tool_calls: updatedToolCalls
        });
        
        // ✅ Update in database with fresh function reference
        try {
          const { updateToolCallStatus } = useLLMStore.getState();
          await updateToolCallStatus(data.executionId, 'executing');
          console.log('[Chat] Updated tool call status to executing in database');
        } catch (error) {
          console.error('[Chat] Failed to update tool call status in database:', error);
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
        approvalId: string; // This is the original approval ID
      };
      console.log('[Chat] Agent tool execution completed:', data);
      
      // ✅ Use the approval ID directly - no complex mapping
      const toolCallId = data.approvalId;
      const expectedMessageId = `agent-tool-${toolCallId}`;
      
      console.log('[Chat] 🔧 Looking for tool message:', {
        toolCallId,
        expectedMessageId,
        activeChatId
      });
      
      // Update the tool call with results
      const messages = useChatStore.getState().messages[activeChatId || ''] || [];
      const toolMessage = messages.find(msg => msg.id === expectedMessageId);
      
      if (toolMessage && toolMessage.tool_calls) {
        const targetToolCall = toolMessage.tool_calls.find(tc => tc.id === toolCallId);
        
        if (targetToolCall) {
          console.log('[Chat] 🔧 Found target tool call, updating...');
          
          const updatedToolCalls = toolMessage.tool_calls.map(tc => 
            tc.id === toolCallId ? { 
              ...tc, 
              status: data.success ? 'executed' as const : 'error' as const,
              result: data.result || data.error,
              execution_time_seconds: data.executionTime
            } : tc
          );
          
          // Update in chat store
          updateMessage(activeChatId || '', toolMessage.id, {
            tool_calls: updatedToolCalls
          });
          
          console.log('[Chat] 🔧 Updated tool call in chat store');
          
          // ✅ Update in database
          try {
            const { updateToolCallResult, updateToolCallStatus } = useLLMStore.getState();
            
            if (data.success && data.result) {
              console.log('[Chat] 🔧 Saving tool result to database...');
              
              await updateToolCallResult(
                toolCallId, 
                data.result, 
                data.executionTime
              );
              
              await updateToolCallStatus(toolCallId, 'executed');
              
              console.log('[Chat] ✅ Tool result saved to database successfully');
            } else {
              await updateToolCallStatus(toolCallId, 'error');
              console.log('[Chat] ✅ Tool error status saved to database');
            }
          } catch (error) {
            console.error('[Chat] ❌ Failed to save tool result to database:', error);
          }
        } else {
          console.warn('[Chat] ❌ Could not find target tool call:', {
            toolCallId,
            availableToolCallIds: toolMessage.tool_calls.map(tc => tc.id)
          });
        }
      } else {
        console.warn('[Chat] ❌ Could not find tool message:', {
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
      
      console.log(`🔍 [RENDERER-MCP] ==================== MCP TOOL HANDLER START ====================`);
      console.log(`🔍 [RENDERER-MCP] MCP tool execution request:`, {
        executionId: data.executionId,
        serverName: data.serverName,
        toolName: data.toolName,
        hasArguments: !!data.arguments,
        argumentsType: typeof data.arguments,
        responseChannel: data.responseChannel
      });
      
      try {
        console.log(`🔍 [RENDERER-MCP] Step 1: Getting MCP client store...`);
        const mcpClientStore = useMCPClientStore.getState();
        console.log(`🔍 [RENDERER-MCP] MCP Client Store state:`, {
          hasExecuteTool: typeof mcpClientStore.executeTool === 'function',
          storeKeys: Object.keys(mcpClientStore).filter(key => typeof mcpClientStore[key as keyof typeof mcpClientStore] === 'function')
        });
        
        const { executeTool } = mcpClientStore;
        
        if (!executeTool) {
          throw new Error('executeTool function not available in MCP client store');
        }
        
        console.log(`🔍 [RENDERER-MCP] Step 2: Calling executeTool...`);
        console.log(`🔍 [RENDERER-MCP] Parameters:`, {
          serverName: data.serverName,
          toolName: data.toolName,
          argumentsType: typeof data.arguments,
          argumentsContent: data.arguments
        });
        
        const result = await executeTool(data.serverName, data.toolName, data.arguments);
        
        console.log(`🔍 [RENDERER-MCP] ✅ MCP tool execution result:`, {
          success: result?.success,
          hasData: !!result?.data,
          dataType: typeof result?.data,
          error: result?.error,
          executionId: data.executionId
        });
        
        console.log(`🔍 [RENDERER-MCP] Step 3: Sending result back via IPC channel: ${data.responseChannel}`);
        (window.electron.ipcRenderer as any).send(data.responseChannel, result);
        console.log(`🔍 [RENDERER-MCP] ✅ Response sent successfully`);
        
      } catch (error: any) {
        console.error(`🔍 [RENDERER-MCP] ❌ MCP tool execution failed:`, {
          message: error.message,
          stack: error.stack,
          name: error.name,
          executionId: data.executionId,
          toolName: data.toolName,
          serverName: data.serverName
        });
        
        console.log(`🔍 [RENDERER-MCP] Sending error response via IPC channel: ${data.responseChannel}`);
        (window.electron.ipcRenderer as any).send(data.responseChannel, {
          success: false,
          error: error.message,
          executionId: data.executionId
        });
      } finally {
        console.log(`🔍 [RENDERER-MCP] ==================== MCP TOOL HANDLER END ====================`);
      }
    };

    // ✅ Register only tool-related listeners
    const unsubscribeApproval = window.electron?.agent?.onToolApprovalRequest?.(handleToolApprovalRequest);
    const unsubscribeStart = window.electron?.ipcRenderer?.on?.('agent:tool_execution_start', handleToolExecutionStart);
    const unsubscribeComplete = window.electron?.ipcRenderer?.on?.('agent:tool_execution_complete', handleToolExecutionComplete);
    const unsubscribeMCPExecution = window.electron?.ipcRenderer?.on?.('agent:execute_mcp_tool', handleMCPToolExecution);
    
    return () => {
      console.log('[Chat] Cleaning up Agent listeners');
      unsubscribeApproval?.();
      unsubscribeStart?.();
      unsubscribeComplete?.();
      unsubscribeMCPExecution?.();
    };
  }, [activeChatId, appendMessage, updateMessage]);

  // ✅ Add ref for the chat container to constrain fullscreen
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // ✅ Add overlay visibility state
  const [showAgentOverlay, setShowAgentOverlay] = useState(false);

  // ✅ Handle Agent toggle - updated to track state properly
  const handleAgentToggle = useCallback((show: boolean) => {
    setShowAgentOverlay(show);
  }, []);

  // ✅ Handle overlay close - notify the toggle
  const handleOverlayClose = useCallback(() => {
    setShowAgentOverlay(false);
  }, []);

  // Add this new useEffect for LangGraph human interactions
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

  // Add state for LangGraph interactions
  const [langGraphInteractions, setLangGraphInteractions] = useState<Map<string, {
    interactionId: string;
    request: any;
    messageType: string;
    messageId: string | null;
  }>>(new Map());

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
      await resumeLangGraphWorkflow(interaction.request.threadId, response);
      
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
  }, [langGraphInteractions, activeChatId, updateMessage]);

  // ✅ Expose the handler globally so ToolDisplay can use it
  useEffect(() => {
    (window as any).handleHumanInteractionResponse = handleHumanInteractionResponse;
    return () => {
      delete (window as any).handleHumanInteractionResponse;
    };
  }, [handleHumanInteractionResponse]);

  return (
    <Box
      key={chatInstanceId}
      ref={chatContainerRef}
      sx={{
        height: "calc(100% - 5px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <ChatHeader />
      <Box
        sx={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
          position: "relative"
        }}
      >
        {!activeChatId ? (
          // Show no chat UI when no chat is selected - now handles guest users properly
          <ChatUIWithNoChat />
        ) : (
          (() => {
            try {
              return (
                <>
                  <ChatUI
                    messages={messagesWithRoles}
                    onReply={handleReply}
                    streamingMessageId={
                      streamingState.chatId === activeChatId
                        ? streamingState.messageId
                        : null
                    }
                    streamContentForBubble={
                      streamingState.chatId === activeChatId
                        ? currentStreamContent
                        : ""
                    }
                    isConnectingForBubble={
                      streamingState.chatId === activeChatId
                        ? isCurrentlyConnectingForUI
                        : false
                    }
                  />

                  {/* ✅ Enhanced Agent Work Overlay with proper close handling */}
                  <AgentWorkOverlay 
                    visible={showAgentOverlay}
                    onClose={handleOverlayClose}
                    containerRef={chatContainerRef}
                    respectParentBounds={true}
                    fullscreenMargin={20}
                  />

                  {/* Existing streaming indicator for non-agent modes */}
                  {streamingState.messageId && isCurrentlyConnectingForUI && streamingState.chatId === activeChatId && aiMode !== "agent" && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        bgcolor: 'background.paper',
                        boxShadow: 3,
                        padding: '6px 12px',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <CircularProgress
                        size={16}
                        thickness={4}
                        sx={{
                          color: 'text.secondary',
                          mr: 1.5
                        }}
                      />
                      <Typography
                        color="text.secondary"
                        sx={{
                          mr: 2,
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}
                      >
                        Generating...
                      </Typography>
                      <Typography
                        onClick={handleStopGeneration}
                        color="error"
                        variant="button"
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                          mr: 1,
                          fontSize: '0.75rem',
                          fontWeight: 'medium',
                        }}
                      >
                        Stop
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        ({tokenRate} t/s)
                      </Typography>
                    </Box>
                  )}
                </>
              );
            } catch (e) {
              console.error("Error rendering ChatUI:", e);
              return <Box p={2}>Error loading messages</Box>;
            }
          })()
        )}
      </Box>
      {activeChatId && (
        <ChatInput
          input={input}
          setInput={handleInputChange}
          handleSend={handleSend}
          replyingTo={replyingToMessage}
          onCancelReply={handleCancelReply}
          onAgentToggle={handleAgentToggle}
          agentOverlayVisible={showAgentOverlay}
        />
      )}
    </Box>
  );
}

export default Chat;


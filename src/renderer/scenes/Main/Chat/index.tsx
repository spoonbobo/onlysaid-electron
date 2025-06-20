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
import AgentWorkOverlay from "./AgentWorkOverlay";
import { useMCPClientStore } from "@/renderer/stores/MCP/MCPClient";
import { useLLMStore } from "@/renderer/stores/LLM/LLMStore";

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
    executeOSSwarmTask,
    osswarmUpdates
  } = useStreamStore();

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
  const activeChatId = selectedContext?.section ? selectedTopics[selectedContext.section] || null : null;
  const { user: currentUser } = useUserStore();
  const {
    agent,
    isProcessingResponse,
    processAgentResponse,
    createGuestAgent
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
                workspaceId: aiMode === "query" ? selectedContext?.id : undefined,
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

  useEffect(() => {
    console.log('[Chat] Setting up OSSwarm tool listeners...');
    
    const handleToolApprovalRequest = async (event: any, data: { approvalId: string; request: any }) => {
      console.log('[Chat] Received OSSwarm tool approval request:', data);
      
      if (!activeChatId) {
        console.warn('[Chat] No active chat ID, ignoring tool approval request');
        return;
      }
      
      // ✅ Get the current user's agent as the sender
      const { agent } = useAgentStore.getState();
      const currentUser = getUserFromStore();
      
      if (!agent) {
        console.error('[Chat] No agent available for OSSwarm tool message');
        return;
      }
      
      // ✅ Get the original MCP server from the request
      const originalMCPServer = data.request.originalMCPServer || 'osswarm';
      console.log('[Chat] Original MCP server for tool:', originalMCPServer);
      
      const messageId = `osswarm-tool-${data.approvalId}`;
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

      console.log('[Chat] Adding OSSwarm tool message with agent sender:', agent.username, toolCallMessage);

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
        
        console.log('[Chat] OSSwarm tool message and tool call saved to database');
      } catch (error) {
        console.error('[Chat] Failed to save OSSwarm tool message to database:', error);
      }

      // Add to UI
      appendMessage(activeChatId, toolCallMessage);
      
      // Track the request
      setOSSwarmToolRequests(prev => new Map(prev).set(data.approvalId, {
        approvalId: data.approvalId,
        request: data.request,
        messageId: toolCallMessage.id,
      }));
      
      console.log('[Chat] OSSwarm tool request tracked, total requests:', osswarmToolRequests.size + 1);
    };

    // ✅ Handle tool execution start - get fresh store functions
    const handleToolExecutionStart = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { executionId: string; toolName: string; agentId: string; agentRole: string };
      console.log('[Chat] OSSwarm tool execution started:', data);
      
      // Update the tool call status to 'executing'
      const messages = useChatStore.getState().messages[activeChatId || ''] || [];
      const toolMessage = messages.find(msg => msg.id === `osswarm-tool-${data.executionId}`);
      
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

    // ✅ Handle tool execution completion - get fresh store functions
    const handleToolExecutionComplete = async (event: any, ...args: unknown[]) => {
      const data = args[0] as { 
        executionId: string; 
        toolName: string; 
        result?: string; 
        error?: string; 
        success: boolean;
        toolResults?: any[];
        executionTime?: number;
      };
      console.log('[Chat] OSSwarm tool execution completed:', data);
      
      // Update the tool call with results
      const messages = useChatStore.getState().messages[activeChatId || ''] || [];
      const toolMessage = messages.find(msg => msg.id === `osswarm-tool-${data.executionId}`);
      
      if (toolMessage && toolMessage.tool_calls) {
        const updatedToolCalls = toolMessage.tool_calls.map(tc => 
          tc.id === data.executionId ? { 
            ...tc, 
            status: data.success ? 'executed' as const : 'error' as const,
            result: data.result || data.error,
            execution_time_seconds: data.executionTime ? Math.floor(data.executionTime / 1000) : undefined
          } : tc
        );
        
        // Update in chat store
        updateMessage(activeChatId || '', toolMessage.id, {
          tool_calls: updatedToolCalls
        });
        
        // ✅ Update in database with fresh function references
        try {
          const { updateToolCallResult, updateToolCallStatus } = useLLMStore.getState();
          
          if (data.success && data.result) {
            await updateToolCallResult(
              data.executionId, 
              data.result, 
              data.executionTime ? Math.floor(data.executionTime / 1000) : undefined
            );
          } else {
            await updateToolCallStatus(data.executionId, 'error');
          }
          
          console.log('[Chat] Updated tool call result/status in database');
        } catch (error) {
          console.error('[Chat] Failed to update tool call result in database:', error);
        }
      }
    };

    // ✅ Move MCP tool execution handler inside this useEffect
    const handleMCPToolExecution = async (event: any, ...args: unknown[]) => {
      const data = args[0] as {
        executionId: string;
        serverName: string;
        toolName: string;
        arguments: any;
        responseChannel: string;
      };
      
      console.log('[Chat] 🔧 Executing MCP tool for OSSwarm:', {
        executionId: data.executionId,
        serverName: data.serverName,
        toolName: data.toolName,
        arguments: data.arguments,
        responseChannel: data.responseChannel
      });
      
      try {
        // Check if MCP client store is available
        const mcpClientStore = useMCPClientStore.getState();
        console.log('[Chat] 🔧 MCP Client Store state:', {
          hasExecuteTool: typeof mcpClientStore.executeTool === 'function',
          storeKeys: Object.keys(mcpClientStore)
        });
        
        const { executeTool } = mcpClientStore;
        
        if (!executeTool) {
          throw new Error('executeTool function not available in MCP client store');
        }
        
        console.log('[Chat] 🔧 Calling executeTool with:', {
          serverName: data.serverName,
          toolName: data.toolName,
          argumentsType: typeof data.arguments,
          argumentsContent: data.arguments
        });
        
        const result = await executeTool(data.serverName, data.toolName, data.arguments);
        
        console.log('[Chat] 🔧 MCP tool execution result:', {
          success: result?.success,
          hasData: !!result?.data,
          dataType: typeof result?.data,
          dataContent: result?.data,
          error: result?.error,
          fullResult: result
        });
        
        // Send result back to main process
        console.log('[Chat] 🔧 Sending result back via IPC channel:', data.responseChannel);
        (window.electron.ipcRenderer as any).send(data.responseChannel, result);
        
      } catch (error: any) {
        console.error('[Chat] 🔧 MCP tool execution failed:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          executionId: data.executionId,
          toolName: data.toolName
        });
        
        // Send error back to main process
        (window.electron.ipcRenderer as any).send(data.responseChannel, {
          success: false,
          error: error.message
        });
      }
    };

    // Register all listeners
    const unsubscribeApproval = window.electron?.osswarm?.onToolApprovalRequest?.(handleToolApprovalRequest);
    const unsubscribeStart = window.electron?.ipcRenderer?.on?.('osswarm:tool_execution_start', handleToolExecutionStart);
    const unsubscribeComplete = window.electron?.ipcRenderer?.on?.('osswarm:tool_execution_complete', handleToolExecutionComplete);
    const unsubscribeMCPExecution = window.electron?.ipcRenderer?.on?.('osswarm:execute_mcp_tool', handleMCPToolExecution);
    
    return () => {
      console.log('[Chat] Cleaning up OSSwarm tool listeners');
      unsubscribeApproval?.();
      unsubscribeStart?.();
      unsubscribeComplete?.();
      unsubscribeMCPExecution?.();
    };
  }, [activeChatId, appendMessage, updateMessage]);

  return (
    <Box
      key={chatInstanceId}
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

                  {/* Agent Work Overlay */}
                  <AgentWorkOverlay />

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
        />
      )}
    </Box>
  );
}

export default Chat;


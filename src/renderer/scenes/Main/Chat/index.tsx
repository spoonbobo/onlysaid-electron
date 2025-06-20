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
import AgentWorkOverlay from "../../../components/OSSwarm/AgentWorkOverlay";
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
    console.log('[Chat] Setting up OSSwarm listeners...');
    
    // ✅ Handle database operations from OSSwarm Core
    const handleCreateExecution = async (event: any, data: any) => {
      try {
        const { taskDescription, chatId, workspaceId, responseChannel } = data;
        
        console.log('[Chat] Creating OSSwarm execution via AgentTaskStore:', {
          taskDescription: taskDescription?.substring(0, 50) + '...',
          chatId,
          workspaceId
        });
        
        const createdId = await agentTaskStore.createExecution(taskDescription, chatId, workspaceId);
        
        window.electron.ipcRenderer.send(responseChannel, {
          success: true,
          data: { executionId: createdId }
        });
      } catch (error: any) {
        console.error('[Chat] Error creating OSSwarm execution:', error);
        window.electron.ipcRenderer.send(data.responseChannel, {
          success: false,
          error: error.message
        });
      }
    };

    const handleCreateAgent = async (event: any, data: any) => {
      try {
        const { executionId, agentId, role, expertise, responseChannel } = data;
        
        console.log('[Chat] Creating OSSwarm agent via AgentTaskStore:', {
          executionId,
          agentId,
          role
        });
        
        const dbAgentId = await agentTaskStore.createAgent(executionId, agentId, role, expertise);
        
        window.electron.ipcRenderer.send(responseChannel, {
          success: true,
          data: { dbAgentId }
        });
      } catch (error: any) {
        console.error('[Chat] Error creating OSSwarm agent:', error);
        window.electron.ipcRenderer.send(data.responseChannel, {
          success: false,
          error: error.message
        });
      }
    };

    const handleCreateTask = async (event: any, data: any) => {
      try {
        const { executionId, agentId, taskDescription, priority, responseChannel } = data;
        
        console.log('[Chat] Creating OSSwarm task via AgentTaskStore:', {
          executionId,
          agentId,
          taskDescription: taskDescription?.substring(0, 50) + '...'
        });
        
        const taskId = await agentTaskStore.createTask(executionId, agentId, taskDescription, priority);
        
        window.electron.ipcRenderer.send(responseChannel, {
          success: true,
          data: { taskId }
        });
      } catch (error: any) {
        console.error('[Chat] Error creating OSSwarm task:', error);
        window.electron.ipcRenderer.send(data.responseChannel, {
          success: false,
          error: error.message
        });
      }
    };

    const handleCreateToolExecution = async (event: any, data: any) => {
      try {
        const { executionId, agentId, toolName, toolArguments, approvalId, mcpServer, taskId, responseChannel } = data;
        
        console.log('[Chat] Creating OSSwarm tool execution via AgentTaskStore:', {
          executionId,
          agentId,
          toolName,
          approvalId
        });
        
        const toolExecutionId = await agentTaskStore.createToolExecution(
          executionId,
          agentId,
          toolName,
          toolArguments,
          approvalId,
          taskId,
          mcpServer
        );
        
        window.electron.ipcRenderer.send(responseChannel, {
          success: true,
          data: { toolExecutionId }
        });
      } catch (error: any) {
        console.error('[Chat] Error creating OSSwarm tool execution:', error);
        window.electron.ipcRenderer.send(data.responseChannel, {
          success: false,
          error: error.message
        });
      }
    };

    const handleUpdateExecutionStatus = async (event: any, data: any) => {
      try {
        const { executionId, status, result, error, responseChannel } = data;
        
        console.log('[Chat] Updating OSSwarm execution status via AgentTaskStore:', {
          executionId,
          status
        });
        
        await agentTaskStore.updateExecutionStatus(executionId, status, result, error);
        
        if (responseChannel) {
          window.electron.ipcRenderer.send(responseChannel, {
            success: true,
            data: {}
          });
        }
      } catch (error: any) {
        console.error('[Chat] Error updating OSSwarm execution status:', error);
        if (data.responseChannel) {
          window.electron.ipcRenderer.send(data.responseChannel, {
            success: false,
            error: error.message
          });
        }
      }
    };

    const handleUpdateAgentStatus = async (event: any, data: any) => {
      try {
        const { agentId, status, currentTask, responseChannel } = data;
        
        console.log('[Chat] Updating OSSwarm agent status via AgentTaskStore:', {
          agentId,
          status
        });
        
        await agentTaskStore.updateAgentStatus(agentId, status, currentTask);
        
        if (responseChannel) {
          window.electron.ipcRenderer.send(responseChannel, {
            success: true,
            data: {}
          });
        }
      } catch (error: any) {
        console.error('[Chat] Error updating OSSwarm agent status:', error);
        if (data.responseChannel) {
          window.electron.ipcRenderer.send(data.responseChannel, {
            success: false,
            error: error.message
          });
        }
      }
    };

    const handleUpdateTaskStatus = async (event: any, data: any) => {
      try {
        const { taskId, status, result, error, responseChannel } = data;
        
        console.log('[Chat] Updating OSSwarm task status via AgentTaskStore:', {
          taskId,
          status
        });
        
        await agentTaskStore.updateTaskStatus(taskId, status, result, error);
        
        if (responseChannel) {
          window.electron.ipcRenderer.send(responseChannel, {
            success: true,
            data: {}
          });
        }
      } catch (error: any) {
        console.error('[Chat] Error updating OSSwarm task status:', error);
        if (data.responseChannel) {
          window.electron.ipcRenderer.send(data.responseChannel, {
            success: false,
            error: error.message
          });
        }
      }
    };

    const handleUpdateToolExecutionStatus = async (event: any, data: any) => {
      try {
        const { toolExecutionId, status, result, error, executionTime, responseChannel } = data;
        
        console.log('[Chat] Updating OSSwarm tool execution status via AgentTaskStore:', {
          toolExecutionId,
          status
        });
        
        await agentTaskStore.updateToolExecutionStatus(toolExecutionId, status, result, error, executionTime);
        
        if (responseChannel) {
          window.electron.ipcRenderer.send(responseChannel, {
            success: true,
            data: {}
          });
        }
      } catch (error: any) {
        console.error('[Chat] Error updating OSSwarm tool execution status:', error);
        if (data.responseChannel) {
          window.electron.ipcRenderer.send(data.responseChannel, {
            success: false,
            error: error.message
          });
        }
      }
    };

    const handleUpdateToolExecutionByApproval = async (event: any, data: any) => {
      try {
        const { approvalId, status, result, error, executionTime, responseChannel } = data;
        
        console.log('[Chat] Updating OSSwarm tool execution by approval via AgentTaskStore:', {
          approvalId,
          status
        });
        
        await agentTaskStore.updateToolExecutionByApprovalId(approvalId, status, result, error, executionTime);
        
        if (responseChannel) {
          window.electron.ipcRenderer.send(responseChannel, {
            success: true,
            data: {}
          });
        }
      } catch (error: any) {
        console.error('[Chat] Error updating OSSwarm tool execution by approval:', error);
        if (data.responseChannel) {
          window.electron.ipcRenderer.send(data.responseChannel, {
            success: false,
            error: error.message
          });
        }
      }
    };

    // Keep existing handlers...
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
      console.log('[Chat] OSSwarm tool execution completed:', data);
      
      // ✅ Use the approval ID directly - no complex mapping
      const toolCallId = data.approvalId;
      const expectedMessageId = `osswarm-tool-${toolCallId}`;
      
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
    window.electron.ipcRenderer.removeAllListeners('osswarm:create_execution');
    window.electron.ipcRenderer.removeAllListeners('osswarm:create_agent');
    window.electron.ipcRenderer.removeAllListeners('osswarm:create_task');
    window.electron.ipcRenderer.removeAllListeners('osswarm:create_tool_execution');
    window.electron.ipcRenderer.removeAllListeners('osswarm:update_execution_status');
    window.electron.ipcRenderer.removeAllListeners('osswarm:update_agent_status');
    window.electron.ipcRenderer.removeAllListeners('osswarm:update_task_status');
    window.electron.ipcRenderer.removeAllListeners('osswarm:update_tool_execution_status');

    window.electron.ipcRenderer.on('osswarm:create_execution', handleCreateExecution);
    window.electron.ipcRenderer.on('osswarm:create_agent', handleCreateAgent);
    window.electron.ipcRenderer.on('osswarm:create_task', handleCreateTask);
    window.electron.ipcRenderer.on('osswarm:create_tool_execution', handleCreateToolExecution);
    window.electron.ipcRenderer.on('osswarm:update_execution_status', handleUpdateExecutionStatus);
    window.electron.ipcRenderer.on('osswarm:update_agent_status', handleUpdateAgentStatus);
    window.electron.ipcRenderer.on('osswarm:update_task_status', handleUpdateTaskStatus);
    window.electron.ipcRenderer.on('osswarm:update_tool_execution_status', handleUpdateToolExecutionStatus);
    window.electron.ipcRenderer.on('osswarm:update_tool_execution_by_approval', handleUpdateToolExecutionByApproval);

    const unsubscribeApproval = window.electron?.osswarm?.onToolApprovalRequest?.(handleToolApprovalRequest);
    const unsubscribeStart = window.electron?.ipcRenderer?.on?.('osswarm:tool_execution_start', handleToolExecutionStart);
    const unsubscribeComplete = window.electron?.ipcRenderer?.on?.('osswarm:tool_execution_complete', handleToolExecutionComplete);
    const unsubscribeMCPExecution = window.electron?.ipcRenderer?.on?.('osswarm:execute_mcp_tool', handleMCPToolExecution);
    
    return () => {
      console.log('[Chat] Cleaning up OSSwarm listeners');
      window.electron.ipcRenderer.removeAllListeners('osswarm:create_execution');
      window.electron.ipcRenderer.removeAllListeners('osswarm:create_agent');
      window.electron.ipcRenderer.removeAllListeners('osswarm:create_task');
      window.electron.ipcRenderer.removeAllListeners('osswarm:create_tool_execution');
      window.electron.ipcRenderer.removeAllListeners('osswarm:update_execution_status');
      window.electron.ipcRenderer.removeAllListeners('osswarm:update_agent_status');
      window.electron.ipcRenderer.removeAllListeners('osswarm:update_task_status');
      window.electron.ipcRenderer.removeAllListeners('osswarm:update_tool_execution_status');
      window.electron.ipcRenderer.removeAllListeners('osswarm:update_tool_execution_by_approval');
      unsubscribeApproval?.();
      unsubscribeStart?.();
      unsubscribeComplete?.();
      unsubscribeMCPExecution?.();
    };
  }, [activeChatId, appendMessage, updateMessage, agentTaskStore]);

  // ✅ ADD: OSSwarm real-time update listeners
  useEffect(() => {
    console.log('[Chat] Setting up OSSwarm real-time update listeners...');
    
    const handleExecutionUpdate = (event: any, data: any) => {
      console.log('[Chat] Received execution update:', data);
      agentTaskStore.handleExecutionUpdate(data);
    };

    const handleAgentUpdate = (event: any, data: any) => {
      console.log('[Chat] Received agent update:', data);
      agentTaskStore.handleAgentUpdate(data);
    };

    const handleTaskUpdate = (event: any, data: any) => {
      console.log('[Chat] Received task update:', data);
      agentTaskStore.handleTaskUpdate(data);
    };

    const handleToolExecutionUpdate = (event: any, data: any) => {
      console.log('[Chat] Received tool execution update:', data);
      agentTaskStore.handleToolExecutionUpdate(data);
    };

    // ✅ Register IPC listeners for real-time updates
    window.electron.ipcRenderer.on('osswarm:execution_updated', handleExecutionUpdate);
    window.electron.ipcRenderer.on('osswarm:agent_updated', handleAgentUpdate);
    window.electron.ipcRenderer.on('osswarm:task_updated', handleTaskUpdate);
    window.electron.ipcRenderer.on('osswarm:tool_execution_updated', handleToolExecutionUpdate);

    return () => {
      console.log('[Chat] Cleaning up OSSwarm real-time update listeners');
      window.electron.ipcRenderer.removeListener('osswarm:execution_updated', handleExecutionUpdate);
      window.electron.ipcRenderer.removeListener('osswarm:agent_updated', handleAgentUpdate);
      window.electron.ipcRenderer.removeListener('osswarm:task_updated', handleTaskUpdate);
      window.electron.ipcRenderer.removeListener('osswarm:tool_execution_updated', handleToolExecutionUpdate);
    };
  }, [agentTaskStore]);

  // ✅ Add ref for the chat container to constrain fullscreen
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // ✅ Add overlay visibility state
  const [showAgentOverlay, setShowAgentOverlay] = useState(false);

  // ✅ Handle OSSwarm toggle - updated to track state properly
  const handleOSSwarmToggle = useCallback((show: boolean) => {
    setShowAgentOverlay(show);
  }, []);

  // ✅ Handle overlay close - notify the toggle
  const handleOverlayClose = useCallback(() => {
    setShowAgentOverlay(false);
  }, []);

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
          onOSSwarmToggle={handleOSSwarmToggle}
          // ✅ Pass the overlay state to ChatInput
          osswarmOverlayVisible={showAgentOverlay}
        />
      )}
    </Box>
  );
}

export default Chat;


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
import { useStreamStore } from "@/renderer/stores/Stream/StreamStore";
import { useUserStore } from "@/renderer/stores/User/UserStore";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useLLMConfigurationStore } from "@/renderer/stores/LLM/LLMConfiguration";
import { toast } from "@/utils/toast";
import { IChatRoom } from "@/../../types/Chat/Chatroom";
import ChatUIWithNoChat from "@/renderer/scenes/Main/Chat/default";

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

  // 🔍 DEBUG: Check chat store and validation
  useEffect(() => {
    if (selectedContext?.section === 'workspace:avatar' && activeChatId) {
      const { chats } = useChatStore.getState();
      const foundChat = chats.find(chat => chat.id === activeChatId);
      
      // Avatar chat type calculation
      const workspaceId = selectedContext?.id;
      const avatarName = 'alice'; // This should match your avatar name
      const expectedAvatarChatType = `${workspaceId}:${avatarName}`;
      
      console.log('🐛 Avatar Chat Validation:', {
        activeChatId,
        foundChat: foundChat ? {
          id: foundChat.id,
          name: foundChat.name,
          type: foundChat.type,
          workspace_id: foundChat.workspace_id
        } : null,
        expectedAvatarChatType,
        chatMatches: foundChat?.type === expectedAvatarChatType,
        hasNoWorkspaceId: foundChat && !foundChat.workspace_id,
        allChats: chats.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          workspace_id: c.workspace_id
        }))
      });
    }
  }, [selectedContext, activeChatId]);

  // 🔍 DEBUG: Add this debugging code to identify the issue
  useEffect(() => {
    if (selectedContext?.section === 'workspace:avatar') {
      console.log('🐛 Avatar Chat Debug:', {
        selectedContext: selectedContext,
        section: selectedContext?.section,
        selectedTopics: selectedTopics,
        activeChatId: activeChatId,
        topicKeys: Object.keys(selectedTopics),
        avatarTopicValue: selectedTopics['workspace:avatar'],
        workspaceId: selectedContext?.id
      });
    }
  }, [selectedContext, selectedTopics, activeChatId]);

  const { user: currentUser } = useUserStore();
  const {
    agent,
    isProcessingResponse,
    processAgentResponse,
    createGuestAgent,
    resumeLangGraphWorkflow
  } = useAgentStore();
  const isLocal = currentUser?.id ? false : true;
  
  // NEW: Check if we're in avatar mode to force local chat
  const isAvatarMode = selectedContext?.section === 'workspace:avatar';
  
  // NEW: Check if we're in copilot mode to force local chat
  const isCopilotMode = selectedContext?.section === 'local:copilot';
  
  let workspaceId = '';
  if (!isLocal && !isAvatarMode && !isCopilotMode) { // Don't use workspace for avatar or copilot mode
    workspaceId = selectedContext?.id || '';
  }

  const { getUsersByWorkspace } = useWorkspaceStore();
  const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);

  const isGuest = isGuestUser();

  useEffect(() => {
    // Only fetch workspace users if not in avatar or copilot mode
    if (workspaceId && !isAvatarMode && !isCopilotMode) {
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
  }, [workspaceId, getUsersByWorkspace, isAvatarMode, isCopilotMode]);

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

        // NEW: Pass workspaceId only if not in avatar or copilot mode
        const effectiveWorkspaceId = (isAvatarMode || isCopilotMode) ? undefined : workspaceId;
        const messageId = await sendMessage(activeChatId, messageData, effectiveWorkspaceId);

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
                workspaceId: (isAvatarMode || isCopilotMode) ? undefined : selectedContext?.id, // Don't pass workspace for avatar or copilot mode
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

  const handleInputChange = useCallback((newInput: string) => {
    setInput(activeChatId || '', newInput, contextId);
  }, [setInput, activeChatId, contextId]);

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
    // Only add roles if we have workspace users (not in avatar or copilot mode)
    if (!messages.length || !workspaceUsers.length || isAvatarMode || isCopilotMode) return messages;

    const userRoleMap = workspaceUsers.reduce((acc, user) => {
      acc[user.user_id] = user.role;
      return acc;
    }, {});

    return messages.map((message: IChatMessage) => ({
      ...message,
      sender_role: userRoleMap[message.sender] || 'user'
    }));
  }, [messages, workspaceUsers, isAvatarMode, isCopilotMode]);

  // Ensure guest agent exists when no user is logged in
  useEffect(() => {
    if (isGuest && !agent) {
      createGuestAgent();
      console.log('[Chat] Guest user detected, creating guest agent');
    }
  }, [isGuest, agent, createGuestAgent]);

  // 🔍 DEBUG: Final render decision
  if (selectedContext?.section === 'workspace:avatar') {
    console.log('🐛 Avatar Render Decision:', {
      activeChatId,
      willShowNoChat: !activeChatId,
      willShowChatUI: !!activeChatId
    });
  }

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
      <div ref={messagesEndRef} />
    </Box>
  );
}

export default Chat;


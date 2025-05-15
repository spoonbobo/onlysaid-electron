import { Box, CircularProgress } from "@mui/material";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage } from "@/../../types/Chat/Message";
import { getUserFromStore } from "@/utils/user";
import { IUser } from "@/../../types/User/User";
import { IFile } from "@/../../types/File/File";
import { v4 as uuidv4 } from 'uuid';
import { Typography } from "@mui/material";
import { useChatStore } from "@/stores/Chat/ChatStore";
import { useCurrentTopicContext, useTopicStore } from "@/stores/Topic/TopicStore";
import { useSelectedModelStore } from "@/stores/LLM/SelectedModelStore";
import { useStreamStore, OpenAIMessage } from "@/stores/SSE/StreamStore";
import { useUserStore } from "@/stores/User/UserStore";
import { useAgentStore } from "@/stores/Agent/AgentStore";
import { useWorkspaceStore } from "@/stores/Workspace/WorkspaceStore";

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


  const { modelId, provider, modelName } = useSelectedModelStore();
  const {
    messages: streamDataForId,
    isConnecting: storeIsConnecting,
    abortStream,
    streamChatCompletion
  } = useStreamStore();

  const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
  const activeChatId = selectedContext?.section ? selectedTopics[selectedContext.section] || null : null;
  const { user } = useUserStore();
  const { agent } = useAgentStore();
  const isLocal = user?.id ? false : true;
  let workspaceId = '';
  if (!isLocal) {
    workspaceId = selectedContext?.id || '';
  }

  const { getUsersByWorkspace } = useWorkspaceStore();
  const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);

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
  const replyingToMessage = replyingToId ? messages.find(m => m.id === replyingToId) || null : null;

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


  useEffect(() => {
    if (activeChatId && useChatStore.getState().chats.some(chat => chat.id === activeChatId)) {
      fetchMessages(activeChatId);
    }
  }, [activeChatId, fetchMessages]);

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
      (messageData.text?.trim() || messageData.files)
      && activeChatId
    ) {
      try {
        messageData.created_at = new Date().toISOString();

        if (replyingToId) {
          messageData.reply_to = replyingToId;
        }

        const fileIds = messageData.files?.map(file => file.id);
        messageData.files = fileIds as unknown as IFile[];

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

          if (modelId && provider && messageData.text) {
            const assistantSender = agent;
            const assistantSenderId = agent?.id || "";
            if (!agent) {
              console.warn("[Chat] Agent not found in store, falling back for assistant message sender.");
            }

            const assistantMessage: IChatMessage = {
              id: uuidv4(),
              chat_id: activeChatId,
              sender: assistantSenderId,
              sender_object: assistantSender as IUser,
              text: "",
              created_at: new Date().toISOString(),
              sent_at: new Date().toISOString(),
              status: "pending"
            };

            appendMessage(activeChatId, assistantMessage);

            setStreamingState(assistantMessage.id, activeChatId);

            setCurrentStreamContent("");
            streamStartTimeRef.current = null;
            tokenCountRef.current = 0;
            setTokenRate(0);

            try {
              const lastMessages = messages.slice(-10).map(msg => ({
                role: msg.sender === currentUser?.id ? "user" : "assistant",
                content: msg.text || ""
              }));

              lastMessages.push({ role: "user", content: messageData.text || "" });

              const response = await streamChatCompletion(
                lastMessages as OpenAIMessage[],
                {
                  model: modelId,
                  streamId: `stream-${assistantMessage.id}`,
                  provider: provider
                }
              );
              console.log("sender", assistantSenderId);

              updateMessage(activeChatId, assistantMessage.id, {
                text: response,
                sender: assistantSenderId
              });

              markStreamAsCompleted(activeChatId, response);

            } catch (error) {
              console.error("Stream error:", error);
              updateMessage(activeChatId, assistantMessage.id, {
                text: "Error generating response. Please try again."
              });
            } finally {
              const earnedXP = Math.floor(tokenCountRef.current / 10);
              useAgentStore.getState().gainExperience(earnedXP);
              setStreamingState(null, null);
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
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

    return messages.map(message => ({
      ...message,
      sender_role: userRoleMap[message.sender] || 'user'
    }));
  }, [messages, workspaceUsers]);

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
        {(() => {
          try {
            return (
              <>
                <ChatUI
                  messages={messagesWithRoles}
                  onReply={handleReply}
                  streamingMessageId={
                    streamingState.chatId === activeChatId
                      ? streamingState.messageId
                      : (useTopicStore.getState().completedStreams[activeChatId || '']?.messageId || null)
                  }
                  streamContentForBubble={
                    streamingState.chatId === activeChatId
                      ? currentStreamContent
                      : (useTopicStore.getState().completedStreams[activeChatId || '']?.messageId
                        ? streamDataForId[`stream-${useTopicStore.getState().completedStreams[activeChatId || '']?.messageId}`]?.full || ""
                        : "")
                  }
                  isConnectingForBubble={
                    streamingState.chatId === activeChatId
                      ? isCurrentlyConnectingForUI
                      : false
                  }
                />

                {streamingState.messageId && isCurrentlyConnectingForUI && streamingState.chatId === activeChatId && (
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
        })()}
      </Box>
      <ChatInput
        input={input}
        setInput={handleInputChange}
        handleSend={handleSend}
        replyingTo={replyingToMessage}
        onCancelReply={handleCancelReply}
      />
    </Box>
  );
}

export default Chat;


import { Box, Typography, Stack } from "@mui/material";
import { useRef, useEffect, useState, useCallback, useMemo, memo } from "react";
import { IChatMessage } from "@/../../types/Chat/Message";
import { getUserFromStore } from "@/utils/user";
import ChatBubble from "@/renderer/scenes/Main/Chat/ChatUI/ChatBubble";
import { useIntl } from "react-intl";
import { throttle } from "lodash";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";

interface ChatUIProps {
  messages: IChatMessage[];
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  onReply?: (message: IChatMessage) => void;
  streamingMessageId?: string | null;
  streamContentForBubble?: string;
  isConnectingForBubble?: boolean;
}

const MemoizedChatBubble = memo(ChatBubble);

function useEvent<T extends (...args: any[]) => any>(handler: T): T {
  const handlerRef = useRef<T>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback((...args: Parameters<T>): ReturnType<T> => {
    return handlerRef.current(...args);
  }, []) as T;
}

function ChatUI({ messages, onReply, streamingMessageId, streamContentForBubble, isConnectingForBubble }: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userId = getUserFromStore()?.id;
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const shouldScrollToBottom = useRef(true);
  const prevMessagesLength = useRef(0);
  const hasUserScrolled = useRef(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const initialScrollRestored = useRef(false);
  const lastSavedScrollPosition = useRef(0);
  const { agent } = useAgentStore.getState();

  const { selectedTopics, setScrollPosition, getScrollPosition } = useCurrentTopicContext();
  const chatId = Object.values(selectedTopics)[0];
  const intl = useIntl();

  const scrollMetricsRef = useRef({ scrollHeight: 0, clientHeight: 0 });

  const handleMessageMouseEnter = useCallback((messageId: string) => {
    setHoveredMessageId(messageId);
  }, []);

  const handleMessageMouseLeave = useCallback(() => {
    setHoveredMessageId(null);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "auto",
        block: "end"
      });
    }
  }, []);

  const saveScrollPosition = useEvent((chatId: string, scrollTop: number) => {
    if (Math.abs(scrollTop - lastSavedScrollPosition.current) > 50) {
      setScrollPosition(chatId, scrollTop);
      lastSavedScrollPosition.current = scrollTop;
    }
  });

  const throttledSaveScrollPosition = useMemo(
    () => throttle(saveScrollPosition, 500),
    []
  );

  useEffect(() => {
    if (!chatId || !scrollContainerRef.current) return;

    initialScrollRestored.current = false;
    hasUserScrolled.current = false;

    const savedPosition = getScrollPosition(chatId);
    lastSavedScrollPosition.current = savedPosition;

    if (savedPosition > 0) {
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedPosition;
          initialScrollRestored.current = true;
          hasUserScrolled.current = true;
        }
      });
    } else {
      requestAnimationFrame(scrollToBottom);
    }
  }, [chatId, getScrollPosition, scrollToBottom]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !chatId) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    // Only track scroll if not loading more or streaming
    if (streamingMessageId && isConnectingForBubble) {
      shouldScrollToBottom.current = false;
    }

    if (!hasUserScrolled.current && scrollTop !== 0) {
      hasUserScrolled.current = true;
    }

    const isNearBottom = scrollHeight - scrollTop - clientHeight < (clientHeight * 0.15);
    shouldScrollToBottom.current = isNearBottom;

    // Save scroll position with throttle
    if (hasUserScrolled.current) {
      throttledSaveScrollPosition(chatId, scrollTop);
    }

    // Check if we need to load more messages
    const loadMoreThreshold = clientHeight * 0.1;
    if (
      scrollTop < loadMoreThreshold &&
      hasMoreMessages &&
      !isLoadingMore &&
      hasUserScrolled.current
    ) {
      loadOlderMessages();
    }
  }, [hasMoreMessages, isLoadingMore, chatId, streamingMessageId, isConnectingForBubble, throttledSaveScrollPosition]);

  // Save scroll position on unmount
  useEffect(() => {
    return () => {
      if (chatId && scrollContainerRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        if (Math.abs(scrollTop - lastSavedScrollPosition.current) > 50) {
          setScrollPosition(chatId, scrollTop);
        }
        throttledSaveScrollPosition.cancel();
      }
    };
  }, [chatId, setScrollPosition, throttledSaveScrollPosition]);

  const loadOlderMessages = async () => {
    if (!chatId || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);

    const scrollContainer = scrollContainerRef.current;
    const prevScrollHeight = scrollContainer?.scrollHeight || 0;
    const prevScrollPosition = scrollContainer?.scrollTop || 0;

    try {
      const fetchedMore = await useChatStore.getState().fetchMessages(chatId, true);

      if (!fetchedMore) {
        setHasMoreMessages(false);
      }

      // Use requestAnimationFrame for smoother UI
      requestAnimationFrame(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          const heightDifference = newScrollHeight - prevScrollHeight;
          scrollContainer.scrollTop = prevScrollPosition + heightDifference;
        }
        setIsLoadingMore(false);
      });
    } catch (error) {
      setIsLoadingMore(false);
      setHasMoreMessages(false);
    }
  };

  useEffect(() => {
    if (chatId) {
      setHasMoreMessages(true);
      if (!initialScrollRestored.current) {
        shouldScrollToBottom.current = true;
      }
      prevMessagesLength.current = 0;

      const fetchInitial = async () => {
        await useChatStore.getState().fetchMessages(chatId, false);

        if (!initialScrollRestored.current) {
          requestAnimationFrame(scrollToBottom);
        }
      };
      fetchInitial();
    }
  }, [chatId, scrollToBottom]);

  useEffect(() => {
    if (streamContentForBubble && shouldScrollToBottom.current) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [streamContentForBubble, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0 && prevMessagesLength.current === 0 && shouldScrollToBottom.current && !initialScrollRestored.current) {
      requestAnimationFrame(scrollToBottom);
    }

    if (messages.length > prevMessagesLength.current && !isLoadingMore) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.sender === userId || shouldScrollToBottom.current) {
        requestAnimationFrame(scrollToBottom);
      }
    }

    prevMessagesLength.current = messages.length;
  }, [messages, userId, scrollToBottom, isLoadingMore]);

  const processedMessages = useMemo(() => {
    let messagesToProcess = [...messages];

    if (streamingMessageId) {
      // Check if the streaming message already exists in the store
      const existingStreamingMessage = messagesToProcess.find(m => m.id === streamingMessageId);

      if (!existingStreamingMessage) {
        // Only create placeholder if it doesn't exist in store yet
        let lastUserMessageTime = new Date(0);
        let lastUserMessageIndex = -1;

        for (let i = messagesToProcess.length - 1; i >= 0; i--) {
          if (messagesToProcess[i].sender === userId) {
            lastUserMessageTime = new Date(messagesToProcess[i].created_at);
            lastUserMessageIndex = i;
            break;
          }
        }

        const streamMessageTime = new Date(lastUserMessageTime.getTime() + 100);

        const placeholderMessage: IChatMessage = {
          id: streamingMessageId,
          chat_id: chatId || '',
          sender: agent?.id ?? "assistant",
          sender_object: agent,
          text: "",
          created_at: streamMessageTime.toISOString(),
          sent_at: streamMessageTime.toISOString(),
          status: "pending",
          reactions: [],
        };

        if (lastUserMessageIndex >= 0) {
          messagesToProcess.splice(lastUserMessageIndex + 1, 0, placeholderMessage);
        } else {
          messagesToProcess.push(placeholderMessage);
        }
      }
    }

    // Always sort by creation time to ensure proper chronological order
    messagesToProcess.sort((a, b) => {
      // Handle null/undefined created_at by falling back to sent_at or updated_at
      const getValidTimestamp = (msg: IChatMessage): number => {
        if (msg.created_at) {
          const createdTime = new Date(msg.created_at).getTime();
          if (!isNaN(createdTime)) return createdTime;
        }

        if (msg.sent_at) {
          const sentTime = new Date(msg.sent_at).getTime();
          if (!isNaN(sentTime)) return sentTime;
        }

        if (msg.updated_at) {
          const updatedTime = new Date(msg.updated_at).getTime();
          if (!isNaN(updatedTime)) return updatedTime;
        }

        // Fallback to current time if no valid timestamp found
        return Date.now();
      };

      return getValidTimestamp(a) - getValidTimestamp(b);
    });

    // Helper function to check if a message should be a continuation based on time
    const shouldBeContinuation = (currentMessage: IChatMessage, currentIndex: number): boolean => {
      if (currentIndex === 0) return false;

      // Use the same timestamp logic as sorting
      const getValidTimestamp = (msg: IChatMessage): number => {
        if (msg.created_at) {
          const createdTime = new Date(msg.created_at).getTime();
          if (!isNaN(createdTime)) return createdTime;
        }

        if (msg.sent_at) {
          const sentTime = new Date(msg.sent_at).getTime();
          if (!isNaN(sentTime)) return sentTime;
        }

        if (msg.updated_at) {
          const updatedTime = new Date(msg.updated_at).getTime();
          if (!isNaN(updatedTime)) return updatedTime;
        }

        return Date.now();
      };

      const currentTime = getValidTimestamp(currentMessage);
      const currentSender = currentMessage.sender;

      // Find the most recent message from the same sender before this one (by time)
      let lastSameSenderMessage: IChatMessage | null = null;
      let lastSameSenderTime = 0;

      for (let i = 0; i < currentIndex; i++) {
        const msg = messagesToProcess[i];
        const msgTime = getValidTimestamp(msg);

        if (msg.sender === currentSender && msgTime < currentTime && msgTime > lastSameSenderTime) {
          lastSameSenderMessage = msg;
          lastSameSenderTime = msgTime;
        }
      }

      // If no previous message from same sender, not a continuation
      if (!lastSameSenderMessage) return false;

      // Check if there are any messages from other senders between the last same-sender message and current message (by time)
      const hasInterruption = messagesToProcess.some(msg => {
        const msgTime = getValidTimestamp(msg);
        return msg.sender !== currentSender &&
          msgTime > lastSameSenderTime &&
          msgTime < currentTime;
      });

      // If there's an interruption by another user, this is not a continuation
      if (hasInterruption) return false;

      // Check if the immediately previous message (by index) is from the same sender
      // This ensures visual continuity in the sorted list
      const previousMessage = messagesToProcess[currentIndex - 1];
      return previousMessage?.sender === currentSender;
    };

    return messagesToProcess.map((msg, index) => {
      const isCurrentUser = msg.sender === userId;
      const nextMessage = index < messagesToProcess.length - 1 ? messagesToProcess[index + 1] : undefined;
      const isLastInSequence = nextMessage?.sender !== msg.sender;

      const replyToMessage = msg.reply_to
        ? messagesToProcess.find(m => m.id === msg.reply_to) || null
        : null;

      // A message is a continuation if:
      // 1. It's not a reply to another message
      // 2. The sender has consecutive messages without time-based interruption from other users
      // 3. The immediately previous message (in sorted order) is from the same sender
      const isContinuation = !replyToMessage && shouldBeContinuation(msg, index);

      return {
        msg,
        isCurrentUser,
        isContinuation,
        isLastInSequence,
        replyToMessage,
        messageKey: msg.id || `message-${index}-${Date.now()}`
      };
    });
  }, [messages, userId, streamingMessageId, chatId, agent]);

  useEffect(() => {
    // Update metrics on resize
    const updateMetrics = () => {
      if (scrollContainerRef.current) {
        scrollMetricsRef.current = {
          scrollHeight: scrollContainerRef.current.scrollHeight,
          clientHeight: scrollContainerRef.current.clientHeight
        };
      }
    };

    const resizeObserver = new ResizeObserver(updateMetrics);
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        height: "100%",
        maxHeight: "100%",
        pt: 2,
        pb: 0.8
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          window.getSelection()?.empty();
        }
      }}
      onScroll={handleScroll}
    >
      {!chatId ? (
        <Stack
          direction="column"
          alignItems="center"
          justifyContent="center"
          sx={{ height: '100%', width: '100%' }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 500, color: "text.secondary" }}>
            # No chat selected
          </Typography>
        </Stack>
      ) : (
        <>
          {!isLoadingMore && !hasMoreMessages && messages.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                textAlign: "center",
                py: 1,
              }}
            >
              No more messages
            </Typography>
          )}

          {messages.length > 0 && (
            <Box sx={{ flexGrow: 1 }} />
          )}

          {processedMessages.map(({ msg, isCurrentUser, isContinuation, isLastInSequence, replyToMessage, messageKey }) => {
            const isThisMessageStreaming = streamingMessageId === msg.id;

            // Use the message as-is since it's already from the store or properly created placeholder
            let messageToUse = msg;

            return (
              <MemoizedChatBubble
                key={messageKey}
                message={messageToUse}
                isCurrentUser={isCurrentUser}
                isContinuation={isContinuation}
                isLastInSequence={isLastInSequence}
                onReply={onReply}
                replyToMessage={replyToMessage}
                isStreaming={isThisMessageStreaming}
                isConnecting={isThisMessageStreaming ? isConnectingForBubble : false}
                streamContent={isThisMessageStreaming ? (streamContentForBubble || "") : ""}
                isHovered={hoveredMessageId === messageToUse.id}
                onMouseEnter={() => handleMessageMouseEnter(messageToUse.id)}
                onMouseLeave={handleMessageMouseLeave}
              />
            );
          })}

          <div ref={messagesEndRef} style={{ height: "1px", margin: 0, padding: 0 }} />
        </>
      )}
    </Box>
  );
}

export default memo(ChatUI);

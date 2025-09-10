import { Box, Typography, Stack, Divider } from "@mui/material";
import { useRef, useEffect, useState, useCallback, useMemo, memo } from "react";
import { IChatMessage } from "@/../../types/Chat/Message";
import { getUserFromStore } from "@/utils/user";
import ChatBubble from "@/renderer/components/Chat/ChatBubble";
import NoMessage from "@/renderer/scenes/Main/Chat/ChatUI/NoMessage";
import { useIntl } from "react-intl";
import { throttle } from "lodash";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { useAgentStore } from "@/renderer/stores/Agent/AgentStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import { clearNotificationsForContext } from "@/utils/notifications";

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

  const { selectedTopics, setScrollPosition, getScrollPosition, selectedContext } = useCurrentTopicContext();
  const chatId = Object.values(selectedTopics)[0];
  const intl = useIntl();

  // Get unread notifications for this chat
  const allNotifications = useNotificationStore(state => state.notifications);
  
  const scrollMetricsRef = useRef({ scrollHeight: 0, clientHeight: 0 });

  // Track when chat becomes visible/active to mark as read
  const isVisible = useRef(false);
  const readTimeout = useRef<NodeJS.Timeout | null>(null);

  // Find unread messages - messages that have corresponding notifications
  const unreadMessageIds = useMemo(() => {
    if (!chatId || !selectedContext) return new Set<string>();
    
    const workspaceId = selectedContext.id;
    const unreadNotifications = allNotifications.filter(notification => {
      if (workspaceId) {
        // Workspace chat
        return notification.workspaceId === workspaceId &&
               notification.workspaceSection === 'chatroom' &&
               notification.workspaceContext === chatId &&
               !notification.read;
      } else {
        // Home/agent chat
        return notification.homeSection === 'agents' &&
               notification.homeContext === chatId &&
               !notification.read;
      }
    });

    // For simplicity, we'll consider the most recent messages as unread
    // In a more sophisticated implementation, you'd track read status per message
    const unreadCount = unreadNotifications.length;
    if (unreadCount === 0) return new Set<string>();
    
    // Mark the most recent N messages as unread (where N is notification count)
    const recentMessages = [...messages]
      .filter(msg => msg.sender !== userId) // Only messages from others
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, unreadCount);
    
    return new Set(recentMessages.map(msg => msg.id));
  }, [allNotifications, chatId, selectedContext, messages, userId]);

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

  // Function to mark chat as read and clear notifications
  const markChatAsRead = useCallback(() => {
    if (!chatId) return;

    const workspaceId = selectedContext?.id;
    
    // Clear notifications for this specific chat
    if (workspaceId) {
      // Workspace chat
      clearNotificationsForContext(workspaceId, 'chatroom', chatId);
    } else {
      // Home/agent chat
      clearNotificationsForContext(undefined, 'agents', chatId);
    }

    console.log(`🔔 Cleared notifications for chat: ${chatId} in ${workspaceId ? `workspace ${workspaceId}` : 'home'}`);
  }, [chatId, selectedContext?.id]);

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

  // Mark as read when chat becomes active
  useEffect(() => {
    if (chatId) {
      isVisible.current = true;
      
      // Clear any existing timeout
      if (readTimeout.current) {
        clearTimeout(readTimeout.current);
      }
      
      // Mark as read after a short delay to ensure the chat is truly active
      readTimeout.current = setTimeout(() => {
        if (isVisible.current && chatId) {
          markChatAsRead();
        }
      }, 500);
    }

    return () => {
      if (readTimeout.current) {
        clearTimeout(readTimeout.current);
      }
      isVisible.current = false;
    };
  }, [chatId, markChatAsRead]);

  // Mark as read when user scrolls (indicating they're actively reading)
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !chatId) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    // Only track scroll if not loading more or streaming
    if (streamingMessageId && isConnectingForBubble) {
      shouldScrollToBottom.current = false;
    }

    if (!hasUserScrolled.current && scrollTop !== 0) {
      hasUserScrolled.current = true;
      // Mark as read when user first scrolls (shows engagement)
      markChatAsRead();
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
  }, [hasMoreMessages, isLoadingMore, chatId, streamingMessageId, isConnectingForBubble, throttledSaveScrollPosition, markChatAsRead]);

  // Mark as read when new messages arrive and user is viewing the chat
  useEffect(() => {
    if (messages.length > prevMessagesLength.current && chatId && isVisible.current) {
      // If new messages arrived and user is actively viewing, mark as read
      const delay = hasUserScrolled.current ? 1000 : 2000; // Shorter delay if user has interacted
      
      if (readTimeout.current) {
        clearTimeout(readTimeout.current);
      }
      
      readTimeout.current = setTimeout(() => {
        if (isVisible.current && chatId) {
          markChatAsRead();
        }
      }, delay);
    }
    
    prevMessagesLength.current = messages.length;
  }, [messages.length, chatId, markChatAsRead]);

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

    // Find the index where to insert the unread separator
    let unreadSeparatorIndex = -1;
    if (unreadMessageIds.size > 0) {
      // Find the first unread message index
      for (let i = 0; i < messagesToProcess.length; i++) {
        if (unreadMessageIds.has(messagesToProcess[i].id)) {
          unreadSeparatorIndex = i;
          break;
        }
      }
    }

    return messagesToProcess.map((msg, index) => {
      const isCurrentUser = msg.sender === userId;
      const nextMessage = index < messagesToProcess.length - 1 ? messagesToProcess[index + 1] : undefined;
      const isLastInSequence = nextMessage?.sender !== msg.sender;
      const isUnread = unreadMessageIds.has(msg.id);

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
        messageKey: msg.id || `message-${index}-${Date.now()}`,
        isUnread,
        showUnreadSeparator: index === unreadSeparatorIndex && unreadSeparatorIndex > 0
      };
    });
  }, [messages, userId, streamingMessageId, chatId, agent, unreadMessageIds]);

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
        <NoMessage type="no-chat" />
      ) : messages.length === 0 && !isLoadingMore ? (
        <NoMessage type="no-messages" />
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
              {intl.formatMessage({ 
                id: 'chat.noMoreMessages', 
                defaultMessage: 'No more messages' 
              })}
            </Typography>
          )}

          {messages.length > 0 && (
            <Box sx={{ flexGrow: 1 }} />
          )}

          {processedMessages.map(({ msg, isCurrentUser, isContinuation, isLastInSequence, replyToMessage, messageKey, isUnread, showUnreadSeparator }) => {
            const isThisMessageStreaming = streamingMessageId === msg.id;

            // Use the message as-is since it's already from the store or properly created placeholder
            let messageToUse = msg;

            return (
              <Box key={messageKey}>
                {/* Unread Messages Separator */}
                {showUnreadSeparator && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    my: 2,
                    mx: 2
                  }}>
                    <Divider sx={{ flex: 1 }} />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        mx: 2, 
                        px: 2,
                        py: 0.5,
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        borderRadius: 2,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {intl.formatMessage({ 
                        id: 'chat.unreadMessages', 
                        defaultMessage: 'Unread Messages' 
                      })}
                    </Typography>
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}

                <MemoizedChatBubble
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
              </Box>
            );
          })}

          <div ref={messagesEndRef} style={{ height: "1px", margin: 0, padding: 0 }} />
        </>
      )}
    </Box>
  );
}

export default memo(ChatUI);

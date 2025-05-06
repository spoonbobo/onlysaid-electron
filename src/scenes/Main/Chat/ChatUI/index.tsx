import { Box, Typography } from "@mui/material";
import { useRef, useEffect, useState, useCallback } from "react";
import { IChatMessage } from "@/models/Chat/Message";
import { getUserFromStore } from "@/utils/user";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useStreamStore } from "@/stores/SSE/StreamStore";
import ChatBubble from "./ChatBubble";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";

interface ChatUIProps {
  messages: IChatMessage[];
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
  onReply?: (message: IChatMessage) => void;
  streamingMessageId?: string | null;
}

function ChatUI({ messages, onReply, streamingMessageId }: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userId = getUserFromStore()?.id;
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const shouldScrollToBottom = useRef(true);
  const prevMessagesLength = useRef(0);
  const hasUserScrolled = useRef(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const { getCurrentContextTopics } = useTopicStore();
  const roomId = Object.values(getCurrentContextTopics())[0];

  const [streamContent, setStreamContent] = useState("");
  const { messages: streamMessages, isConnecting, abortStream } = useStreamStore();
  const streamPrefix = streamingMessageId ? `stream-${streamingMessageId}` : null;

  const { streamingState, setStreamingState } = useCurrentTopicContext();

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

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const loadMoreThreshold = clientHeight * 0.1;

    if (!hasUserScrolled.current && scrollTop !== 0) {
      hasUserScrolled.current = true;
    }

    const isNearBottom = scrollHeight - scrollTop - clientHeight < (clientHeight * 0.15);
    shouldScrollToBottom.current = isNearBottom;

    if (
      scrollTop < loadMoreThreshold &&
      hasMoreMessages &&
      !isLoadingMore &&
      hasUserScrolled.current &&
      roomId
    ) {
      loadOlderMessages();
    }
  }, [hasMoreMessages, isLoadingMore, roomId]);

  const loadOlderMessages = async () => {
    if (!roomId || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);

    const scrollContainer = scrollContainerRef.current;
    const prevScrollHeight = scrollContainer?.scrollHeight || 0;
    const prevScrollPosition = scrollContainer?.scrollTop || 0;

    try {
      const fetchedMore = await useChatStore.getState().fetchMessages(roomId, true);

      if (!fetchedMore) {
        setHasMoreMessages(false);
      }

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
    if (roomId) {
      setHasMoreMessages(true);
      hasUserScrolled.current = false;
      shouldScrollToBottom.current = true;
      prevMessagesLength.current = 0;

      const fetchInitial = async () => {
        await useChatStore.getState().fetchMessages(roomId, false);
        setTimeout(scrollToBottom, 0);
      };
      fetchInitial();
    }
  }, [roomId, scrollToBottom]);

  useEffect(() => {
    if (streamingMessageId && streamPrefix) {
      const messages = streamMessages[streamPrefix] || [];
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        setStreamContent(latestMessage.full || latestMessage.content);
      }
    } else {
      setStreamContent("");
    }
  }, [streamingMessageId, streamPrefix, streamMessages]);

  useEffect(() => {
    if (streamContent && shouldScrollToBottom.current) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [streamContent, scrollToBottom]);

  useEffect(() => {
    const hasReactions = messages.some(msg => msg.reactions && msg.reactions.length > 0);

    if (shouldScrollToBottom.current && hasReactions) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const scrollAfterRender = () => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    };

    if (messages.length > 0 && prevMessagesLength.current === 0) {
      scrollAfterRender();
    }

    if (messages.length > prevMessagesLength.current && !isLoadingMore) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.sender === userId || shouldScrollToBottom.current) {
        scrollAfterRender();
      }
    }

    prevMessagesLength.current = messages.length;
  }, [messages, userId, scrollToBottom, isLoadingMore]);

  const handleStopGeneration = useCallback(() => {
    if (streamingMessageId) {
      const fullStreamId = `stream-${streamingMessageId}`;
      abortStream(fullStreamId);

      setStreamingState(null, null);

      console.log("Stopping generation for streamId:", fullStreamId);
    }
  }, [streamingMessageId, abortStream, setStreamingState]);

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
        px: 1,
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

      {messages.map((msg, index) => {
        const isCurrentUser = msg.sender === userId;
        const previousMessage = index > 0 ? messages[index - 1] : undefined;
        const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
        const isLastInSequence = nextMessage?.sender !== msg.sender;

        const replyToMessage = msg.reply_to
          ? messages.find(m => m.id === msg.reply_to) || null
          : null;

        const isContinuation = !replyToMessage &&
          previousMessage?.sender === msg.sender;

        const messageKey = msg.id || `message-${index}-${Date.now()}`;

        const isStreaming = streamingMessageId === msg.id;
        const isCurrentlyConnecting = isStreaming && isConnecting[`stream-${streamingMessageId}`];

        const isHovered = hoveredMessageId === msg.id;

        return (
          <ChatBubble
            key={messageKey}
            message={msg}
            isCurrentUser={isCurrentUser}
            isContinuation={isContinuation}
            isLastInSequence={isLastInSequence}
            onReply={onReply}
            replyToMessage={replyToMessage}
            isStreaming={isStreaming}
            isConnecting={isCurrentlyConnecting}
            streamContent={isStreaming ? streamContent : ""}
            isHovered={isHovered}
            onMouseEnter={() => handleMessageMouseEnter(msg.id)}
            onMouseLeave={handleMessageMouseLeave}
          />
        );
      })}

      <div ref={messagesEndRef} style={{ height: "1px", margin: 0, padding: 0 }} />

      {streamingMessageId && isConnecting[`stream-${streamingMessageId}`] && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 100,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            bgcolor: 'background.paper',
            boxShadow: 2,
            padding: '5px 10px',
            borderRadius: 1
          }}
        >
          <Typography
            onClick={handleStopGeneration}
            color="error"
            sx={{
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              }
            }}
          >
            Stop generation
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default ChatUI;
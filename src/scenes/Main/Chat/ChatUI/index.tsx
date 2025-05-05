import { Box, Typography, CircularProgress } from "@mui/material";
import Avatar from '@mui/material/Avatar';
import { useRef, useEffect, useState, useCallback } from "react";
import { IChatMessage } from "@/models/Chat/Message";
import { getUserFromStore } from "@/utils/user";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import * as R from "ramda";
import ChatBubble from "./ChatBubble";

interface ChatUIProps {
  messages: IChatMessage[];
}

function ChatUI({ messages }: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userId = getUserFromStore()?.id;
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const shouldScrollToBottom = useRef(true);
  const prevMessagesLength = useRef(0);
  const hasUserScrolled = useRef(false);

  // Get current room id
  const { getCurrentContextTopics } = useTopicStore();
  const roomId = Object.values(getCurrentContextTopics())[0];

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const loadMoreThreshold = clientHeight * 0.1;

    // Mark that user has scrolled
    if (!hasUserScrolled.current && scrollTop !== 0) {
      hasUserScrolled.current = true;
    }

    // Check if user is near bottom for auto-scroll
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldScrollToBottom.current = isNearBottom;

    // Load more when scrolling to top (if user has scrolled)
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
      // Call fetchMessages with loadMore flag
      const fetchedMore = await useChatStore.getState().fetchMessages(roomId, true);

      // Update hasMoreMessages based on the result
      if (!fetchedMore) {
        setHasMoreMessages(false);
      }

      // Use setTimeout to allow the DOM to update before adjusting scroll
      setTimeout(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          const heightDifference = newScrollHeight - prevScrollHeight;
          scrollContainer.scrollTop = prevScrollPosition + heightDifference;
        }
        setIsLoadingMore(false);
      }, 0);
    } catch (error) {
      console.error("Error loading older messages:", error);
      setIsLoadingMore(false);
      setHasMoreMessages(false);
    }
  };

  // Initial Fetch Effect
  useEffect(() => {
    // Reset and fetch initial messages when roomId changes
    if (roomId) {
      setHasMoreMessages(true);
      // Reset scroll flags for new room
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

  // Scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      const isNewerMessage = !isLoadingMore;

      if (isNewerMessage && ((lastMessage && lastMessage.sender === userId) || shouldScrollToBottom.current)) {
        scrollToBottom();
      }
    }

    // Always update prev length *after* the comparison
    prevMessagesLength.current = messages.length;
  }, [messages, userId, scrollToBottom, isLoadingMore]);

  // Add this useEffect for debugging the ref
  useEffect(() => {
    if (scrollContainerRef.current) {
      console.log("ChatUI Effect: scrollContainerRef is attached to an element.");
    } else {
      console.log("ChatUI Effect: scrollContainerRef.current is NULL.");
    }
    // Optional: Add a simple scroll listener directly for testing
    const testScroll = () => console.log("Direct scroll listener fired!");
    const element = scrollContainerRef.current;
    element?.addEventListener('scroll', testScroll);

    return () => {
      element?.removeEventListener('scroll', testScroll); // Cleanup
    };
  }, []); // Run only once on mount

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        flex: 1,
        overflowY: "auto",
        px: 3,
        py: 2,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "100%"
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

      {messages.map((msg, index) => {
        const isCurrentUser = msg.sender === userId;
        const previousMessage = index > 0 ? messages[index - 1] : undefined;
        return (
          <ChatBubble
            key={msg.id}
            message={msg}
            isCurrentUser={isCurrentUser}
            isContinuation={previousMessage?.sender === msg.sender}
          />
        );
      })}
      <div ref={messagesEndRef} style={{ height: "1px" }} />
    </Box>
  );
}

export default ChatUI;

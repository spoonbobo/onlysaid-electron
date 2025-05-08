import { Box, Typography } from "@mui/material";
import { useRef, useEffect, useState, useCallback, useMemo, memo } from "react";
import { IChatMessage } from "@/types/Chat/Message";
import { getUserFromStore } from "@/utils/user";
import { useChatStore } from "@/stores/Chat/chatStore";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import ChatBubble from "./ChatBubble";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import * as R from 'ramda';

interface ChatUIProps {
    messages: IChatMessage[];
    scrollContainerRef?: React.RefObject<HTMLDivElement>;
    messagesEndRef?: React.RefObject<HTMLDivElement>;
    onReply?: (message: IChatMessage) => void;
    streamingMessageId?: string | null;
    streamContentForBubble?: string;
    isConnectingForBubble?: boolean;
}

// Memoize the individual message to prevent re-renders
const MemoizedChatBubble = memo(ChatBubble);

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

    const { selectedTopics } = useCurrentTopicContext();
    const roomId = Object.values(selectedTopics)[0];

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
        if (streamingMessageId && isConnectingForBubble) {
            shouldScrollToBottom.current = false;
        }

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
    }, [hasMoreMessages, isLoadingMore, roomId, streamingMessageId, isConnectingForBubble]);

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
                setTimeout(scrollToBottom, 50);
            };
            fetchInitial();
        }
    }, [roomId, scrollToBottom]);

    useEffect(() => {
        if (streamContentForBubble && shouldScrollToBottom.current) {
            requestAnimationFrame(() => {
                scrollToBottom();
            });
        }
    }, [streamContentForBubble, scrollToBottom]);

    useEffect(() => {
        const scrollAfterRender = () => {
            requestAnimationFrame(() => {
                scrollToBottom();
            });
        };

        if (messages.length > 0 && prevMessagesLength.current === 0 && shouldScrollToBottom.current) {
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

    const processedMessages = useMemo(() => {
        return messages.map((msg, index) => {
            const isCurrentUser = msg.sender === userId;
            const previousMessage = index > 0 ? messages[index - 1] : undefined;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
            const isLastInSequence = nextMessage?.sender !== msg.sender;

            const replyToMessage = msg.reply_to
                ? messages.find(m => m.id === msg.reply_to) || null
                : null;

            const isContinuation = !replyToMessage &&
                previousMessage?.sender === msg.sender;

            return {
                msg,
                isCurrentUser,
                isContinuation,
                isLastInSequence,
                replyToMessage,
                messageKey: msg.id || `message-${index}-${Date.now()}`
            };
        });
    }, [messages, userId]);

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

            {processedMessages.map(({ msg, isCurrentUser, isContinuation, isLastInSequence, replyToMessage, messageKey }) => {
                const isThisMessageStreaming = streamingMessageId === msg.id;

                return (
                    <MemoizedChatBubble
                        key={messageKey}
                        message={msg}
                        isCurrentUser={isCurrentUser}
                        isContinuation={isContinuation}
                        isLastInSequence={isLastInSequence}
                        onReply={onReply}
                        replyToMessage={replyToMessage}
                        isStreaming={isThisMessageStreaming}
                        isConnecting={isThisMessageStreaming ? isConnectingForBubble : false}
                        streamContent={isThisMessageStreaming ? (streamContentForBubble || "") : ""}
                        isHovered={hoveredMessageId === msg.id}
                        onMouseEnter={() => handleMessageMouseEnter(msg.id)}
                        onMouseLeave={handleMessageMouseLeave}
                    />
                );
            })}

            <div ref={messagesEndRef} style={{ height: "1px", margin: 0, padding: 0 }} />
        </Box>
    );
}

export default memo(ChatUI);

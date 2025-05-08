import { Box } from "@mui/material";
import { useEffect, useRef, useCallback, useState } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage } from "@/types/Chat/Message";
import { useChatStore } from "@/stores/Chat/chatStore";
import { getUserFromStore } from "@/utils/user";
import { IUser } from "@/types/User/User";
import { IFile } from "@/types/File/File";
import { useSelectedModelStore } from "@/stores/LLM/SelectedModelStore";
import { useStreamStore, OpenAIMessage } from "@/stores/SSE/StreamStore";
import { DeepSeekUser } from "@/stores/Chat/chatStore";
import { v4 as uuidv4 } from 'uuid';
import { Typography } from "@mui/material";

type SectionName = 'Friends' | 'Agents';

function Chat() {
    const {
        selectedContext,
        selectedTopics,
        replyingToId,
        setReplyingTo,
        streamingState,
        setStreamingState,
        clearSelectedTopic
    } = useCurrentTopicContext();

    // Create a unique chat instance ID
    const chatInstanceId = useState(() => uuidv4())[0];

    const {
        activeRoomByContext,
        messages: storeMessages,
        sendMessage,
        setActiveChat,
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

    // Use context ID instead of tab ID
    const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
    const activeRoomId = activeRoomByContext[contextId] || null;
    const input = getInput(activeRoomId || '', contextId);

    // Get the first section with a selected topic directly
    const activeSection = Object.keys(selectedTopics).find(
        section => selectedTopics[section]
    ) as SectionName | undefined;
    const activeTopic = activeSection ? selectedTopics[activeSection] : null;

    const messages = storeMessages[activeRoomId || ''] || [];
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

    useEffect(() => {
        // Safely handle invalid references
        if (activeRoomId && contextId) {
            const { rooms } = useChatStore.getState();
            const roomExists = rooms.some(room => room.id === activeRoomId);

            if (!roomExists) {
                // If room doesn't exist, clear the selection
                useChatStore.getState().setActiveChat('', contextId);
            }
        }
    }, [activeRoomId, contextId]);

    useEffect(() => {
        // Get the first section with a selected topic
        const firstSection = Object.keys(selectedTopics).find(section => selectedTopics[section]);

        // If we have a selected topic and it's different from the current activeRoomId
        if (firstSection && selectedTopics[firstSection] &&
            selectedTopics[firstSection] !== activeRoomId) {

            const topicId = selectedTopics[firstSection];
            const { rooms } = useChatStore.getState();

            // Only set active chat if room exists
            if (rooms.some(room => room.id === topicId)) {
                setActiveChat(topicId, contextId);
            } else {
                console.warn(`Cannot set active chat to non-existent room: ${topicId}`);

                // Use the setter function provided by the hook
                clearSelectedTopic(firstSection);
            }
        }
    }, [selectedTopics, activeRoomId, contextId, setActiveChat, clearSelectedTopic]);

    // Fetch messages when active room changes
    useEffect(() => {
        if (activeRoomId && useChatStore.getState().rooms.some(room => room.id === activeRoomId)) {
            fetchMessages(activeRoomId);
        }
    }, [activeRoomId, fetchMessages]);

    // Only clear reply state when explicitly needed (not when switching context)
    const previousActiveRoomIdRef = useRef<string | null>(null);
    const previousContextIdRef = useRef<string | null>(null);
    useEffect(() => {
        // Only clear reply state when changing rooms within the same context
        if (activeRoomId && previousActiveRoomIdRef.current &&
            activeRoomId !== previousActiveRoomIdRef.current &&
            contextId === previousContextIdRef.current) {
            setReplyingTo(null);
        }

        previousActiveRoomIdRef.current = activeRoomId;
        previousContextIdRef.current = contextId;
    }, [activeRoomId, contextId, setReplyingTo]);

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

            // Only update state if content has actually changed
            if (newContent !== currentStreamContent) {
                // Calculate new tokens since last update
                const currentLength = newContent.length;
                const newTokens = Math.max(0, currentLength - prevContentLength);

                if (newTokens > 0 && lastUpdateTimeRef.current) {
                    const timeDelta = (now - lastUpdateTimeRef.current) / 1000; // in seconds

                    if (timeDelta > 0) {
                        // Calculate instantaneous token rate
                        const instantRate = Math.round(newTokens / timeDelta);

                        // Add to history (keep last 5 measurements for smoothing)
                        tokenRateHistoryRef.current.push(instantRate);
                        if (tokenRateHistoryRef.current.length > 5) {
                            tokenRateHistoryRef.current.shift();
                        }

                        // Calculate moving average for smoother display
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
            // Reset states
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
            && activeRoomId
        ) {
            try {
                messageData.created_at = new Date().toISOString();

                // Add reply_to if replying to a message
                if (replyingToId) {
                    messageData.reply_to = replyingToId;
                }

                const fileIds = messageData.files?.map(file => file.id);
                messageData.files = fileIds as unknown as IFile[];
                console.log(messageData.files);

                const messageId = await sendMessage(activeRoomId, messageData);

                if (messageId) {
                    // Create the full message object
                    const currentUser = getUserFromStore();
                    const newMessage: IChatMessage = {
                        id: messageId as string,
                        room_id: activeRoomId,
                        sender: currentUser?.id || "",
                        text: messageData.text || "",
                        created_at: messageData.created_at,
                        sender_object: currentUser as IUser,
                        reply_to: replyingToId || undefined,
                        files: messageData.files
                    };

                    // Add directly to the state instead of refetching
                    console.log("newMessage", newMessage);
                    appendMessage(activeRoomId, newMessage);

                    // Clear input and reply state
                    setInput(activeRoomId, '', contextId);
                    setReplyingTo(null);

                    // Add AI response with streaming if model is selected
                    if (modelId && provider && messageData.text) {
                        // Create assistant message
                        const assistantMessage: IChatMessage = {
                            id: uuidv4(),
                            room_id: activeRoomId,
                            sender: DeepSeekUser?.id || "",
                            sender_object: DeepSeekUser,
                            text: "",
                            created_at: new Date().toISOString(),
                        };

                        appendMessage(activeRoomId, assistantMessage);

                        // Set streaming ID - use the actual message ID
                        setStreamingState(assistantMessage.id, activeRoomId);

                        // Reset stream-specific UI state for the new stream
                        setCurrentStreamContent("");
                        streamStartTimeRef.current = null;
                        tokenCountRef.current = 0;
                        setTokenRate(0);

                        console.log("streaming", modelId, provider, assistantMessage.id);
                        try {
                            // Get last 10 messages from the chat history
                            const lastMessages = messages.slice(-10).map(msg => ({
                                role: msg.sender === currentUser?.id ? "user" : "assistant",
                                content: msg.text || ""
                            }));

                            // Add the current message
                            lastMessages.push({ role: "user", content: messageData.text || "" });

                            // Start streaming with conversation history
                            const response = await streamChatCompletion(
                                lastMessages as OpenAIMessage[],
                                {
                                    model: modelId,
                                    streamId: `stream-${assistantMessage.id}`,
                                    provider: provider
                                }
                            );

                            // Update message with full response
                            updateMessage(activeRoomId, assistantMessage.id, { text: response });
                        } catch (error) {
                            console.error("Stream error:", error);
                            updateMessage(activeRoomId, assistantMessage.id, {
                                text: "Error generating response. Please try again."
                            });
                        } finally {
                            // Crucial: Signal that streaming has stopped for this messageId
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
        setInput(activeRoomId || '', newInput, contextId);
    };

    // Add these refs to the parent component
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Add a scroll handler to the parent
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        }
    }, []);

    // Add effect to scroll to bottom on new messages
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


    return (
        <Box
            key={chatInstanceId}
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
            }}
        >
            <ChatHeader
                selectedContext={selectedContext}
                selectedGroup={activeSection}
                selectedTopic={activeTopic || (selectedTopics[activeSection || ''] || null)}
            />
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
                                    messages={messages}
                                    onReply={handleReply}
                                    streamingMessageId={streamingState.messageId}
                                    streamContentForBubble={currentStreamContent}
                                    isConnectingForBubble={isCurrentlyConnectingForUI}
                                />

                                {streamingState.messageId && isCurrentlyConnectingForUI && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 16,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            zIndex: 1000,
                                            bgcolor: 'background.paper',
                                            boxShadow: 3,
                                            padding: '4px 10px',
                                            borderRadius: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
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

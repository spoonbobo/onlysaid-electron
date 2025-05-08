import { Box } from "@mui/material";
import { useEffect, useRef, useCallback, useState } from "react";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import ChatHeader from "./ChatHeader";
import ChatUI from "./ChatUI";
import ChatInput from "./ChatInput";
import { IChatMessage } from "@/models/Chat/Message";
import { useChatStore } from "@/stores/Chat/chatStore";
import { getUserFromStore } from "@/utils/user";
import { IUser } from "@/models/User/User";
import { IFile } from "@/models/File/File";
import { useSelectedModelStore } from "@/stores/LLM/SelectedModelStore";
import { useStreamStore, OpenAIMessage } from "@/stores/SSE/StreamStore";
import { DeepSeekUser } from "@/stores/Chat/chatStore";
import { v4 as uuidv4 } from 'uuid';

type SectionName = 'Friends' | 'Agents';

function Chat() {
    const {
        selectedContext,
        selectedTopics,
        replyingToId,
        setReplyingTo,
        streamingState,
        setStreamingState
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
    const { streamChatCompletion } = useStreamStore();

    // Use context ID instead of tab ID
    const contextId = selectedContext ? `${selectedContext.name}:${selectedContext.type}` : '';
    const activeRoomId = activeRoomByContext[contextId] || null;
    const input = getInput(activeRoomId || '', contextId);

    const activeSection = Object.keys(selectedTopics).find(
        section => selectedTopics[section] === activeRoomId
    ) as SectionName | undefined;

    const activeTopic = activeSection ? selectedTopics[activeSection] : null;

    const messages = storeMessages[activeRoomId || ''] || [];
    const replyingToMessage = replyingToId ? messages.find(m => m.id === replyingToId) || null : null;

    // Replace local streaming state with the persisted one
    const streamingMessageId = streamingState.messageId;

    useEffect(() => {
        if (activeTopic && activeTopic !== activeRoomId) {
            setActiveChat(activeTopic, contextId);
        }
    }, [activeTopic, activeRoomId, setActiveChat, contextId]);

    // Fetch messages when active room changes
    useEffect(() => {
        if (activeRoomId) {
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

    return (
        <Box
            key={chatInstanceId}
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
            }}
        >
            <ChatHeader
                selectedContext={selectedContext}
                selectedGroup={activeSection}
                selectedTopic={activeTopic}
            />
            <Box
                sx={{
                    flex: "1 1 auto",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    minHeight: 0
                }}
            >
                <ChatUI
                    messages={messages}
                    onReply={handleReply}
                    streamingMessageId={streamingMessageId}
                />
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
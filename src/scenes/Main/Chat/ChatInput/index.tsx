import { useState, useCallback, useEffect } from "react";
import { Box, Typography, alpha, IconButton } from "@mui/material";
import MessageTextField from "./TextField/MessageTextField";
import ActionButtons from "./ActionButtons/ActionButtons";
import AttachmentPreview from "./Attachments";
import { IChatMessage } from "@/../../types/Chat/Message";
import CloseIcon from '@mui/icons-material/Close';
import { IFile } from "@/../../types/File/File";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { useSelectedModelStore } from "@/stores/LLM/SelectedModelStore";

interface ChatInputProps {
    input: string;
    setInput: (input: string) => void;
    handleSend: (message: Partial<IChatMessage>) => void;
    disabled?: boolean;
    replyingTo?: IChatMessage | null;
    onCancelReply?: () => void;
}

function ChatInput({
    input,
    setInput,
    handleSend,
    disabled = false,
    replyingTo = null,
    onCancelReply
}: ChatInputProps) {
    const [isSending, setIsSending] = useState(false);
    const { attachments, setAttachment, clearAttachments } = useCurrentTopicContext();
    const { modelName, provider, modelId } = useSelectedModelStore();
    const [isDragOver, setIsDragOver] = useState(false);
    // console.log(modelName, provider, modelId);

    const handleAttachment = (type: string, value: string | File) => {
        if (value instanceof File) {
            setAttachment(type, value);
        }
    };

    const removeAttachment = (type: string) => {
        const newAttachments = { ...attachments };
        delete newAttachments[type];

        if (Object.keys(newAttachments).length === 0) {
            clearAttachments();
        } else {
            Object.entries(newAttachments).forEach(([t, file]) => {
                setAttachment(t, file);
            });
        }
    };

    const handleSendMessage = useCallback(async () => {
        if ((!input.trim() && !Object.keys(attachments).length) || disabled || isSending) return;

        try {
            setIsSending(true);

            // Create message object with content
            const message: Partial<IChatMessage> = {
                text: input.trim(),
                reply_to: replyingTo?.id,
            };

            for (const [type, file] of Object.entries(attachments)) {
                try {
                    // const result = await window.electron.fileSystem.uploadFile({
                    //   file: file
                    // });
                    const result = {
                        success: true,
                        id: '123',
                        url: 'https://example.com/file.jpg'
                    }

                    if (result && result.success) {
                        // Create IFile object with the returned data
                        const fileData: IFile = {
                            id: result.id,
                            created_at: new Date().toISOString(),
                            file_url: result.url,
                            file_type: file.type,
                            file_name: file.name
                        };

                        // Add file URL to message based on type
                        if (type === 'image') {
                            message.files = [fileData];
                        } else if (type === 'video') {
                            message.files = [fileData];
                        } else if (type === 'audio') {
                            message.files = [fileData];
                        } else {
                            // For generic files, you might need to extend IChatMessage
                            // to include a files array or object
                            if (!message.files) message.files = [];
                            message.files.push(fileData);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to upload ${type}:`, error);
                }
            }

            // Send the message with all attachments
            handleSend(message);

            // Clear inputs after sending
            setInput('');
            clearAttachments();
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    }, [input, attachments, disabled, handleSend, isSending, replyingTo, setInput, clearAttachments]);

    // Handle drag events for file dropping
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        // Handle file drop from FileExplorer
        const filePath = e.dataTransfer.getData('text/plain');

        if (filePath) {
            // Option 1: If file path is dragged from FileExplorer
            // Create a File object from the path or request it from electron
            try {
                // For simplicity - here we'd normally use IPC to get the actual file from path
                // Mock implementation for now:
                const fileName = filePath.split('/').pop() || 'file';
                const fileType = fileName.includes('.') ?
                    fileName.split('.').pop()?.toLowerCase() : 'unknown';

                // Determine file type category
                let type = 'file';
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType || '')) {
                    type = 'image';
                } else if (['mp4', 'webm', 'avi', 'mov'].includes(fileType || '')) {
                    type = 'video';
                } else if (['mp3', 'wav', 'ogg'].includes(fileType || '')) {
                    type = 'audio';
                }

                // In production, we would use electron to get the actual file from the path
                // For now, we'll simulate it
                // window.electron.fileSystem.getFileFromPath(filePath).then(file => {
                //   setAttachment(type, file);
                // });

                // Mock implementation
                const mockFile = new File([''], fileName, { type: `${type}/${fileType}` });
                setAttachment(type, mockFile);
            } catch (error) {
                console.error('Failed to handle dragged file:', error);
            }
        } else if (e.dataTransfer.files.length > 0) {
            // Option 2: If files were dragged from outside the app
            const file = e.dataTransfer.files[0];

            // Determine file type
            let type = 'file';
            if (file.type.startsWith('image/')) {
                type = 'image';
            } else if (file.type.startsWith('video/')) {
                type = 'video';
            } else if (file.type.startsWith('audio/')) {
                type = 'audio';
            }

            setAttachment(type, file);
        }
    };

    return (
        <Box
            sx={{
                px: 3,
                py: 2,
                bgcolor: theme => alpha(theme.palette.background.default, 0.8),
                backdropFilter: "blur(8px)",
            }}
        >
            <Box
                onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                    width: "100%",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: theme => `0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                    "&:focus-within": {
                        boxShadow: theme => `0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`
                    },
                    ...(isDragOver && {
                        boxShadow: theme => `0 0 0 2px ${theme.palette.primary.main}`,
                        bgcolor: theme => alpha(theme.palette.primary.light, 0.1)
                    })
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                    }}
                >
                    {/* Show reply preview if replying to a message */}
                    {replyingTo && (
                        <Box
                            sx={{
                                p: 1.5,
                                bgcolor: theme => alpha(theme.palette.primary.light, 0.1),
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'flex-start',
                                position: 'relative',
                            }}
                        >
                            <Box sx={{ width: '90%', pr: 4 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                    Reply to {replyingTo.sender_object?.username || 'User'}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '0.85rem',
                                        color: 'text.secondary',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical'
                                    }}
                                >
                                    {replyingTo.text}
                                </Typography>
                            </Box>
                            <IconButton
                                size="small"
                                onClick={onCancelReply}
                                sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: 8,
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    )}

                    {/* Use the new AttachmentPreview component */}
                    <AttachmentPreview
                        attachments={attachments}
                        onRemove={removeAttachment}
                    />

                    <MessageTextField
                        input={input}
                        setInput={setInput}
                        onSend={handleSendMessage}
                        disabled={disabled}
                    />
                    <ActionButtons
                        input={input}
                        onSend={handleSendMessage}
                        disabled={disabled}
                        isSending={isSending}
                        onAttachment={handleAttachment}
                        hasAttachments={Object.keys(attachments).length > 0}
                    />
                </Box>
            </Box>
        </Box>
    );
}

export default ChatInput;

import { Box, Typography, Avatar, IconButton, Menu, MenuItem } from "@mui/material";
import { IChatMessage } from "@/types/Chat/Message";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import ReplyIcon from '@mui/icons-material/Reply';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import FlagIcon from '@mui/icons-material/Flag';
import { useChatStore } from "@/stores/Chat/chatStore";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import * as R from 'ramda';
import CircularProgress from '@mui/material/CircularProgress';
import MarkdownRenderer from "@/scenes/Main/Chat/ChatUI/MarkdownRenderer";

interface ChatBubbleProps {
    message: IChatMessage;
    isCurrentUser: boolean;
    isContinuation?: boolean;
    isLastInSequence?: boolean;
    onReply?: (message: IChatMessage) => void;
    replyToMessage?: IChatMessage | null;
    isStreaming?: boolean;
    isConnecting?: boolean;
    streamContent?: string;
    isHovered?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

const ChatBubble = memo(({
    message: msg,
    isCurrentUser,
    isContinuation = false,
    isLastInSequence = false,
    onReply,
    replyToMessage,
    isStreaming = false,
    isConnecting = false,
    streamContent = "",
    isHovered = false,
    onMouseEnter = () => { },
    onMouseLeave = () => { }
}: ChatBubbleProps) => {
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
    const { selectedTopics } = useCurrentTopicContext();
    const toggleReaction = useChatStore(state => state.toggleReaction);

    // Get active room ID using selectedTopics approach
    const activeRoomId = Object.values(selectedTopics).find(Boolean) || null;

    // Format time as HH:MM for continued messages
    const getTimeString = () => {
        if (!msg.created_at) return "";
        const date = new Date(msg.created_at);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    // Use useCallback for event handlers to prevent unnecessary re-renders
    const handleReplyClick = useCallback(() => {
        if (onReply) {
            onReply(msg);
        }
    }, [onReply, msg]);

    const handleReaction = useCallback((reaction: string) => {
        if (activeRoomId) {
            toggleReaction(activeRoomId, msg.id, reaction);
        }
    }, [activeRoomId, msg.id, toggleReaction]);

    const handleContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        handleMenuClose();
        setTimeout(() => {
            setMenuPosition({
                top: event.clientY,
                left: event.clientX,
            });
        }, 0);
    }, []);

    const handleMenuClose = useCallback(() => {
        setMenuPosition(null);
    }, []);

    // Handle clicks outside to close the menu
    useEffect(() => {
        const handleClickOutside = () => {
            handleMenuClose();
        };

        if (menuPosition) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [menuPosition]);

    const handleCopyText = useCallback(() => {
        navigator.clipboard.writeText(msg.text);
        handleMenuClose();
    }, [msg.text, handleMenuClose]);

    const handleDelete = useCallback(() => {
        console.log('Delete message:', msg.id);
        handleMenuClose();
    }, [msg.id, handleMenuClose]);

    const handleReport = useCallback(() => {
        console.log('Report message:', msg.id);
        handleMenuClose();
    }, [msg.id, handleMenuClose]);

    return (
        <Box
            sx={{
                mb: isLastInSequence ? 0.3 : 0,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                mt: isContinuation ? 0 : 0.3,
                position: "relative",
                py: 0.3,
                px: 1,
                borderRadius: 1,
                bgcolor: isHovered ? 'action.hover' : 'transparent',
                transition: 'background-color 0.2s',
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {isContinuation ? (
                <Box sx={{
                    width: 36,
                    minWidth: 36,
                    mr: 1.5,
                    position: "relative",
                    height: "100%",
                    display: "flex",
                    alignItems: "center"
                }}>
                    {/* Small timestamp for continued messages - only shown on hover */}
                    {isHovered && (
                        <Typography
                            noWrap
                            sx={{
                                fontSize: "0.65rem",
                                color: "text.secondary",
                                opacity: 0.7,
                                width: "100%",
                                textAlign: "center"
                            }}
                        >
                            {getTimeString()}
                        </Typography>
                    )}
                </Box>
            ) : (
                <Avatar
                    src={msg.sender_object?.avatar}
                    alt={msg.sender_object?.username?.charAt(0) || '?'}
                    sx={{
                        width: 36,
                        height: 36,
                        minWidth: 36,
                        mr: 1.5,
                        mt: 0.5,
                        bgcolor: 'primary.main'
                    }}
                    slotProps={{
                        img: {
                            referrerPolicy: "no-referrer",
                            crossOrigin: "anonymous"
                        }
                    }}
                />
            )}
            <Box
                sx={{ maxWidth: "calc(100% - 50px)", width: "100%" }}
                onContextMenu={handleContextMenu}
            >
                {!isContinuation && (
                    <Typography sx={{
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        color: "text.primary",
                        mb: 0
                    }}>
                        {msg.sender_object?.username}
                        <Typography component="span" sx={{ color: "text.secondary", fontWeight: 400, fontSize: "0.8rem", ml: 1 }}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleString() : 'Sending...'}
                        </Typography>
                    </Typography>
                )}

                {replyToMessage && (
                    <Box
                        sx={{
                            mb: 0.5,
                            mt: 0.5,
                            pl: 1,
                            borderLeft: '2px solid',
                            borderColor: 'primary.light',
                            opacity: 0.8
                        }}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 500, color: 'primary.dark' }}>
                            Replying to {replyToMessage.sender_object?.username}
                        </Typography>
                        <Typography
                            noWrap
                            sx={{
                                fontSize: '0.8rem',
                                color: 'text.secondary',
                                maxWidth: '250px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                        >
                            {replyToMessage.text}
                        </Typography>
                    </Box>
                )}

                {/* Only show MarkdownRenderer when there's content to display */}
                {(msg.text || (isStreaming && streamContent)) && (
                    <>
                        <MarkdownRenderer
                            content={msg.text}
                            isStreaming={isStreaming}
                            isConnecting={isConnecting}
                            streamContent={streamContent}
                        />
                    </>
                )}

                {/* Keep showing loading indicator until stream completes */}
                {isStreaming && isConnecting && (
                    <Box sx={{ display: 'flex', mt: 1, alignItems: 'center' }}>
                        <CircularProgress
                            size={16}
                            thickness={4}
                            sx={{
                                color: 'text.secondary'
                            }}
                        />
                        <Typography sx={{ ml: 1, fontSize: '0.85rem', color: 'text.secondary' }}>
                            {streamContent && typeof streamContent === 'string' ? 'Generating...' : 'Loading...'}
                        </Typography>
                    </Box>
                )}

                {msg.reactions && msg.reactions.length > 0 && (
                    <Box sx={{
                        display: 'flex',
                        gap: 0.5,
                        mt: 0.5,
                        mb: 0.3,
                        height: 24
                    }}>
                        {Object.entries(
                            R.groupBy(reaction => reaction.reaction, msg.reactions)
                        ).map(([emoji, reactions]) => (
                            <Box
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    bgcolor: 'action.hover',
                                    borderRadius: 2,
                                    px: 0.8,
                                    py: 0.3,
                                    pb: 0.4,
                                    cursor: 'pointer',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    '&:hover': {
                                        bgcolor: 'action.selected',
                                        boxShadow: 1
                                    }
                                }}
                            >
                                <Typography sx={{ fontSize: '0.9rem', mr: 0.3 }}>{emoji}</Typography>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{reactions?.length || 0}</Typography>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {isHovered && (
                <Box
                    sx={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        transform: "translateY(-50%)",
                        display: "flex",
                        bgcolor: "background.paper",
                        borderRadius: 1,
                        boxShadow: 2,
                        p: 0.4,
                        zIndex: 10,
                        transition: 'none',
                        border: '1px solid',
                        borderColor: 'divider'
                    }}
                >
                    <IconButton size="small" sx={{ p: 0.5, borderRadius: 1, m: 0.1 }} onClick={() => handleReaction("👍")}>
                        <ThumbUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ p: 0.5, borderRadius: 1, m: 0.1 }} onClick={() => handleReaction("❤️")}>
                        <FavoriteIcon fontSize="small" color="error" />
                    </IconButton>
                    <IconButton size="small" sx={{ p: 0.5, borderRadius: 1, m: 0.1 }} onClick={() => handleReaction("😊")}>
                        <EmojiEmotionsIcon fontSize="small" color="warning" />
                    </IconButton>
                    <IconButton size="small" sx={{ p: 0.5, borderRadius: 1, m: 0.1 }} onClick={handleReplyClick}>
                        <ReplyIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" sx={{ p: 0.5, borderRadius: 1, m: 0.1 }} onClick={handleContextMenu}>
                        <MoreHorizIcon fontSize="small" />
                    </IconButton>
                </Box>
            )}

            <Menu
                open={Boolean(menuPosition)}
                onClose={handleMenuClose}
                anchorReference="anchorPosition"
                anchorPosition={menuPosition ? { top: menuPosition.top, left: menuPosition.left } : undefined}
                onClick={(e) => e.stopPropagation()}
            >
                <MenuItem onClick={handleCopyText} dense>
                    <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
                    Copy text
                </MenuItem>
                {isCurrentUser && (
                    <MenuItem onClick={handleDelete} dense>
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                        Delete
                    </MenuItem>
                )}
                <MenuItem onClick={handleReport} dense>
                    <FlagIcon fontSize="small" sx={{ mr: 1 }} />
                    Report
                </MenuItem>
            </Menu>
        </Box>
    );
}, (prevProps, nextProps) => {
    // If any of these critical props change, they are NOT equal, so return false (re-render).
    if (prevProps.isStreaming !== nextProps.isStreaming ||
        prevProps.isConnecting !== nextProps.isConnecting ||
        (nextProps.isStreaming && prevProps.streamContent !== nextProps.streamContent) ||
        (!nextProps.isStreaming && prevProps.message.text !== nextProps.message.text) ||
        prevProps.message.id !== nextProps.message.id ||
        !R.equals(prevProps.message.reactions, nextProps.message.reactions) ||
        prevProps.isHovered !== nextProps.isHovered ||
        prevProps.isCurrentUser !== nextProps.isCurrentUser ||
        prevProps.isContinuation !== nextProps.isContinuation ||
        prevProps.isLastInSequence !== nextProps.isLastInSequence ||
        (prevProps.replyToMessage?.id !== nextProps.replyToMessage?.id) ||
        // Also consider changes in sender object if they can affect rendering
        (prevProps.message.sender_object?.avatar !== nextProps.message.sender_object?.avatar) ||
        (prevProps.message.sender_object?.username !== nextProps.message.sender_object?.username)
    ) {
        return false; // Props are different, re-render
    }
    return true; // Props are the same, skip re-render
});

export default ChatBubble;

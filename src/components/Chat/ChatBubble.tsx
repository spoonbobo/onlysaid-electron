import { Box, Typography, Avatar, IconButton, Menu, MenuItem } from "@mui/material";
import { IChatMessage } from "@/../../types/Chat/Message";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import ReplyIcon from '@mui/icons-material/Reply';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { useChatStore } from "@/stores/Chat/ChatStore";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import * as R from 'ramda';
import CircularProgress from '@mui/material/CircularProgress';
import MarkdownRenderer from "@/components/Chat/MarkdownRenderer";
import { FormattedMessage } from "react-intl";
import DeleteMessageDialog from "@/components/Dialog/DeleteMessage";

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
  const { selectedTopics, selectedContext } = useCurrentTopicContext();
  const toggleReaction = useChatStore(state => state.toggleReaction);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const activeChatId = selectedContext?.section ? selectedTopics[selectedContext.section] || null : null;

  const getTimeString = () => {
    if (!msg.created_at) return "";
    const date = new Date(msg.created_at);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleReplyClick = useCallback(() => {
    if (onReply) {
      onReply(msg);
    }
  }, [onReply, msg]);

  const handleReaction = useCallback((reaction: string) => {
    if (activeChatId) {
      toggleReaction(activeChatId, msg.id, reaction);
    }
  }, [activeChatId, msg.id, toggleReaction]);

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

  const handleCopyText = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(msg.text);
    handleMenuClose();
  }, [msg.text, handleMenuClose]);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);


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
              {msg.created_at ? (() => {
                const date = new Date(msg.created_at);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
                const day = String(date.getDate()).padStart(2, '0');
                const hour = date.getHours();
                const minute = String(date.getMinutes()).padStart(2, '0');

                let timeOfDayKey = null;
                if (hour === 0) {
                  timeOfDayKey = "time.midnight";
                } else if (hour >= 1 && hour < 12) {
                  timeOfDayKey = "time.morning";
                } else if (hour >= 12 && hour < 18) {
                  timeOfDayKey = "time.afternoon";
                }

                const formattedDate = `${year}/${month}/${day}`;
                const formattedTime = `${String(hour).padStart(2, '0')}:${minute}`;

                return (
                  <>
                    {formattedDate}{' '}
                    {timeOfDayKey && <FormattedMessage id={timeOfDayKey} />}{' '}
                    {formattedTime}
                  </>
                );
              })() : <FormattedMessage id="chat.sending" defaultMessage="Sending..." />}
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

        {
          (msg.text || isStreaming) ? (
            (isStreaming && !msg.text && !streamContent) ? (
              <Typography sx={{ color: "text.secondary", fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>...</Typography>
            ) : (
              <MarkdownRenderer
                content={msg.text}
                isStreaming={isStreaming}
                isConnecting={isConnecting}
                streamContent={streamContent}
              />
            )
          ) : (
            <Typography sx={{ color: "text.secondary", fontStyle: 'italic' }}>
              <FormattedMessage id="chat.emptyMessage" defaultMessage="[Message is empty]" />
            </Typography>
          )
        }

        {msg.reactions && msg.reactions.length > 0 && (
          <Box sx={{
            display: 'flex',
            gap: 0.3,
            mt: 0.5,
            mb: 0.3,
            minHeight: 22
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
                  borderRadius: 3,
                  px: 0.6,
                  py: 0.2,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  }
                }}
              >
                <Typography sx={{ fontSize: '1.1rem', mr: 0.3, lineHeight: 1 }}>{emoji}</Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, lineHeight: 1 }}>{reactions?.length || 0}</Typography>
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
          <FormattedMessage id="chat.copyText" />
        </MenuItem>
        <MenuItem onClick={handleDelete} dense>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          <FormattedMessage id="chat.delete" />
        </MenuItem>
      </Menu>

      <DeleteMessageDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        message={deleteDialogOpen ? msg : null}
        chatId={activeChatId || ''}
      />
    </Box>
  );
}, (prevProps, nextProps) => {
  if (prevProps.isStreaming !== nextProps.isStreaming ||
    prevProps.isConnecting !== nextProps.isConnecting ||
    prevProps.isHovered !== nextProps.isHovered) {
    return false;
  }

  if (nextProps.isStreaming && prevProps.streamContent !== nextProps.streamContent) {
    return false;
  }

  if (!nextProps.isStreaming && prevProps.message.text !== nextProps.message.text) {
    return false;
  }

  if (prevProps.message.id !== nextProps.message.id) {
    return false;
  }

  if (!prevProps.message.reactions || !nextProps.message.reactions) {
    if (prevProps.message.reactions !== nextProps.message.reactions) {
      return false;
    }
  } else if (prevProps.message.reactions.length !== nextProps.message.reactions.length) {
    return false;
  } else {
    if (prevProps.message.reactions !== nextProps.message.reactions &&
      JSON.stringify(prevProps.message.reactions) !== JSON.stringify(nextProps.message.reactions)) {
      return false;
    }
  }

  return true;
});

export default ChatBubble;

import { Box, Typography, Avatar, IconButton, Menu, MenuItem, Button } from "@mui/material";
import { IChatMessage } from "@/../../types/Chat/Message";
import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import ReplyIcon from '@mui/icons-material/Reply';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import * as R from 'ramda';
import MarkdownRenderer from "@/renderer/components/Chat/MarkdownRenderer";
import { FormattedMessage } from "react-intl";
import DeleteMessageDialog from "@/renderer/components/Dialog/Chat/DeleteMessage";
import ThisIsEncrypted from "@/renderer/components/Dialog/Chat/ThisIsEncrypted";
import ToolDisplay from "@/renderer/components/Chat/ToolDisplay";
import FileDisplay from "./FileDisplay";
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { IReaction } from "@/../../types/Chat/Message";

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
  const [encryptionDialogOpen, setEncryptionDialogOpen] = useState(false);
  const [thinkingDuration, setThinkingDuration] = useState(0);

  const activeChatId = selectedContext?.section ? selectedTopics[selectedContext.section] || null : null;

  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    const isCurrentlyThinking = isStreaming && !msg.text && !streamContent;

    if (isCurrentlyThinking) {
      setThinkingDuration(0); // Reset duration when thinking starts
      timerId = setInterval(() => {
        setThinkingDuration(prevDuration => prevDuration + 1);
      }, 1000);
    } else {
      setThinkingDuration(0); // Reset if no longer thinking
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [isStreaming, msg.text, streamContent]);

  const getThinkingMessage = () => {
    const executingTools = msg.tool_calls?.filter(tc => 
      tc.status === 'executing' || tc.status === 'approved'
    ) || [];
    
    if (executingTools.length > 0) {
      const toolNames = executingTools.map(tc => tc.function?.name || 'Tool').join(', ');
      return `Executing ${toolNames}... (${thinkingDuration}s)`;
    }
    
    const pendingTools = msg.tool_calls?.filter(tc => 
      tc.status === 'pending' || !tc.status
    ) || [];
    
    if (pendingTools.length > 0) {
      return `Waiting for tool approval... (${thinkingDuration}s)`;
    }
    
    return `Thinking... (${thinkingDuration}s)`;
  };

  const getTimeString = () => {
    const timestamp = msg.created_at || msg.sent_at;
    if (!timestamp) return "";

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

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
    setMenuPosition({
      top: event.clientY,
      left: event.clientX,
    });
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

  const textForCopy = useMemo(() => {
    if (isStreaming && typeof streamContent === 'string' && streamContent) {
      return streamContent;
    }
    return msg.text;
  }, [isStreaming, streamContent, msg.text]);

  const handleCopyText = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(textForCopy || (msg.tool_calls ? "Tool call data" : ""));
    handleMenuClose();
  }, [textForCopy, msg.tool_calls, handleMenuClose]);

  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const handleEncryptionClick = useCallback(() => {
    setEncryptionDialogOpen(true);
  }, []);

  const handleCloseEncryptionDialog = useCallback(() => {
    setEncryptionDialogOpen(false);
  }, []);

  const handleMenuButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const buttonRect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: buttonRect.bottom + 4,
      left: buttonRect.left,
    });
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
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          pt: 0.3,
        }}>
          {isHovered && (
            <Typography
              noWrap
              sx={{
                fontSize: "0.65rem",
                color: "text.secondary",
                opacity: 0.7,
                textAlign: "center",
                lineHeight: 1.5,
                mt: 0.3,
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
            mb: 0,
            display: "flex",
            alignItems: "center",
            gap: 0.5
          }}>
            {msg.sender_object?.username}
            <Typography component="span" sx={{ color: "text.secondary", fontWeight: 400, fontSize: "0.8rem", ml: 1 }}>
              {msg.created_at || msg.sent_at ? (() => {
                const timestamp = msg.created_at || msg.sent_at;
                if (!timestamp) {
                  return msg.sender_object?.is_human !== false ? (
                    <FormattedMessage id="chat.sending" defaultMessage="Sending..." />
                  ) : null;
                }

                const date = new Date(timestamp);
                if (isNaN(date.getTime())) {
                  return msg.sender_object?.is_human !== false ? (
                    <FormattedMessage id="chat.sending" defaultMessage="Sending..." />
                  ) : null;
                }

                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
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
              })() : (
                msg.sender_object?.is_human !== false ? (
                  <FormattedMessage id="chat.sending" defaultMessage="Sending..." />
                ) : null
              )}
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
          (!msg.text?.trim() && msg.tool_calls && msg.tool_calls.length > 0) ? (
            <ToolDisplay toolCalls={msg.tool_calls} chatId={msg.chat_id} messageId={msg.id} />
          ) : (
            (msg.text || isStreaming || streamContent) ? (
              (isStreaming && !textForCopy && !streamContent) ? (
                <Typography sx={{ 
                  color: "text.secondary", 
                  whiteSpace: 'pre-wrap',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  {getThinkingMessage()}
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      animation: 'pulse 1.5s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1, transform: 'scale(1)' },
                        '50%': { opacity: 0.5, transform: 'scale(1.2)' },
                        '100%': { opacity: 1, transform: 'scale(1)' }
                      }
                    }}
                  />
                </Typography>
              ) : (
                <MarkdownRenderer
                  content={msg.text || ""}
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
          )
        }

        <FileDisplay message={msg} />

        {msg.tool_calls && msg.tool_calls.length > 0 && msg.text && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider', opacity: 0.8 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {(() => {
                const executedTools = msg.tool_calls.filter(tc => tc.status === 'executed');
                const failedTools = msg.tool_calls.filter(tc => tc.status === 'error');
                const pendingTools = msg.tool_calls.filter(tc => tc.status === 'pending' || !tc.status);
                const executingTools = msg.tool_calls.filter(tc => tc.status === 'executing' || tc.status === 'approved');
                
                const parts = [];
                if (executedTools.length > 0) parts.push(`${executedTools.length} executed`);
                if (failedTools.length > 0) parts.push(`${failedTools.length} failed`);
                if (executingTools.length > 0) parts.push(`${executingTools.length} executing`);
                if (pendingTools.length > 0) parts.push(`${pendingTools.length} pending`);
                
                return `Tools: ${parts.join(', ')}`;
              })()}
            </Typography>
          </Box>
        )}

        {msg.reactions && msg.reactions.length > 0 && (
          <Box sx={{
            display: 'flex',
            gap: 0.3,
            mt: 0.5,
            mb: 0.3,
            minHeight: 22
          }}>
            {Object.entries(
              R.groupBy(reaction => reaction.reaction, msg.reactions as IReaction[])
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
          {msg.is_encrypted ? (
            <IconButton size="small" sx={{ p: 0.5, borderRadius: 1, m: 0.1 }} onClick={handleEncryptionClick}>
              <LockIcon fontSize="small" sx={{ color: "success.main" }} />
            </IconButton>
          ) : (
            <IconButton size="small" sx={{ p: 0.5, borderRadius: 1, m: 0.1 }} onClick={handleEncryptionClick}>
              <LockOpenIcon fontSize="small" sx={{ color: "error.main" }} />
            </IconButton>
          )}
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
          <IconButton
            size="small"
            sx={{ p: 0.5, borderRadius: 1, m: 0.1 }}
            onClick={handleMenuButtonClick}
          >
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
        slotProps={{
          paper: {
            elevation: 3,
          },
          root: {
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Escape') {
                handleMenuClose();
              }
            }
          }
        }}
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

      <ThisIsEncrypted
        open={encryptionDialogOpen}
        onClose={handleCloseEncryptionDialog}
        message={encryptionDialogOpen ? msg : null}
      />
    </Box>
  );
}, (prevProps, nextProps) => {
  if (prevProps.isStreaming !== nextProps.isStreaming ||
    prevProps.isConnecting !== nextProps.isConnecting ||
    prevProps.isHovered !== nextProps.isHovered ||
    prevProps.isContinuation !== nextProps.isContinuation ||
    prevProps.isLastInSequence !== nextProps.isLastInSequence) {
    return false;
  }

  if (prevProps.message.id !== nextProps.message.id) {
    return false;
  }

  if (nextProps.isStreaming && prevProps.streamContent !== nextProps.streamContent) {
    return false;
  }

  if (prevProps.message.text !== nextProps.message.text) {
    return false;
  }

  if (prevProps.message.sender_object !== nextProps.message.sender_object) {
    return false;
  }

  if (prevProps.message.reactions !== nextProps.message.reactions) {
    return false;
  }

  if (prevProps.message.files !== nextProps.message.files) {
    return false;
  }

  if (prevProps.message.tool_calls !== nextProps.message.tool_calls) {
    return false;
  }

  if (prevProps.replyToMessage !== nextProps.replyToMessage) {
    return false;
  }

  if (prevProps.message.tool_calls && nextProps.message.tool_calls) {
    const prevStatuses = prevProps.message.tool_calls.map(tc => tc.status).join(',');
    const nextStatuses = nextProps.message.tool_calls.map(tc => tc.status).join(',');
    if (prevStatuses !== nextStatuses) {
      return false;
    }
  }

  return true;
});

export default ChatBubble;

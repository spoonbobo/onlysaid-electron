import { Box, Typography, Avatar, IconButton } from "@mui/material";
import { IChatMessage } from "@/models/Chat/Message";
import { useState } from "react";
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import ReplyIcon from '@mui/icons-material/Reply';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useChatStore } from "@/stores/Chat/chatStore";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";
import { useWindowStore } from "@/stores/Topic/WindowStore";
import { useStreamStore } from "@/stores/SSE/StreamStore";
import * as R from 'ramda';

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
}

const ChatBubble = ({
  message: msg,
  isCurrentUser,
  isContinuation = false,
  isLastInSequence = false,
  onReply,
  replyToMessage,
  isStreaming = false,
  isConnecting = false,
  streamContent = ""
}: ChatBubbleProps) => {
  const [isHovered, setIsHovered] = useState(false);
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

  const handleReplyClick = () => {
    if (onReply) {
      onReply(msg);
    }
  };

  const handleReaction = (reaction: string) => {
    if (activeRoomId) {
      toggleReaction(activeRoomId, msg.id, reaction);
    }
  };

  // Determine what text to display
  const displayText = isStreaming
    ? streamContent || (isConnecting ? "Generating..." : "")
    : msg.text;

  return (
    <Box
      sx={{
        mb: isLastInSequence ? 0.8 : 0,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        mt: isContinuation ? 0 : 0.8,
        position: "relative",
        py: 0.5,
        px: 1,
        borderRadius: 1,
        bgcolor: isHovered ? 'action.hover' : 'transparent',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
      <Box>
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

        <Typography sx={{
          color: "text.secondary",
          fontSize: "0.95rem",
          mt: !isContinuation ? 0.2 : 0,
          whiteSpace: "pre-line"
        }}>
          {displayText}
          {isStreaming && isConnecting && (
            <Typography component="span" sx={{
              display: "inline-block",
              width: "1em",
              animation: "cursorBlink 1s infinite",
              "@keyframes cursorBlink": {
                "0%": { opacity: 0 },
                "50%": { opacity: 1 },
                "100%": { opacity: 0 }
              }
            }}>
              _
            </Typography>
          )}
        </Typography>

        {msg.reactions && msg.reactions.length > 0 && (
          <Box sx={{
            display: 'flex',
            gap: 0.5,
            mt: 0.5,
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
                  py: 0.2,
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
          <IconButton size="small" sx={{ p: 0.5, borderRadius: 1, m: 0.1 }} onClick={() => handleReplyClick}>
            <ReplyIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ p: 0.5, borderRadius: 1, m: 0.1 }}>
            <MoreHorizIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default ChatBubble;

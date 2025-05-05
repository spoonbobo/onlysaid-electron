import { useState, useCallback } from "react";
import { Box, Typography, alpha, IconButton } from "@mui/material";
import MessageTextField from "./TextField/MessageTextField";
import ActionButtons from "./ActionButtons/ActionButtons";
import { IChatMessage } from "@/models/Chat/Message";
import CloseIcon from '@mui/icons-material/Close';

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
  const [attachments, setAttachments] = useState<{
    image?: string;
    video?: string;
    audio?: string;
    file?: File;
  }>({});

  const handleSendMessage = useCallback(async () => {
    if ((!input.trim() && !Object.keys(attachments).length) || disabled || isSending) return;

    try {
      setIsSending(true);

      // Create message object with content and attachments
      const message: Partial<IChatMessage> = {
        text: input.trim(),
        reply_to: replyingTo?.id,
        image: attachments.image ? [attachments.image] : undefined,
        video: attachments.video ? [attachments.video] : undefined,
        audio: attachments.audio ? [attachments.audio] : undefined,
      };

      handleSend(message);

      // Clear attachments after sending
      setAttachments({});
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [input, attachments, disabled, handleSend, isSending, replyingTo]);

  const handleAttachment = (type: string, value: string | File) => {
    setAttachments(prev => ({ ...prev, [type]: value }));
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
        component="form"
        onSubmit={e => {
          e.preventDefault();
          handleSendMessage();
        }}
        sx={{
          width: "100%",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: theme => `0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
          "&:focus-within": {
            boxShadow: theme => `0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`
          }
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
                justifyContent: 'space-between'
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Reply to {replyingTo.sender_object?.username || 'User'}
                </Typography>
                <Typography noWrap sx={{ fontSize: '0.85rem', color: 'text.secondary', maxWidth: '80%' }}>
                  {replyingTo.text}
                </Typography>
              </Box>
              <IconButton size="small" onClick={onCancelReply}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {/* Show attachment previews if any */}
          {Object.keys(attachments).length > 0 && (
            <Box sx={{ p: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(attachments).map(([type, value]) => (
                <Box
                  key={type}
                  sx={{
                    p: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {type === 'file' ? (value as File).name : type}
                  {/* Add remove button */}
                </Box>
              ))}
            </Box>
          )}

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
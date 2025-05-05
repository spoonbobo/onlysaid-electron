import { useState, useCallback } from "react";
import { Box, Typography, alpha, IconButton } from "@mui/material";
import MessageTextField from "./TextField/MessageTextField";
import ActionButtons from "./ActionButtons/ActionButtons";
import AttachmentPreview from "./Attachments";
import { IChatMessage } from "@/models/Chat/Message";
import CloseIcon from '@mui/icons-material/Close';
import { IFile } from "@/models/File/File";
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
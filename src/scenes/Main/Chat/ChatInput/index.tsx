import { useState, useCallback } from "react";
import { Box, alpha } from "@mui/material";
import MessageTextField from "./TextField/MessageTextField";
import ActionButtons from "./ActionButtons/ActionButtons";
import { IChatMessage } from "@/models/Chat/Message";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSend: (message: Partial<IChatMessage>) => void;
  disabled?: boolean;
}

function ChatInput({ input, setInput, handleSend, disabled = false }: ChatInputProps) {
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
        ...attachments
      };

      handleSend(message);

      // Clear attachments after sending
      setAttachments({});
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [input, attachments, disabled, handleSend, isSending]);

  const handleAttachment = (type: string, value: string | File) => {
    setAttachments(prev => ({ ...prev, [type]: value }));
  };

  return (
    <Box
      sx={{
        px: 3,
        py: 2,
        borderTop: 1,
        borderColor: "divider",
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
          border: 1,
          borderColor: theme => alpha(theme.palette.divider, 0.6),
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
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
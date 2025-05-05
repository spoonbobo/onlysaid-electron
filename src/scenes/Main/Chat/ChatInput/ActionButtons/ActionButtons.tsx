import { useState, useRef } from "react";
import { Box, Button, IconButton, alpha } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { FormattedMessage } from "react-intl";
import { useSelectedModelStore } from "@/stores/LLM/SelectedModelStore";
import ModelSelector from "./ModelSelector";
import { useCurrentTopicContext } from "@/stores/Topic/TopicStore";

interface ActionButtonsProps {
  input: string;
  onSend: () => void;
  onAttachment: (type: string, value: string | File) => void;
  disabled?: boolean;
  isSending?: boolean;
  hasAttachments?: boolean;
}

export default function ActionButtons({
  input,
  onSend,
  onAttachment,
  disabled = false,
  isSending = false,
  hasAttachments = false
}: ActionButtonsProps) {
  const { parentId, trustMode, setTrustMode } = useCurrentTopicContext();
  const { modelId, provider } = useSelectedModelStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Determine file type
      let type = 'file';
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      }

      onAttachment(type, file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        alignItems: "center",
        p: 1,
        justifyContent: "flex-end",
        bgcolor: theme => alpha(theme.palette.background.paper, 0.5),
      }}
    >
      <ModelSelector disabled={disabled} />

      <Button
        variant="text"
        size="small"
        sx={{
          minWidth: "auto",
          px: 1.5,
          borderRadius: "20px",
          color: trustMode ? "#ec4899" : "text.disabled",
          fontWeight: "bold",
          fontSize: "0.75rem",
          "&:hover": {
            color: "#ec4899",
            bgcolor: "transparent"
          }
        }}
        onClick={() => setTrustMode(!trustMode)}
      >
        <FormattedMessage id="chat.trustMode" />
      </Button>

      <IconButton
        size="small"
        disabled
        sx={{
          color: "text.disabled",
          opacity: 0.5,
          "&:hover": {
            bgcolor: "transparent"
          }
        }}
      >
        <MicIcon fontSize="small" />
      </IconButton>

      <IconButton
        size="small"
        onClick={() => fileInputRef.current?.click()}
        sx={{
          color: hasAttachments ? "primary.main" : "text.secondary",
          "&:hover": {
            bgcolor: "transparent"
          }
        }}
      >
        <AttachFileIcon fontSize="small" />
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </IconButton>

      <IconButton
        type="submit"
        size="small"
        disabled={(!input.trim() && !hasAttachments) || disabled || isSending}
        sx={{
          color: (input.trim() || hasAttachments) && !disabled && modelId && provider
            ? "primary.main"
            : "text.disabled",
          "&:hover": {
            bgcolor: theme => alpha(theme.palette.primary.main, 0.08)
          }
        }}
      >
        <SendIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
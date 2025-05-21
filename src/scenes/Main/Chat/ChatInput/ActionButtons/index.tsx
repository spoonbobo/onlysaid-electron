import { useRef } from "react";
import { Box, IconButton, alpha } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useSelectedModelStore } from "@/stores/LLM/SelectedModelStore";
import ModelSelector from "./ModelSelector";
import AIMode from "./AIMode";
import KBSelector from "./KBSelector";
import { useLLMConfigurationStore } from "@/stores/LLM/LLMConfiguration";

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
  const { modelId, provider } = useSelectedModelStore();
  const { aiMode } = useLLMConfigurationStore();
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

      // Just pass the file object to parent without uploading
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
        px: 2,
        py: 1,
        justifyContent: "space-between",
        bgcolor: theme => alpha(theme.palette.background.paper, 0.5),
      }}
    >
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
        <AIMode disabled={disabled} />
        <ModelSelector disabled={disabled} />
        {aiMode === "query" && <KBSelector disabled={disabled} />}
      </Box>

      <Box sx={{ display: "flex", gap: 0.5 }}>
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
          disabled={disabled}
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
            accept="image/*,video/*,audio/*,application/*"
          />
        </IconButton>

        <IconButton
          type="submit"
          onClick={onSend}
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
    </Box>
  );
}
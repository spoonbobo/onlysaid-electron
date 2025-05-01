import { useState, useRef, useCallback, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Button,
  alpha,
  Menu,
  MenuItem,
  Typography
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MicIcon from "@mui/icons-material/Mic";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useChatStore } from "../../../../stores/Chat/chatStore";
import { LLMService } from "../../../../service/llm";
import { useSelectedModelStore } from "../../../../stores/LLM/SelectedModelStore";

// Create a single instance of LLMService outside the component
const llmService = new LLMService();

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSend: () => void;
  disabled?: boolean;
}

function ChatInput({ input, setInput, handleSend, disabled = false }: ChatInputProps) {
  const [trustMode, setTrustMode] = useState(false);
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const sendMessage = useChatStore(state => state.sendMessage);
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // Get the selected model from the persisted store
  const { modelName, provider, modelId, setSelectedModel } = useSelectedModelStore();

  // Model menu state
  const [modelMenuAnchor, setModelMenuAnchor] = useState<null | HTMLElement>(null);
  const modelMenuOpen = Boolean(modelMenuAnchor);

  // Load available models when component mounts
  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await llmService.GetEnabledLLM();
        setAvailableModels(models);

        // If we have available models and either no model is selected in the store
        // or the selected model is no longer available, select the first one
        if (models.length > 0 && (!modelId || !provider)) {
          setSelectedModel(
            models[0].provider,
            models[0].id,
            models[0].name
          );
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();
  }, [setSelectedModel, modelId, provider]);

  // Define handleSendMessage first
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || disabled || isSending || !modelId || !provider) return;

    try {
      setIsSending(true);

      // Pass the selected model's provider and ID
      // await sendMessage(input, trustMode, provider, modelId);

      // After successful insertion, clear the input
      handleSend();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Handle error (maybe show a notification)
    } finally {
      setIsSending(false);
    }
  }, [input, disabled, trustMode, handleSend, isSending, sendMessage, provider, modelId]);

  // Then define handleKeyDown which depends on it
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSendMessage();
      }
    }
  }, [input, handleSendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, [setInput]);

  // Model menu handlers
  const handleModelMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Load models when the button is clicked
    const loadModels = async () => {
      try {
        const models = await llmService.GetEnabledLLM();
        setAvailableModels(models);

        // If no model is selected but models are available, select the first one
        if (models.length > 0 && (!modelId || !provider)) {
          setSelectedModel(
            models[0].provider,
            models[0].id,
            models[0].name
          );
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();
    setModelMenuAnchor(event.currentTarget);
  };

  const handleModelMenuClose = () => {
    setModelMenuAnchor(null);
  };

  const handleModelSelect = (model: any) => {
    setSelectedModel(model.provider, model.id, model.name);
    handleModelMenuClose();
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
      {/* Form container with border */}
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
        {/* Inner content container */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
          }}
        >
          {/* Text Field Row */}
          <TextField
            inputRef={textFieldRef}
            multiline
            minRows={1}
            maxRows={6}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Please select a room" : "Type your message..."}
            disabled={disabled}
            fullWidth
            variant="outlined"
            slotProps={{
              input: {
                sx: {
                  minHeight: "32px",
                }
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 0,
                py: 1,
                fontSize: "0.95rem",
                lineHeight: 1.5,
              },
              "& .MuiOutlinedInput-notchedOutline": {
                border: "none",
              },
              "& .MuiInputBase-input": {
                px: 2,
                py: 1,
                minHeight: "20px",
                resize: "none",
                "&::-webkit-scrollbar": {
                  display: "none"
                },
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }
            }}
          />

          {/* Buttons Row */}
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
            {/* Model selector button */}
            {availableModels.length > 0 ? (
              <Button
                variant="text"
                size="small"
                onClick={handleModelMenuOpen}
                sx={{
                  minWidth: "auto",
                  px: 1.5,
                  borderRadius: "20px",
                  color: "text.primary",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": {
                    bgcolor: theme => alpha(theme.palette.action.hover, 0.1)
                  }
                }}
              >
                {modelName || "Select Model"}
                <ExpandMoreIcon fontSize="small" sx={{ width: 16, height: 16 }} />
              </Button>
            ) : (
              <Button
                variant="text"
                size="small"
                disabled
                sx={{
                  minWidth: "auto",
                  px: 1.5,
                  borderRadius: "20px",
                  color: "text.disabled",
                  fontSize: "0.75rem",
                  fontStyle: "italic",
                  opacity: 0.7,
                }}
              >
                NO AI MODELS ENABLED
              </Button>
            )}

            {/* Trust Mode Button */}
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
              Trust Mode
            </Button>

            {/* Action buttons - no longer need ml: auto since all buttons are right-aligned */}
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
              disabled
              sx={{
                color: "text.disabled",
                opacity: 0.5,
                "&:hover": {
                  bgcolor: "transparent"
                }
              }}
            >
              <AttachFileIcon fontSize="small" />
            </IconButton>

            <IconButton
              type="submit"
              size="small"
              disabled={!input.trim() || disabled || isSending || !modelId || !provider}
              sx={{
                color: input.trim() && !disabled && modelId && provider ? "primary.main" : "text.disabled",
                "&:hover": {
                  bgcolor: theme => alpha(theme.palette.primary.main, 0.08)
                }
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Model selection menu */}
      <Menu
        anchorEl={modelMenuAnchor}
        open={modelMenuOpen}
        onClose={handleModelMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        {availableModels.length > 0 ? (
          availableModels.map((model) => (
            <MenuItem
              key={model.id}
              onClick={() => handleModelSelect(model)}
              selected={modelId === model.id && provider === model.provider}
            >
              <Typography variant="body2">{model.name}</Typography>
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography variant="body2" sx={{ maxWidth: 220 }}>
              No models available. Please configure and verify your LLM providers in Settings.
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

export default ChatInput;

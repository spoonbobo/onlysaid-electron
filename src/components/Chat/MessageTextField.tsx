import { useCallback, useRef } from "react";
import { TextField, alpha } from "@mui/material";
import { useIntl } from "react-intl";

interface MessageTextFieldProps {
  input: string;
  setInput: (input: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function MessageTextField({
  input,
  setInput,
  onSend,
  disabled = false
}: MessageTextFieldProps) {
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const intl = useIntl();

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend();
      }
    }
  }, [input, onSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, [setInput]);

  return (
    <TextField
      inputRef={textFieldRef}
      multiline
      minRows={1}
      maxRows={6}
      value={input}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      placeholder={disabled ?
        intl.formatMessage({ id: "chat.selectRoom" }) :
        intl.formatMessage({ id: "chat.typeMessage" })
      }
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
        bgcolor: theme => alpha(theme.palette.background.paper, 0.5),
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
  );
}

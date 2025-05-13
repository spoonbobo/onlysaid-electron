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

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedText = e.clipboardData.getData('text/plain');
    if (!pastedText) return;

    const lines = pastedText.split('\n');
    const isMultiLine = lines.length > 1;

    let isLikelyCode = false;
    if (isMultiLine) {
      const codeCharsRegex = /[{}();=<>]/;
      if (codeCharsRegex.test(pastedText)) {
        isLikelyCode = true;
      } else {
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].match(/^\s+/)) {
            isLikelyCode = true;
            break;
          }
        }
      }
    }

    if (isLikelyCode) {
      e.preventDefault();

      const formattedText = `\`\`\`\n${pastedText.trim()}\n\`\`\``;

      const target = e.target as HTMLTextAreaElement;
      const currentCursorPosition = target.selectionStart;
      const currentValue = target.value;

      const newInput =
        currentValue.substring(0, currentCursorPosition) +
        formattedText +
        currentValue.substring(target.selectionEnd);

      setInput(newInput);

      setTimeout(() => {
        if (textFieldRef.current) {
          const newCursorPosition = currentCursorPosition + formattedText.length;
          textFieldRef.current.selectionStart = newCursorPosition;
          textFieldRef.current.selectionEnd = newCursorPosition;
          textFieldRef.current.scrollTop = textFieldRef.current.scrollHeight;
        }
      }, 0);
    } else {
      setTimeout(() => {
        if (textFieldRef.current) {
          textFieldRef.current.scrollTop = textFieldRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [setInput]);

  return (
    <TextField
      inputRef={textFieldRef}
      multiline
      minRows={1}
      maxRows={12}
      value={input}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
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
        }
      }}
    />
  );
}

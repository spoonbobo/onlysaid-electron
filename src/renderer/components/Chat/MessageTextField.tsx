import { useCallback, useRef, useState, useEffect } from "react";
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
  
  // Local state for immediate UI updates
  const [localInput, setLocalInput] = useState(input);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalInput(input);
  }, [input]);

  // Debounced update to store
  const debouncedSetInput = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setInput(value);
    }, 100); // 100ms debounce
  }, [setInput]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (localInput.trim()) {
        // Clear debounce and immediately sync before sending
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        setInput(localInput);
        onSend();
      }
    }
  }, [localInput, onSend, setInput]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalInput(newValue);
    debouncedSetInput(newValue);
  }, [debouncedSetInput]);

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

      setLocalInput(newInput);
      debouncedSetInput(newInput);

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
  }, [debouncedSetInput]);

  return (
    <TextField
      inputRef={textFieldRef}
      multiline
      minRows={1}
      maxRows={12}
      value={localInput}
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

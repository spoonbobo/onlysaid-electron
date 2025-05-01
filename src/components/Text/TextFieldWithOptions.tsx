import React, { useState } from "react";
import { TextField, InputAdornment, IconButton, Button, TextFieldProps } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

interface TextFieldWithOptionsProps extends Omit<TextFieldProps, 'type'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  isPassword?: boolean;
}

const TextFieldWithOptions: React.FC<TextFieldWithOptionsProps> = ({
  value,
  onChange,
  onClear,
  isPassword = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextField
      {...props}
      type={isPassword ? (showPassword ? "text" : "password") : "text"}
      value={value}
      onChange={onChange}
      slotProps={{
        ...props.slotProps,
        input: {
          ...(props.slotProps?.input || {}),
          endAdornment: (
            <InputAdornment position="end">
              {isPassword && (
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  size="small"
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              )}
              <Button
                onClick={onClear}
                disabled={!value}
                size="small"
                sx={{
                  minWidth: 'auto',
                  ml: 0.5,
                  px: 1,
                  fontSize: '0.75rem'
                }}
              >
                CLEAR
              </Button>
            </InputAdornment>
          )
        }
      }}
    />
  );
};

export default TextFieldWithOptions;

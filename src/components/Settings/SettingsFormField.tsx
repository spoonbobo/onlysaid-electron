import { Box, Typography, SxProps } from "@mui/material";

interface SettingsFormFieldProps {
  label?: React.ReactNode;
  children: React.ReactNode;
  sx?: SxProps;
}

function SettingsFormField({ label, children, sx }: SettingsFormFieldProps) {
  return (
    <Box sx={{ mb: 3, ...sx }}>
      {label && <Typography gutterBottom>{label}</Typography>}
      {children}
    </Box>
  );
}

export default SettingsFormField;
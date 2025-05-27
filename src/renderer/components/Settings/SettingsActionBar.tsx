import { Box, SxProps } from "@mui/material";

interface SettingsActionBarProps {
  children: React.ReactNode;
  sx?: SxProps;
}

function SettingsActionBar({ children, sx }: SettingsActionBarProps) {
  return (
    <Box sx={{ mt: 2, display: "flex", gap: 1, ...sx }}>
      {children}
    </Box>
  );
}

export default SettingsActionBar;
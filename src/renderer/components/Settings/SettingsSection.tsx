import { Paper, Typography, Box, SxProps } from "@mui/material";

interface SettingsSectionProps {
  title: React.ReactNode;
  titleColor?: string;
  children: React.ReactNode;
  sx?: SxProps;
}

function SettingsSection({ title, titleColor, children, sx }: SettingsSectionProps) {
  return (
    <Paper sx={{ p: 3, ...sx }}>
      <Typography variant="h6" sx={{ mb: 2, color: titleColor }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default SettingsSection;
import { Typography, List, Box, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

type MenuSectionProps = {
  title?: string;
  titleColor?: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

export default function MenuSection({ title, titleColor = "primary.main", children, sx }: MenuSectionProps) {
  return (
    <Box sx={sx}>
      {title && (
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 1,
            color: titleColor,
            fontSize: "0.95rem"
          }}
        >
          {title}
        </Typography>
      )}
      <List dense sx={{ mb: 1 }}>
        {children}
      </List>
    </Box>
  );
}
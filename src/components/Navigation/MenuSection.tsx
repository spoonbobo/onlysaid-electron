import { Typography, List, Box, SxProps, Theme, ListItemIcon } from "@mui/material";
import { ReactNode } from "react";

type MenuSectionProps = {
  title?: string;
  titleIcon?: ReactNode;
  titleColor?: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

export default function MenuSection({ title, titleIcon, titleColor = "primary.main", children, sx }: MenuSectionProps) {
  return (
    <Box sx={sx}>
      {title && (
        <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
          {titleIcon && (
            <ListItemIcon sx={{ minWidth: 30, mr: 0.75, color: titleColor }}>
              {titleIcon}
            </ListItemIcon>
          )}
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              color: titleColor,
              fontSize: "0.95rem"
            }}
          >
            {title}
          </Typography>
        </Box>
      )}
      <List dense sx={{ pt: title ? 0 : undefined, mb: 1 }}>
        {children}
      </List>
    </Box>
  );
}
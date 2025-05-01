import { ListItemButton, ListItemIcon, ListItemText, Typography, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

type MenuListItemProps = {
  icon?: ReactNode;
  label: React.ReactNode;
  isSelected: boolean;
  textColor?: string;
  onClick: () => void;
  endIcon?: ReactNode;
  sx?: SxProps<Theme>;
};

export default function MenuListItem({
  icon,
  label,
  isSelected,
  textColor = "text.primary",
  onClick,
  endIcon,
  sx
}: MenuListItemProps) {
  return (
    <ListItemButton
      sx={{
        py: 0.5,
        minHeight: 32,
        textAlign: "left",
        bgcolor: isSelected ? 'primary.selected' : undefined,
        borderRadius: 1,
        ...sx
      }}
      selected={isSelected}
      onClick={onClick}
    >
      {icon && (
        <ListItemIcon sx={{ minWidth: 36 }}>
          {icon}
        </ListItemIcon>
      )}
      <ListItemText
        primary={
          <Typography sx={{ fontSize: "0.85rem", fontWeight: 500, color: textColor }}>
            {label}
          </Typography>
        }
      />
      {endIcon}
    </ListItemButton>
  );
}
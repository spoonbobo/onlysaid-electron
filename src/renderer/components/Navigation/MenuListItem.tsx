import { ListItemButton, ListItemIcon, ListItemText, Typography, SxProps, Theme, Box } from "@mui/material";
import { ReactNode } from "react";

type MenuListItemProps = {
  leadingActionIcon?: ReactNode;
  icon?: ReactNode;
  label: React.ReactNode;
  isSelected: boolean;
  textColor?: string;
  onClick: () => void;
  onContextMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  endIcon?: ReactNode;
  sx?: SxProps<Theme>;
};

export default function MenuListItem({
  leadingActionIcon,
  icon,
  label,
  isSelected,
  textColor = "text.primary",
  onClick,
  onContextMenu,
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
        display: 'flex',
        alignItems: 'center',
        px: 1,
        ...sx
      }}
      selected={isSelected}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {leadingActionIcon && (
        <ListItemIcon sx={{ minWidth: 24, p: 0, m: 0, mr: 0.25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {leadingActionIcon}
        </ListItemIcon>
      )}
      {icon && (
        <ListItemIcon sx={{ minWidth: 30, mr: 0.5, ml: leadingActionIcon ? 0 : 0.25 }}>
          {icon}
        </ListItemIcon>
      )}
      <ListItemText
        primary={
          <Typography component="div" sx={{ fontSize: "0.85rem", fontWeight: 500, color: textColor }}>
            {label}
          </Typography>
        }
        sx={{ my: 0, flexGrow: 1, ml: (!leadingActionIcon && !icon) ? 0.5 : 0 }}
      />
      {endIcon && (
        <Box component="span" sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>{endIcon}</Box>
      )}
    </ListItemButton>
  );
}
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

export interface HelpItem {
  title: string;
  description: string;
  shortcut?: string;
}

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  helpItems: HelpItem[];
  title: string;
}

export default function HelpDialog({ open, onClose, helpItems, title }: HelpDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <HelpOutlineIcon sx={{ mr: 1 }} />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <List>
          {helpItems.map((item, index) => (
            <Box key={index}>
              <ListItem>
                <ListItemIcon>
                  <InfoIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  }
                />
                {item.shortcut && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      bgcolor: 'action.hover',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1
                    }}
                  >
                    <KeyboardIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="caption" fontFamily="monospace">
                      {item.shortcut}
                    </Typography>
                  </Box>
                )}
              </ListItem>
              {index < helpItems.length - 1 && <Divider variant="inset" component="li" />}
            </Box>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

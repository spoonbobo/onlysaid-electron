import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { useIntl } from 'react-intl';

// Define message IDs for translatable strings
const messages = {
  closeButton: {
    id: 'common.close', // Assuming a common key for 'Close'
    defaultMessage: 'Close',
  },
};

export interface HelpItem {
  title: string;
  text: string;
}

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
  helpItems: HelpItem[];
  title: string;
}

const HelpDialog: React.FC<HelpDialogProps> = ({
  open,
  onClose,
  helpItems,
  title,
}) => {
  const intl = useIntl();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <List>
          {helpItems.map((item, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={
                    <Typography variant="h6" component="div">
                      {item.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {item.text}
                    </Typography>
                  }
                />
              </ListItem>
              {index < helpItems.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{intl.formatMessage(messages.closeButton)}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
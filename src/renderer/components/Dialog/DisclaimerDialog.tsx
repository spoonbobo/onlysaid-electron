import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert
} from "@mui/material";
import { 
  Analytics,
  Security,
  VpnKey,
  Warning
} from "@mui/icons-material";
import { useIntl } from "react-intl";

interface DisclaimerDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

function DisclaimerDialog({ open, onAccept, onDecline }: DisclaimerDialogProps) {
  const intl = useIntl();

  return (
    <Dialog 
      open={open} 
      onClose={onDecline}
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          {intl.formatMessage({ id: 'disclaimer.title' })}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          {intl.formatMessage({ id: 'disclaimer.welcome' })}
        </Alert>

        <Typography variant="body1" sx={{ mb: 2 }}>
          {intl.formatMessage({ id: 'disclaimer.description' })}
        </Typography>

        <List>
          <ListItem>
            <ListItemIcon>
              <Analytics color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={intl.formatMessage({ id: 'disclaimer.analytics.title' })}
              secondary={intl.formatMessage({ id: 'disclaimer.analytics.description' })}
            />
          </ListItem>

          <Divider variant="inset" component="li" />

          <ListItem>
            <ListItemIcon>
              <Security color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={intl.formatMessage({ id: 'disclaimer.p2p.title' })}
              secondary={intl.formatMessage({ id: 'disclaimer.p2p.description' })}
            />
          </ListItem>

          <Divider variant="inset" component="li" />

          <ListItem>
            <ListItemIcon>
              <VpnKey color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={intl.formatMessage({ id: 'disclaimer.credentials.title' })}
              secondary={intl.formatMessage({ id: 'disclaimer.credentials.description' })}
            />
          </ListItem>
        </List>

        <Alert severity="warning" sx={{ mt: 3 }}>
          {intl.formatMessage({ id: 'disclaimer.agreement' })}
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDecline} color="inherit">
          {intl.formatMessage({ id: 'disclaimer.decline' })}
        </Button>
        <Button onClick={onAccept} variant="contained" color="primary">
          {intl.formatMessage({ id: 'disclaimer.accept' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DisclaimerDialog; 
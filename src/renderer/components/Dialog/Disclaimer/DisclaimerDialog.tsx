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
  Warning,
  Close
} from "@mui/icons-material";
import { useIntl } from "react-intl";

interface DisclaimerDialogProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isNewUser?: boolean;
}

function DisclaimerDialog({ open, onAccept, onDecline, isNewUser = true }: DisclaimerDialogProps) {
  const intl = useIntl();

  const handleClose = isNewUser ? onDecline : onDecline;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={isNewUser}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          {intl.formatMessage({ id: 'disclaimer.title' })}
        </Box>
      </DialogTitle>
      <DialogContent>
        {isNewUser && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {intl.formatMessage({ id: 'disclaimer.welcome' })}
          </Alert>
        )}

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

        {isNewUser && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            {intl.formatMessage({ id: 'disclaimer.agreement' })}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {isNewUser ? (
          <>
            <Button onClick={onDecline} color="inherit">
              {intl.formatMessage({ id: 'disclaimer.decline' })}
            </Button>
            <Button onClick={onAccept} variant="contained" color="primary">
              {intl.formatMessage({ id: 'disclaimer.accept' })}
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} variant="contained" color="primary" startIcon={<Close />}>
            {intl.formatMessage({ id: 'common.close' })}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default DisclaimerDialog; 
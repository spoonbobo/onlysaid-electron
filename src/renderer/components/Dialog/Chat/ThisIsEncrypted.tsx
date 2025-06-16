import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { IChatMessage } from '@/../../types/Chat/Message';
import { FormattedMessage } from 'react-intl';

interface ThisIsEncryptedProps {
  open: boolean;
  onClose: () => void;
  message: IChatMessage | null;
}

const ThisIsEncrypted: React.FC<ThisIsEncryptedProps> = ({ open, onClose, message }) => {
  const isEncrypted = message?.is_encrypted;
  const encryptionDetails = message?.encrypted_text;

  return (
    <Dialog 
      open={open && message !== null}
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {isEncrypted ? (
            <LockIcon color="success" />
          ) : (
            <LockOpenIcon color="error" />
          )}
          <FormattedMessage 
            id={isEncrypted ? "encryption.dialog.title" : "encryption.dialog.titleUnencrypted"} 
            defaultMessage={isEncrypted ? "Message Encryption Details" : "Message Not Encrypted"} 
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          <FormattedMessage 
            id={isEncrypted ? "encryption.dialog.description" : "encryption.dialog.descriptionUnencrypted"}
            defaultMessage={
              isEncrypted 
                ? "This message is protected with end-to-end encryption. Only you and the intended recipients can read it."
                : "This message is not encrypted and can be read by anyone with access to the server."
            }
          />
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Box display="flex" flexDirection="column" gap={2}>
          {isEncrypted ? (
            <>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  <FormattedMessage id="encryption.algorithm" defaultMessage="Encryption Algorithm" />
                </Typography>
                <Chip 
                  label={encryptionDetails?.algorithm || 'AES-GCM-256'} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
              
              {encryptionDetails?.keyVersion && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    <FormattedMessage id="encryption.keyVersion" defaultMessage="Key Version" />
                  </Typography>
                  <Typography variant="body2">
                    {encryptionDetails.keyVersion}
                  </Typography>
                </Box>
              )}
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  <FormattedMessage id="encryption.status" defaultMessage="Encryption Status" />
                </Typography>
                <Chip 
                  label={<FormattedMessage id="encryption.status.encrypted" defaultMessage="Encrypted" />}
                  size="small" 
                  color="success" 
                  icon={<LockIcon fontSize="small" />}
                />
              </Box>
            </>
          ) : (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                <FormattedMessage id="encryption.status" defaultMessage="Encryption Status" />
              </Typography>
              <Chip 
                label={<FormattedMessage id="encryption.status.unencrypted" defaultMessage="Not Encrypted" />}
                size="small" 
                color="error" 
                icon={<LockOpenIcon fontSize="small" />}
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          <FormattedMessage id="common.close" defaultMessage="Close" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ThisIsEncrypted;

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Typography, Box, Avatar } from '@mui/material';
import { FormattedMessage } from 'react-intl';
import { IChatMessage } from '@/../../types/Chat/Message';
import { useChatStore } from '@/stores/Chat/ChatStore';

interface DeleteMessageDialogProps {
  open: boolean;
  onClose: () => void;
  message: IChatMessage | null;
  chatId: string;
}

const DeleteMessageDialog: React.FC<DeleteMessageDialogProps> = ({
  open,
  onClose,
  message,
  chatId
}) => {
  const { deleteMessage } = useChatStore();

  const handleDeleteForYou = async () => {
    if (message && chatId) {
      await deleteMessage(chatId, message.id);
      onClose();
    }
  };

  const handleDeleteForEveryone = () => {
    // Dummy function - disabled for now
    console.log('Delete for everyone clicked - not implemented');
  };

  const getTruncatedMessageText = (text: string | undefined): string => {
    if (!text) {
      return '';
    }
    const lines = text.split('\n');
    if (lines.length > 10) {
      return lines.slice(0, 10).join('\n') + '...';
    }
    return text;
  };

  return (
    <Dialog
      open={open && message !== null}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{
        appear: true
      }}
    >
      {message && (
        <>
          <DialogTitle>
            <FormattedMessage id="chat.deleteMessage" defaultMessage="Delete Message" />
          </DialogTitle>
          <DialogContent>
            <DialogContentText mb={3}>
              <FormattedMessage id="chat.deleteMessageConfirmation" defaultMessage="Are you sure you want to delete this message?" />
            </DialogContentText>

            {/* Message preview */}
            <Box sx={{ display: 'flex', mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              {message.sender_object?.avatar && (
                <Avatar
                  src={message.sender_object.avatar}
                  alt={message.sender_object.username}
                  sx={{ mr: 2, width: 40, height: 40 }}
                />
              )}
              <Box>
                <Typography variant="subtitle2" color="text.primary">
                  {message.sender_object?.username || 'Unknown user'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {getTruncatedMessageText(message.text)}
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} color="inherit">
              <FormattedMessage id="common.close" defaultMessage="Close" />
            </Button>
            <Button
              onClick={handleDeleteForEveryone}
              color="error"
              variant="outlined"
              disabled={true}
            >
              <FormattedMessage id="chat.deleteForEveryone" defaultMessage="Delete for everyone" />
            </Button>
            <Button
              onClick={handleDeleteForYou}
              color="error"
              variant="contained"
            >
              <FormattedMessage id="chat.deleteForYou" defaultMessage="Delete for you" />
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default DeleteMessageDialog;

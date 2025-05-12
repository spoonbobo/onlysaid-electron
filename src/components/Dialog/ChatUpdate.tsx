import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  Typography
} from '@mui/material';
import { IChatRoom } from '@/../../types/Chat/Chatroom';
import { useChatStore } from '@/stores/Chat/ChatStore';
import { FormattedMessage } from 'react-intl';
import { useUserStore } from '@/stores/User/UserStore';

interface ChatUpdateProps {
  open: boolean;
  onClose: () => void;
  chat: IChatRoom | null;
}

const ChatUpdate: React.FC<ChatUpdateProps> = ({ open, onClose, chat }) => {
  const user = useUserStore((state) => state.user);
  const { updateChat } = useChatStore();
  const [name, setName] = useState('');
  const isLocal = user?.id ? false : true;

  // Update name state when room changes or dialog opens
  useEffect(() => {
    if (open && chat) {
      setName(chat.name || '');
    }
  }, [open, chat]);

  const handleSave = async () => {
    if (!chat || !name.trim()) return;

    try {
      await updateChat(chat.id, { name: name.trim() }, isLocal);
      onClose();
    } catch (error) {
      console.error('Failed to update chat:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <FormattedMessage id="chat.renameChat" defaultMessage="Rename Chat" />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {chat && (
            <Typography variant="body2" color="text.secondary">
              <FormattedMessage id="chat.originalName" defaultMessage="Original name" />: {chat.name}
            </Typography>
          )}
          <TextField
            autoFocus
            label={<FormattedMessage id="chat.chatName" defaultMessage="Chat Name" />}
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim() || name === chat?.name}
        >
          <FormattedMessage id="common.save" defaultMessage="Save" />
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatUpdate;

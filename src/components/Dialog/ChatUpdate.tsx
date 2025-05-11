import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack
} from '@mui/material';
import { IChatRoom } from '@/../../types/Chat/Chatroom';
import { useChatStore } from '@/stores/Chat/ChatStore';

interface ChatUpdateProps {
  open: boolean;
  onClose: () => void;
  chat: IChatRoom | null;
}

const ChatUpdate: React.FC<ChatUpdateProps> = ({ open, onClose, chat }) => {
  const { updateChat } = useChatStore();
  const [name, setName] = useState('');

  // Update name state when room changes or dialog opens
  useEffect(() => {
    if (open && chat) {
      setName(chat.name || '');
    }
  }, [open, chat]);

  const handleSave = async () => {
    if (!chat || !name.trim()) return;

    try {
      await updateChat(chat.id, { name: name.trim() });
      onClose();
    } catch (error) {
      console.error('Failed to update chat:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Rename Chat</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label="Chat Name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim() || name === chat?.name}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatUpdate;

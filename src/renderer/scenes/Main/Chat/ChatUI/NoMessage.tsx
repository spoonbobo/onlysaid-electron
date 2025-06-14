import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { ChatBubbleOutline as ChatIcon } from '@mui/icons-material';

interface NoMessageProps {
  type?: 'no-chat' | 'no-messages';
}

const NoMessage: React.FC<NoMessageProps> = ({ type = 'no-messages' }) => {
  if (type === 'no-chat') {
    return (
      <Stack
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{ height: '100%', width: '100%', gap: 1 }}
      >
        <ChatIcon 
          sx={{ 
            fontSize: 48, 
            color: 'text.disabled',
            mb: 1
          }} 
        />
        <Typography 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 500, 
            color: "text.secondary" 
          }}
        >
          # No chat selected
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: "text.disabled",
            textAlign: 'center',
            maxWidth: 300
          }}
        >
          Select a chat from the sidebar to start viewing messages
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack
      direction="column"
      alignItems="center"
      justifyContent="center"
      sx={{ height: '100%', width: '100%', gap: 1 }}
    >
      <ChatIcon 
        sx={{ 
          fontSize: 48, 
          color: 'text.disabled',
          mb: 1
        }} 
      />
      <Typography 
        variant="subtitle1" 
        sx={{ 
          fontWeight: 500, 
          color: "text.secondary" 
        }}
      >
        No messages yet
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          color: "text.disabled",
          textAlign: 'center',
          maxWidth: 300
        }}
      >
        Start a conversation by sending a message below
      </Typography>
    </Stack>
  );
};

export default NoMessage;

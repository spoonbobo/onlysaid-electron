import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { ChatBubbleOutline as ChatIcon } from '@mui/icons-material';
import { FormattedMessage } from 'react-intl';

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
          <FormattedMessage id="chat.noChatSelected" />
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: "text.disabled",
            textAlign: 'center',
            maxWidth: 300
          }}
        >
          <FormattedMessage id="chat.selectChatFromSidebar" />
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
        <FormattedMessage id="chat.noMessagesYet" />
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          color: "text.disabled",
          textAlign: 'center',
          maxWidth: 300
        }}
      >
        <FormattedMessage id="chat.startConversation" />
      </Typography>
    </Stack>
  );
};

export default NoMessage;

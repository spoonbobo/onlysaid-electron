import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CardActions, Button, Avatar, Chip, Divider, CircularProgress } from '@mui/material';
import { Mail, Business, Check, Close, Refresh } from '@mui/icons-material';

import { useWorkspaceStore } from '@/renderer/stores/Workspace/WorkspaceStore';
import { IWorkspaceInvitation } from '@/../../types/Workspace/Workspace';
import { useIntl } from 'react-intl';
import Invitation from './DashboardItems/Invitation';
const HomePage = () => {
  const intl = useIntl();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        {intl.formatMessage({ id: 'homepage.title', defaultMessage: 'Home Page' })}
      </Typography>

      {/* Workspace Invitations Dashboard */}
      <Invitation />
    </Box>
  );
};

export default HomePage;

import { useEffect, useState } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { useIntl } from 'react-intl';

// Dashboard Components
import Welcome from './DashboardItems/Welcome';
import WorkspaceContainer from './DashboardItems/WorkspaceContainer';

// Existing Components
import Invitation from './DashboardItems/Invitation';
import Join from './DashboardItems/Join';

const HomePage = () => {
  const intl = useIntl();

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      p: 3,
      bgcolor: 'background.default',
      overflow: 'auto'
    }}>
      {/* Welcome Section */}
      <Welcome />

      {/* Main Dashboard: Workspaces (left) + Calendar & Tasks (right) */}
      <WorkspaceContainer />

      {/* Divider between dashboard and existing components */}
      <Divider sx={{ my: 4, borderColor: 'divider' }} />

      {/* Existing Components */}
      {/* Workspace Invitations Dashboard */}
      <Invitation />

      {/* Divider between sections */}
      <Divider sx={{ my: 4, borderColor: 'divider' }} />

      {/* Join Requests Dashboard */}
      <Join />
    </Box>
  );
};

export default HomePage;

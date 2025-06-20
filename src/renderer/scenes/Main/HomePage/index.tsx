import { useEffect, useState } from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { useIntl } from 'react-intl';

// User Store
import { useUserStore } from '@/renderer/stores/User/UserStore';

// Dashboard Components
import Welcome from './DashboardItems/Welcome';
import WorkspaceContainer from './DashboardItems/WorkspaceContainer';

// Existing Components
import Invitation from './DashboardItems/Invitation';
import Join from './DashboardItems/Join';

// Guest Component
import GuestHomePage from './Guest';

const HomePage = () => {
  const intl = useIntl();
  const { user } = useUserStore();

  // If user is not logged in, show the guest homepage
  if (!user) {
    return <GuestHomePage />;
  }

  // If user is logged in, show the authenticated homepage
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

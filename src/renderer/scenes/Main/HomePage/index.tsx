import { useEffect, useState } from 'react';
import { Box, Typography, Divider } from '@mui/material';

import { useIntl } from 'react-intl';
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
      bgcolor: 'background.default'
    }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, color: 'text.primary' }}>
        {intl.formatMessage({ id: 'homepage.title', defaultMessage: 'Home Page' })}
      </Typography>

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

import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Stack,
  Container,
  useTheme,
  alpha
} from '@mui/material';
import { useIntl } from 'react-intl';
import { Login, AutoAwesome, Groups, WorkspacePremium } from '@mui/icons-material';
import { useUserStore } from '@/renderer/stores/User/UserStore';

const GuestHomePage = () => {
  const intl = useIntl();
  const theme = useTheme();
  const { signIn, isLoading } = useUserStore();

  const handleSignIn = () => {
    signIn();
  };

  return (
    <Container maxWidth="lg" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        {/* Main Welcome Section */}
        <Paper
          elevation={0}
          sx={{
            p: 6,
            mb: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }}
        >
          <Stack spacing={4} alignItems="center">
            {/* Welcome Text */}
            <Stack spacing={2} alignItems="center">
              <Typography
                variant="h3"
                component="h1"
                fontWeight="bold"
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: { xs: '2rem', md: '3rem' }
                }}
              >
                {intl.formatMessage({ id: 'app.welcome' })}
              </Typography>

              <Typography
                variant="h6"
                color="text.secondary"
                sx={{
                  maxWidth: 600,
                  lineHeight: 1.6,
                  fontSize: { xs: '1rem', md: '1.25rem' }
                }}
              >
                {intl.formatMessage({ id: 'guest.subtitle' })}
              </Typography>

              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  maxWidth: 500,
                  lineHeight: 1.5,
                  fontSize: '1rem'
                }}
              >
                {intl.formatMessage({ id: 'guest.description' })}
              </Typography>
            </Stack>

            {/* Sign In Button */}
            <Button
              variant="contained"
              size="large"
              onClick={handleSignIn}
              disabled={isLoading}
              startIcon={<Login />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  boxShadow: `0 6px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
                  transform: 'translateY(-2px)'
                },
                '&:disabled': {
                  opacity: 0.7
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {isLoading 
                ? intl.formatMessage({ id: 'settings.signingIn' })
                : intl.formatMessage({ id: 'guest.signInButton' })
              }
            </Button>

            {/* Sign In Message */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 500, fontSize: '0.9rem' }}
            >
              {intl.formatMessage({ id: 'guest.signInMessage' })}
            </Typography>
          </Stack>
        </Paper>

        {/* Feature Highlights */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          justifyContent="center"
          sx={{ maxWidth: 900, mx: 'auto' }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 3,
              flex: 1,
              textAlign: 'center',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2,
              '&:hover': {
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <AutoAwesome sx={{ fontSize: 32, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {intl.formatMessage({ id: 'guest.localAI.title' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: 'guest.localAI.description' })}
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              flex: 1,
              textAlign: 'center',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2,
              '&:hover': {
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <Groups sx={{ fontSize: 32, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {intl.formatMessage({ id: 'guest.teamWorkspaces.title' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: 'guest.teamWorkspaces.description' })}
            </Typography>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              flex: 1,
              textAlign: 'center',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 2,
              '&:hover': {
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <WorkspacePremium sx={{ fontSize: 32, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {intl.formatMessage({ id: 'guest.enterpriseFeatures.title' })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: 'guest.enterpriseFeatures.description' })}
            </Typography>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
};

export default GuestHomePage;

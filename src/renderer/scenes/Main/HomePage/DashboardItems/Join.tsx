import { useEffect, useState } from 'react';
import { Box, Typography, Card, Button, Avatar, Chip, CircularProgress, Stack } from '@mui/material';
import { HourglassEmpty, Business, Check, Refresh } from '@mui/icons-material';

import { useWorkspaceStore } from '@/renderer/stores/Workspace/WorkspaceStore';
import { IWorkspaceJoin } from '@/../../types/Workspace/Workspace';
import { useIntl } from 'react-intl';

const Join = () => {
  const intl = useIntl();
  const [joinRequests, setJoinRequests] = useState<IWorkspaceJoin[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { getUserJoinRequests } = useWorkspaceStore();

  const fetchJoinRequests = async () => {
    setIsLoading(true);
    try {
      const pendingJoinRequests = await getUserJoinRequests('pending');
      setJoinRequests(pendingJoinRequests);
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'active':
        return 'success';
      case 'left':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'pending':
        return intl.formatMessage({ id: 'homepage.joinRequests.status.pending', defaultMessage: 'Pending' });
      case 'active':
        return intl.formatMessage({ id: 'homepage.joinRequests.status.approved', defaultMessage: 'Approved' });
      case 'left':
        return intl.formatMessage({ id: 'homepage.joinRequests.status.rejected', defaultMessage: 'Rejected' });
      default:
        return status;
    }
  };

  const getActionButton = (joinRequest: IWorkspaceJoin) => {
    switch (joinRequest.status) {
      case 'active':
        return (
          <Button
            variant="contained"
            size="small"
            startIcon={<Check />}
            onClick={() => window.location.reload()}
            sx={{
              minWidth: 'auto',
              bgcolor: 'success.main',
              '&:hover': {
                bgcolor: 'success.dark'
              }
            }}
          >
            {intl.formatMessage({ id: 'homepage.joinRequests.accessWorkspace', defaultMessage: 'Access Workspace' })}
          </Button>
        );
      case 'left':
        return (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={() => console.log('Request to join again:', joinRequest.workspace_id)}
            sx={{
              minWidth: 'auto',
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                bgcolor: 'primary.main',
                color: 'primary.contrastText'
              }
            }}
          >
            {intl.formatMessage({ id: 'homepage.joinRequests.tryAgain', defaultMessage: 'Try Again' })}
          </Button>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    fetchJoinRequests();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h6" color="text.primary">
            {intl.formatMessage({ id: 'homepage.joinRequests.title', defaultMessage: 'Join Requests' })}
          </Typography>
        </Stack>
        <Card
          variant="outlined"
          sx={{
            p: 3,
            bgcolor: 'background.paper',
            borderColor: 'divider'
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: 'homepage.joinRequests.loading', defaultMessage: 'Loading join requests...' })}
            </Typography>
          </Stack>
        </Card>
      </Box>
    );
  }

  // Empty state
  if (joinRequests.length === 0) {
    return (
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h6" color="text.primary">
            {intl.formatMessage({ id: 'homepage.joinRequests.title', defaultMessage: 'Join Requests' })}
          </Typography>
          <Button
            variant="text"
            size="small"
            startIcon={<Refresh />}
            onClick={fetchJoinRequests}
            disabled={isLoading}
            sx={{ color: 'text.secondary' }}
          >
            {intl.formatMessage({ id: 'homepage.joinRequests.refresh', defaultMessage: 'Refresh' })}
          </Button>
        </Stack>
        <Card
          variant="outlined"
          sx={{
            p: 4,
            bgcolor: 'background.paper',
            borderColor: 'divider'
          }}
        >
          <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
            <HourglassEmpty sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary" align="center">
              {intl.formatMessage({ id: 'homepage.joinRequests.empty.subtitle', defaultMessage: 'You haven\'t requested to join any workspaces yet.' })}
            </Typography>
          </Stack>
        </Card>
      </Box>
    );
  }

  // Join requests list
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h6" color="text.primary">
          {intl.formatMessage({ id: 'homepage.joinRequests.title', defaultMessage: 'Join Requests' })}
        </Typography>
        <Chip
          label={joinRequests.length}
          size="small"
          color="primary"
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText'
          }}
        />
        <Button
          variant="text"
          size="small"
          startIcon={<Refresh />}
          onClick={fetchJoinRequests}
          disabled={isLoading}
          sx={{ color: 'text.secondary' }}
        >
          {intl.formatMessage({ id: 'homepage.joinRequests.refresh', defaultMessage: 'Refresh' })}
        </Button>
      </Stack>

      <Stack spacing={2}>
        {joinRequests.map((joinRequest) => (
          <Card
            key={joinRequest.id}
            variant="outlined"
            sx={{
              p: 2.5,
              bgcolor: 'background.paper',
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover'
              }
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                                        src="/default-workspace.png"
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: 'background.default'
                }}
              >
                <Business sx={{ color: 'text.secondary' }} />
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                  {joinRequest.workspace_id}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {intl.formatMessage({ id: 'homepage.joinRequests.requestSent', defaultMessage: 'Join request sent' })}
                  </Typography>
                  <Chip
                    label={getStatusTranslation(joinRequest.status)}
                    color={getStatusColor(joinRequest.status)}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      height: 20
                    }}
                  />
                </Stack>
                <Typography variant="caption" color="text.disabled">
                  {new Date(joinRequest.created_at).toLocaleDateString()}
                </Typography>
              </Box>

              {getActionButton(joinRequest)}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default Join;

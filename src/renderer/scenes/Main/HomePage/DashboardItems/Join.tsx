import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CardActions, Button, Avatar, Chip, Divider, CircularProgress } from '@mui/material';
import { HourglassEmpty, Business, Check, Close, Refresh, Cancel } from '@mui/icons-material';

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

  useEffect(() => {
    fetchJoinRequests();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ mt: 2 }}>
        <Card
          variant="outlined"
          sx={{
            p: 4,
            maxWidth: 600,
            width: 'fit-content',
            minHeight: 200
          }}
        >
          <CardContent sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            minHeight: 120
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body1" color="text.secondary">
                {intl.formatMessage({ id: 'homepage.joinRequests.loading', defaultMessage: 'Loading join requests...' })}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: 'homepage.joinRequests.loading.subtitle', defaultMessage: 'Please wait while we fetch your workspace join requests.' })}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Empty state
  if (joinRequests.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Card
          variant="outlined"
          sx={{
            p: 4,
            maxWidth: 600,
            width: 'fit-content'
          }}
        >
          <CardContent sx={{ textAlign: 'left' }}>
            <HourglassEmpty sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {intl.formatMessage({ id: 'homepage.joinRequests.empty.title', defaultMessage: 'No Pending Join Requests' })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {intl.formatMessage({ id: 'homepage.joinRequests.empty.subtitle', defaultMessage: 'You haven\'t requested to join any workspaces yet.' })}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchJoinRequests}
              disabled={isLoading}
              size="small"
            >
              {intl.formatMessage({ id: 'homepage.joinRequests.checkAgain', defaultMessage: 'Check Again' })}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Join requests list
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5">
          {intl.formatMessage({ id: 'homepage.joinRequests.title', defaultMessage: 'Join Requests' })}
        </Typography>
        <Chip
          label={joinRequests.length}
          color="primary"
          size="small"
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh />}
          onClick={fetchJoinRequests}
          disabled={isLoading}
        >
          {intl.formatMessage({ id: 'homepage.joinRequests.refresh', defaultMessage: 'Refresh' })}
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 2,
          maxHeight: '70vh',
          overflowY: 'auto'
        }}
      >
        {joinRequests.map((joinRequest) => (
          <Card
            key={joinRequest.id}
            variant="outlined"
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                <Avatar
                  src="/workspace-icon.png"
                  sx={{ width: 56, height: 56 }}
                >
                  <Business />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" gutterBottom>
                    {joinRequest.workspace_id}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <HourglassEmpty fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {intl.formatMessage({ id: 'homepage.joinRequests.requestSent', defaultMessage: 'Join request sent' })}
                    </Typography>
                    <Chip
                      label={getStatusTranslation(joinRequest.status)}
                      color={getStatusColor(joinRequest.status)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage(
                      { id: 'homepage.joinRequests.requestedAt', defaultMessage: 'Requested {date}' },
                      { date: new Date(joinRequest.created_at).toLocaleDateString() }
                    )}
                  </Typography>
                </Box>
              </Box>

              {joinRequest.status === 'pending' && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="warning.dark">
                    {intl.formatMessage({
                      id: 'homepage.joinRequests.pendingNote',
                      defaultMessage: 'Your request is waiting for admin approval.'
                    })}
                  </Typography>
                </Box>
              )}

              {joinRequest.status === 'active' && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="success.dark">
                    {intl.formatMessage({
                      id: 'homepage.joinRequests.approvedNote',
                      defaultMessage: 'Your request has been approved! You can now access this workspace.'
                    })}
                  </Typography>
                </Box>
              )}

              {joinRequest.status === 'left' && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="error.dark">
                    {intl.formatMessage({
                      id: 'homepage.joinRequests.rejectedNote',
                      defaultMessage: 'Your request was declined by workspace administrators.'
                    })}
                  </Typography>
                </Box>
              )}
            </CardContent>

            <Divider />

            <CardActions sx={{ p: 2, justifyContent: 'flex-end', gap: 1 }}>
              {joinRequest.status === 'pending' && (
                <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
                  {intl.formatMessage({
                    id: 'homepage.joinRequests.waitingApproval',
                    defaultMessage: 'Waiting for approval...'
                  })}
                </Typography>
              )}

              {joinRequest.status === 'active' && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Check />}
                  onClick={() => {
                    // Navigate to workspace or refresh workspace list
                    window.location.reload();
                  }}
                >
                  {intl.formatMessage({ id: 'homepage.joinRequests.accessWorkspace', defaultMessage: 'Access Workspace' })}
                </Button>
              )}

              {joinRequest.status === 'left' && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Refresh />}
                  onClick={() => {
                    // Could implement retry logic here
                    console.log('Request to join again:', joinRequest.workspace_id);
                  }}
                >
                  {intl.formatMessage({ id: 'homepage.joinRequests.tryAgain', defaultMessage: 'Try Again' })}
                </Button>
              )}
            </CardActions>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default Join;

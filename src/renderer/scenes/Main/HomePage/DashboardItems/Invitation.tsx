import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, CardActions, Button, Avatar, Chip, Divider, CircularProgress } from '@mui/material';
import { Mail, Business, Check, Close, Refresh } from '@mui/icons-material';

import { useWorkspaceStore } from '@/renderer/stores/Workspace/WorkspaceStore';
import { IWorkspaceInvitation } from '@/../../types/Workspace/Workspace';
import { useIntl } from 'react-intl';
import { getUserFromStore } from '@/utils/user';

const Invitation = () => {
  const intl = useIntl();
  const [invitations, setInvitations] = useState<IWorkspaceInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { getUserInvitations, updateInvitation, getWorkspace } = useWorkspaceStore();

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const pendingInvitations = await getUserInvitations('pending');
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvitationResponse = async (invitation: IWorkspaceInvitation, status: 'accepted' | 'declined') => {
    try {
      await updateInvitation(invitation.workspace_id, invitation.id, status);
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));

      // If invitation was accepted, refetch user's workspaces to include the new workspace
      if (status === 'accepted') {
        const currentUser = getUserFromStore();
        if (currentUser?.id) {
          await getWorkspace(currentUser.id);
        }
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
    }
  };

  useEffect(() => {
    fetchInvitations();
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
                {intl.formatMessage({ id: 'homepage.invitations.loading', defaultMessage: 'Loading invitations...' })}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {intl.formatMessage({ id: 'homepage.invitations.loading.subtitle', defaultMessage: 'Please wait while we fetch your workspace invitations.' })}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Empty state
  if (invitations.length === 0) {
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
            <Mail sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {intl.formatMessage({ id: 'homepage.invitations.empty.title', defaultMessage: 'No Pending Invitations' })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {intl.formatMessage({ id: 'homepage.invitations.empty.subtitle', defaultMessage: 'You\'re all caught up! No workspace invitations waiting for your response.' })}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchInvitations}
              disabled={isLoading}
              size="small"
            >
              {intl.formatMessage({ id: 'homepage.invitations.checkAgain', defaultMessage: 'Check Again' })}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Invitations list
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5">
          {intl.formatMessage({ id: 'homepage.invitations.title', defaultMessage: 'Workspace Invitations' })}
        </Typography>
        <Chip
          label={invitations.length}
          color="primary"
          size="small"
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh />}
          onClick={fetchInvitations}
          disabled={isLoading}
        >
          {intl.formatMessage({ id: 'homepage.invitations.refresh', defaultMessage: 'Refresh' })}
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
        {invitations.map((invitation) => (
          <Card
            key={invitation.id}
            variant="outlined"
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                <Avatar
                  src={invitation.workspace_image || '/workspace-icon.png'}
                  sx={{ width: 56, height: 56 }}
                >
                  <Business />
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" gutterBottom>
                    {invitation.workspace_name || 'Unknown Workspace'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Mail fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {intl.formatMessage(
                        { id: 'homepage.invitations.invitedBy', defaultMessage: 'Invited by {inviter}' },
                        { inviter: invitation.inviter_username || 'Unknown User' }
                      )}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage(
                      { id: 'homepage.invitations.receivedAt', defaultMessage: 'Received {date}' },
                      { date: new Date(invitation.created_at).toLocaleDateString() }
                    )}
                  </Typography>
                </Box>
              </Box>
            </CardContent>

            <Divider />

            <CardActions sx={{ p: 2, justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Close />}
                onClick={() => handleInvitationResponse(invitation, 'declined')}
              >
                {intl.formatMessage({ id: 'homepage.invitations.decline', defaultMessage: 'Decline' })}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Check />}
                onClick={() => handleInvitationResponse(invitation, 'accepted')}
              >
                {intl.formatMessage({ id: 'homepage.invitations.accept', defaultMessage: 'Accept' })}
              </Button>
            </CardActions>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default Invitation;
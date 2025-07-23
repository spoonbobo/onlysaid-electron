import { useEffect, useState } from 'react';
import { Box, Typography, Card, Button, Avatar, Chip, CircularProgress, Stack } from '@mui/material';
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
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h6" color="text.primary">
            {intl.formatMessage({ id: 'homepage.invitations.title', defaultMessage: 'Workspace Invitations' })}
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
              {intl.formatMessage({ id: 'homepage.invitations.loading', defaultMessage: 'Loading invitations...' })}
            </Typography>
          </Stack>
        </Card>
      </Box>
    );
  }

  // Empty state
  if (invitations.length === 0) {
    return (
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Typography variant="h6" color="text.primary">
            {intl.formatMessage({ id: 'homepage.invitations.title', defaultMessage: 'Workspace Invitations' })}
          </Typography>
          <Button
            variant="text"
            size="small"
            startIcon={<Refresh />}
            onClick={fetchInvitations}
            disabled={isLoading}
            sx={{ color: 'text.secondary' }}
          >
            {intl.formatMessage({ id: 'homepage.invitations.refresh', defaultMessage: 'Refresh' })}
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
            <Mail sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary" align="center">
              {intl.formatMessage({ id: 'homepage.invitations.empty.subtitle', defaultMessage: 'No workspace invitations waiting for your response.' })}
            </Typography>
          </Stack>
        </Card>
      </Box>
    );
  }

  // Invitations list
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h6" color="text.primary">
          {intl.formatMessage({ id: 'homepage.invitations.title', defaultMessage: 'Workspace Invitations' })}
        </Typography>
        <Chip
          label={invitations.length}
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
          onClick={fetchInvitations}
          disabled={isLoading}
          sx={{ color: 'text.secondary' }}
        >
          {intl.formatMessage({ id: 'homepage.invitations.refresh', defaultMessage: 'Refresh' })}
        </Button>
      </Stack>

      <Stack spacing={2}>
        {invitations.map((invitation) => (
          <Card
            key={invitation.id}
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
                                        src={invitation.workspace_image || '/default-workspace.png'}
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
                  {invitation.workspace_name || 'Unknown Workspace'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {intl.formatMessage(
                    { id: 'homepage.invitations.invitedBy', defaultMessage: 'Invited by {inviter}' },
                    { inviter: invitation.inviter_username || 'Unknown User' }
                  )}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {new Date(invitation.created_at).toLocaleDateString()}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Close />}
                  onClick={() => handleInvitationResponse(invitation, 'declined')}
                  sx={{
                    minWidth: 'auto',
                    borderColor: 'error.main',
                    color: 'error.main',
                    '&:hover': {
                      borderColor: 'error.dark',
                      bgcolor: 'error.main',
                      color: 'error.contrastText'
                    }
                  }}
                >
                  {intl.formatMessage({ id: 'homepage.invitations.decline', defaultMessage: 'Decline' })}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Check />}
                  onClick={() => handleInvitationResponse(invitation, 'accepted')}
                  sx={{
                    minWidth: 'auto',
                    bgcolor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  }}
                >
                  {intl.formatMessage({ id: 'homepage.invitations.accept', defaultMessage: 'Accept' })}
                </Button>
              </Stack>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default Invitation;
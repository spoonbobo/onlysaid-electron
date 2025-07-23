import { Box, IconButton, Menu, MenuItem, Typography, Chip, Avatar, CircularProgress } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect, useCallback, memo } from "react";
import { FormattedMessage } from "react-intl";
import { useCurrentTopicContext } from "@/renderer/stores/Topic/TopicStore";
import { getUserFromStore } from "@/utils/user";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import MenuListItem from "@/renderer/components/Navigation/MenuListItem";
import { IWorkspaceUser, IWorkspaceJoin, IWorkspaceInvitation } from '@/../../types/Workspace/Workspace';

const getUserInitials = (username: string) => {
  return username ? username.substring(0, 2).toUpperCase() : 'U';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

// Helper function to check if user has specific policy permission
const hasPolicy = (policies: any, policyName: string): boolean => {
  if (!policies?.role_policies) return false;
  
  return policies.role_policies.some((policy: any) => 
    policy.name === policyName || 
    (policy.resource_type === 'user' && policy.action === 'admin') ||
    (policy.resource_type === 'workspace' && policy.action === 'admin')
  );
};

// Memoized MenuListItem content to avoid re-creating on each render
const JoinRequestLabel = memo(({ request }: { request: IWorkspaceJoin }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Avatar
      src={request.avatar}
      sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
    >
      {getUserInitials(request.username || '')}
    </Avatar>
    <Box>
      <Typography variant="body2" component="div" fontWeight="medium">
        {request.username || 'Unknown User'}
      </Typography>
      <Typography variant="caption" component="span" color="text.secondary">
        {formatDate(request.created_at)}
      </Typography>
    </Box>
  </Box>
));

const InvitationLabel = memo(({ invitation }: { invitation: IWorkspaceInvitation }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Avatar
      src={invitation.inviter_avatar}
      sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
    >
      {getUserInitials(invitation.inviter_username || '')}
    </Avatar>
    <Box>
      <Typography variant="body2" component="div" fontWeight="medium">
        {invitation.invitee_email}
      </Typography>
      <Typography variant="caption" component="span" color="text.secondary">
        Invited by {invitation.inviter_username || 'Unknown'} • {formatDate(invitation.created_at)}
      </Typography>
    </Box>
  </Box>
));

export default memo(function WorkspaceMembersMenu() {
  const { selectedContext } = useCurrentTopicContext();
  const {
    getJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    cancelInvitation,
    getUserInWorkspace,
    fetchPendingInvitations,
    getUserPolicies
  } = useWorkspaceStore();
  const invitations = useWorkspaceStore(state => state.pendingInvitations);

  const [joinRequests, setJoinRequests] = useState<IWorkspaceJoin[]>([]);
  const [workspaceUser, setWorkspaceUser] = useState<IWorkspaceUser | null>(null);
  const [userPolicies, setUserPolicies] = useState<any>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<{ type: 'join' | 'invite', id: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);

  const workspaceId = selectedContext?.id || '';
  const menuOpen = Boolean(menuAnchorEl);

  // Policy-based permission checking
  const canManageMembers = userPolicies && (
    hasPolicy(userPolicies, 'user.admin') ||
    hasPolicy(userPolicies, 'workspace.admin') ||
    hasPolicy(userPolicies, 'workspace.invite')
  );

  const canApproveJoinRequests = userPolicies && (
    hasPolicy(userPolicies, 'user.admin') ||
    hasPolicy(userPolicies, 'workspace.admin')
  );

  const canCancelInvitations = userPolicies && (
    hasPolicy(userPolicies, 'workspace.invite') ||
    hasPolicy(userPolicies, 'workspace.admin')
  );

  useEffect(() => {
    const fetchWorkspaceUser = async () => {
      setIsCheckingPermissions(true);
      const currentUser = getUserFromStore();
      if (currentUser?.id && workspaceId) {
        try {
          // Fetch workspace user info
          const user = await getUserInWorkspace(workspaceId, currentUser.id);
          setWorkspaceUser(user);

          // Fetch user policies
          const policies = await getUserPolicies(workspaceId, currentUser.id);
          setUserPolicies(policies);
          
          console.log('🔐 User policies for member management:', {
            userId: currentUser.id,
            workspaceId: workspaceId,
            policies: policies,
            canManageMembers: hasPolicy(policies, 'user.admin') || hasPolicy(policies, 'workspace.admin') || hasPolicy(policies, 'workspace.invite'),
            canApproveJoinRequests: hasPolicy(policies, 'user.admin') || hasPolicy(policies, 'workspace.admin'),
            canCancelInvitations: hasPolicy(policies, 'workspace.invite') || hasPolicy(policies, 'workspace.admin')
          });
        } catch (error) {
          console.error('Error fetching user permissions:', error);
          setUserPolicies(null);
          setWorkspaceUser(null);
        }
      }
      setIsCheckingPermissions(false);
    };

    fetchWorkspaceUser();
  }, [workspaceId, getUserInWorkspace, getUserPolicies]);

  useEffect(() => {
    const fetchData = async () => {
      if (!workspaceId || !canManageMembers || isCheckingPermissions) {
        setJoinRequests([]);
        return;
      }

      try {
        // Only fetch join requests if user can approve them
        if (canApproveJoinRequests) {
          const joinRequestsData = await getJoinRequests(workspaceId);
          setJoinRequests(joinRequestsData.filter((req: IWorkspaceJoin) => req.status === 'pending'));
        }
        
        // Only fetch invitations if user can cancel them
        if (canCancelInvitations) {
          await fetchPendingInvitations(workspaceId);
        }
      } catch (error) {
        console.error("Error fetching member data:", error);
      }
    };

    fetchData();
  }, [workspaceId, getJoinRequests, fetchPendingInvitations, refreshTrigger, canManageMembers, canApproveJoinRequests, canCancelInvitations, isCheckingPermissions]);

  const handleCloseMenu = useCallback(() => {
    setMenuAnchorEl(null);
    setSelectedItem(null);
  }, []);

  const handleApproveJoinRequest = useCallback(async (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canApproveJoinRequests) {
      console.warn('User does not have permission to approve join requests');
      return;
    }
    
    try {
      await approveJoinRequest(workspaceId, userId);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error approving join request:", error);
    }
    handleCloseMenu();
  }, [workspaceId, approveJoinRequest, handleCloseMenu, canApproveJoinRequests]);

  const handleRejectJoinRequest = useCallback(async (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canApproveJoinRequests) {
      console.warn('User does not have permission to reject join requests');
      return;
    }
    
    try {
      await rejectJoinRequest(workspaceId, userId);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error rejecting join request:", error);
    }
    handleCloseMenu();
  }, [workspaceId, rejectJoinRequest, handleCloseMenu, canApproveJoinRequests]);

  const handleCancelInvitation = useCallback(async (invitationId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canCancelInvitations) {
      console.warn('User does not have permission to cancel invitations');
      return;
    }
    
    try {
      await cancelInvitation(workspaceId, invitationId);
      // setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error cancelling invitation:", error);
    }
    handleCloseMenu();
  }, [workspaceId, cancelInvitation, handleCloseMenu, canCancelInvitations]);

  const handleContextMenu = useCallback((event: React.MouseEvent<HTMLElement>, type: 'join' | 'invite', id: string) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedItem({ type, id });
    setMenuAnchorEl(event.currentTarget);
  }, []);

  const handleItemClick = useCallback(() => { /* Placeholder if needed */ }, []);

  if (isCheckingPermissions) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!canManageMembers) {
    return (
      <Box sx={{ mt: 0.5, px: 0.5 }}>
        <Box sx={{ pl: 1, py: 0.25, color: 'text.secondary', fontSize: '0.875rem' }}>
          <FormattedMessage id="workspace.members.noPermission" defaultMessage="No permission to manage members" />
        </Box>
      </Box>
    );
  }

  try {
    return (
      <Box sx={{ mt: 0.5, px: 0.5 }}>
        {/* Join Requests Section - Only show if user can approve them */}
        {canApproveJoinRequests && (
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ pl: 1, mb: 0.25, color: 'text.secondary', fontSize: '0.75rem' }}>
              <FormattedMessage id="workspace.members.joinRequests" defaultMessage="Join Requests" />
              <Chip label={joinRequests.length} size="small" sx={{ ml: 0.5, height: 14, fontSize: '0.55rem' }} />
            </Typography>
            {joinRequests.length > 0 ? (
              joinRequests.map((request: IWorkspaceJoin) => (
                <MenuListItem
                  key={request.id}
                  label={<JoinRequestLabel request={request} />}
                  isSelected={false}
                  onClick={handleItemClick}
                  onContextMenu={(e) => handleContextMenu(e, 'join', request.user_id)}
                  endIcon={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        sx={{
                          p: 0.25,
                          color: 'success.main',
                          opacity: 0,
                          '&:hover': { opacity: 1 },
                          '.MuiListItemButton-root:hover &': { opacity: 1 }
                        }}
                        onClick={(e) => handleApproveJoinRequest(request.user_id, e)}
                        title="Approve"
                      >
                        <CheckIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={{
                          p: 0.25,
                          color: 'error.main',
                          opacity: 0,
                          '&:hover': { opacity: 1 },
                          '.MuiListItemButton-root:hover &': { opacity: 1 }
                        }}
                        onClick={(e) => handleRejectJoinRequest(request.user_id, e)}
                        title="Reject"
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  }
                  sx={{ pl: 1, py: 0.25 }}
                />
              ))
            ) : (
              <Typography variant="caption" sx={{ display: 'block', pl: 1, color: 'text.disabled', fontSize: '0.7rem' }}>
                <FormattedMessage id="workspace.members.noJoinRequests" defaultMessage="No pending join requests" />
              </Typography>
            )}
          </Box>
        )}

        {/* Invitations Section - Only show if user can cancel them */}
        {canCancelInvitations && (
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ pl: 1, mb: 0.25, color: 'text.secondary', fontSize: '0.75rem' }}>
              <FormattedMessage id="workspace.members.pendingInvitations" defaultMessage="Pending Invitations" />
              <Chip label={invitations.length} size="small" sx={{ ml: 0.5, height: 14, fontSize: '0.55rem' }} />
            </Typography>
            {invitations.length > 0 ? (
              invitations.map((invitation: IWorkspaceInvitation) => (
                <MenuListItem
                  key={invitation.id}
                  label={<InvitationLabel invitation={invitation} />}
                  isSelected={false}
                  onClick={handleItemClick}
                  onContextMenu={(e) => handleContextMenu(e, 'invite', invitation.id)}
                  endIcon={
                    <IconButton
                      size="small"
                      sx={{
                        p: 0.25,
                        color: 'error.main',
                        opacity: 0,
                        '&:hover': { opacity: 1 },
                        '.MuiListItemButton-root:hover &': { opacity: 1 }
                      }}
                      onClick={(e) => handleCancelInvitation(invitation.id, e)}
                      title="Cancel invitation"
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  }
                  sx={{ pl: 1, py: 0.25 }}
                />
              ))
            ) : (
              <Typography variant="caption" sx={{ display: 'block', pl: 1, color: 'text.disabled', fontSize: '0.7rem' }}>
                <FormattedMessage id="workspace.members.noPendingInvitations" defaultMessage="No pending invitations" />
              </Typography>
            )}
          </Box>
        )}

        <Menu
          anchorEl={menuAnchorEl}
          open={menuOpen}
          onClose={handleCloseMenu}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {selectedItem?.type === 'join' && canApproveJoinRequests && (
            [
              <MenuItem
                key="approve"
                onClick={() => selectedItem && handleApproveJoinRequest(selectedItem.id)}
                sx={{ minHeight: 36, fontSize: 14, color: 'success.main' }}
              >
                <FormattedMessage id="workspace.members.approve" defaultMessage="Approve Request" />
              </MenuItem>,
              <MenuItem
                key="reject"
                onClick={() => selectedItem && handleRejectJoinRequest(selectedItem.id)}
                sx={{ minHeight: 36, fontSize: 14, color: 'error.main' }}
              >
                <FormattedMessage id="workspace.members.reject" defaultMessage="Reject Request" />
              </MenuItem>
            ]
          )}
          {selectedItem?.type === 'invite' && canCancelInvitations && (
            <MenuItem
              key="cancel"
              onClick={() => selectedItem && handleCancelInvitation(selectedItem.id)}
              sx={{ minHeight: 36, fontSize: 14, color: 'error.main' }}
            >
              <FormattedMessage id="workspace.members.cancelInvite" defaultMessage="Cancel Invitation" />
            </MenuItem>
          )}
        </Menu>
      </Box>
    );
  } catch (error) {
    console.error("Error in WorkspaceMembersMenu:", error);
    return (
      <Box sx={{ p: 2, color: 'error.main' }}>
        An error occurred loading the members menu.
      </Box>
    );
  }
});

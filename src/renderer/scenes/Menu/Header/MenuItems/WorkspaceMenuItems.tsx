import { MenuItem, ListSubheader, Divider, Tooltip, IconButton, Box, Badge } from "@mui/material";
import { FormattedMessage } from "react-intl";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AddCommentIcon from "@mui/icons-material/AddComment";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import HomeIcon from "@mui/icons-material/Home";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import { useTopicStore } from "@/renderer/stores/Topic/TopicStore";
import { useChatStore } from "@/renderer/stores/Chat/ChatStore";
import { useNotificationStore } from "@/renderer/stores/Notification/NotificationStore";
import { getUserFromStore } from "@/utils/user";
import { useState } from "react";
import { useWorkspaceStore } from "@/renderer/stores/Workspace/WorkspaceStore";
import { useKBStore } from "@/renderer/stores/KB/KBStore";
import InviteUserDialog from "@/renderer/components/Dialog/Workspace/InviteUserToWorkspace";
import { IWorkspace } from "@/../../types/Workspace/Workspace";
import { IUser } from "@/../../types/User/User";


type WorkspaceMenuItemsProps = {
  handleClose: () => void;
};

function WorkspaceMenuItems({ handleClose }: WorkspaceMenuItemsProps) {
  const { setSelectedContext, selectedContext } = useTopicStore();
  const { getWorkspaceSectionNotificationCount } = useNotificationStore();

  const handleMenuItemClick = (section: string) => {
    const sectionId = `workspace:${section}`;
    const workspaceName = selectedContext?.name || "workspace";

    setSelectedContext({
      ...selectedContext,
      name: workspaceName,
      type: "workspace",
      section: sectionId
    });
    handleClose();
  };

  // Get current workspace ID for notifications
  const currentWorkspaceId = selectedContext?.id || selectedContext?.name || '';

  // Get notification counts for each workspace section
  const chatroomCount = getWorkspaceSectionNotificationCount(currentWorkspaceId, 'chatroom');
  const membersCount = getWorkspaceSectionNotificationCount(currentWorkspaceId, 'members');
  const knowledgeBaseCount = getWorkspaceSectionNotificationCount(currentWorkspaceId, 'knowledgeBase');

  return (
    <>
      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.workspace" />
      </ListSubheader>
      <MenuItem disabled onClick={() => handleMenuItemClick('home')} sx={{ minHeight: 36, fontSize: 14 }}>
        <HomeIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.workspace.home" />
      </MenuItem>
      <MenuItem onClick={() => handleMenuItemClick('chatroom')} sx={{ minHeight: 36, fontSize: 14 }}>
        <AddCommentIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <FormattedMessage id="menu.workspace.chatroom" />
          {chatroomCount > 0 && (
            <Badge
              badgeContent={chatroomCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 16,
                  minWidth: 16
                }
              }}
            >
              <Box sx={{ width: 8 }} />
            </Badge>
          )}
        </Box>
      </MenuItem>
      <MenuItem disabled onClick={() => handleMenuItemClick('plans')} sx={{ minHeight: 36, fontSize: 14 }}>
        <AssignmentIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.workspace.plans" />
      </MenuItem>

      <Divider sx={{ my: 1 }} />

      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.workspace.insights" />
      </ListSubheader>
      <MenuItem disabled onClick={() => handleMenuItemClick('trend')} sx={{ minHeight: 36, fontSize: 14 }}>
        <TrendingUpIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.workspace.trend" />
      </MenuItem>

      <Divider sx={{ my: 1 }} />

      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.workspace.manage" />
      </ListSubheader>
      <MenuItem onClick={() => handleMenuItemClick('members')} sx={{ minHeight: 36, fontSize: 14 }}>
        <PeopleIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <FormattedMessage id="menu.workspace.members" />
          {membersCount > 0 && (
            <Badge
              badgeContent={membersCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 16,
                  minWidth: 16
                }
              }}
            >
              <Box sx={{ width: 8 }} />
            </Badge>
          )}
        </Box>
      </MenuItem>
      <MenuItem onClick={() => handleMenuItemClick('knowledgeBase')} sx={{ minHeight: 36, fontSize: 14 }}>
        <SchoolIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <FormattedMessage id="menu.workspace.knowledgeBase" />
          {knowledgeBaseCount > 0 && (
            <Badge
              badgeContent={knowledgeBaseCount}
              color="error"
              max={99}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.6rem',
                  height: 16,
                  minWidth: 16
                }
              }}
            >
              <Box sx={{ width: 8 }} />
            </Badge>
          )}
        </Box>
      </MenuItem>
      <MenuItem disabled onClick={() => handleMenuItemClick('mcp')} sx={{ minHeight: 36, fontSize: 14 }}>
        <SettingsSuggestIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.workspace.mcp" />
      </MenuItem>

      <Divider sx={{ my: 1 }} />

      <MenuItem disabled onClick={() => handleMenuItemClick('exit')} sx={{ minHeight: 36, fontSize: 14, color: "error.main" }}>
        <ExitToAppIcon fontSize="small" sx={{ mr: 1.5, color: "error.main" }} />
        <FormattedMessage id="menu.workspace.exit" />
      </MenuItem>
    </>
  );
}

export const RenderWorkspaceActions = ({
  selectedSection,
  handleAction
}: {
  selectedSection: string | null,
  handleAction?: (action: string) => void
}) => {
  const { createChat, setActiveChat } = useChatStore();
  const { selectedContext, setSelectedTopic } = useTopicStore();
  const currentUser = getUserFromStore();
  const { openCreateKBDialog } = useKBStore();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const handleInviteUsers = async (invitations: Array<{ email: string; role: string; user: IUser }>) => {
    if (selectedContext?.id) {
      try {
        // Send invitations for each user
        for (const invitation of invitations) {
          await useWorkspaceStore.getState().sendInvitation(
            selectedContext.id,
            invitation.user.email
          );
        }

        handleAction?.('usersInvited');
      } catch (error) {
        console.error("Error inviting users:", error);
      }
    }
  };

  if (!selectedSection) {
    return null;
  }

  let actualContent: React.ReactNode = null;

  switch (selectedSection) {
    case 'chatroom':
      actualContent = (
        <Tooltip title={<FormattedMessage id="menu.workspace.newChatroom" />}>
          <IconButton
            size="small"
            onClick={async () => {
              if (currentUser && selectedContext?.id) {
                const workspaceId = selectedContext.id;
                const newChat = await createChat(currentUser.id || "", "workspace", workspaceId);

                if (newChat?.id) {
                  setSelectedTopic(selectedContext.section || 'workspace:chatroom', newChat.id);
                  setActiveChat(newChat.id, `${selectedContext.name}:${selectedContext.type}`);
                }
              }
              handleAction?.('newChatroom');
            }}
          >
            <AddCommentIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      );
      break;
    case 'knowledgeBase':
      actualContent = (
        <Tooltip title={<FormattedMessage id="settings.kb.createKB.title" defaultMessage="新增知識庫" />}>
          <IconButton
            size="small"
            onClick={() => {
              openCreateKBDialog();
              handleAction?.('openCreateKBDialog');
            }}
          >
            <LibraryAddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      );
      break;
    case 'members':
      actualContent = (
        <>
          <Tooltip title={<FormattedMessage id="menu.workspace.inviteUser" />}>
            <IconButton
              size="small"
              onClick={() => {
                setIsInviteDialogOpen(true);
                handleAction?.('openInviteDialog');
              }}
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <InviteUserDialog
            open={isInviteDialogOpen}
            onClose={() => setIsInviteDialogOpen(false)}
            onInvite={handleInviteUsers}
            workspace={selectedContext as unknown as IWorkspace}
          />
        </>
      );
      break;
    default:
      return null;
  }

  if (actualContent) {
    return (
      <Box sx={{
        display: 'flex',
        py: 0.5,
        px: 2,
        minHeight: '32px',
        backgroundColor: 'inherit',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {actualContent}
      </Box>
    );
  }

  return null;
};

export default WorkspaceMenuItems;

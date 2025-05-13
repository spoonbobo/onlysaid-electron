import { MenuItem, ListSubheader, Divider, Tooltip, IconButton } from "@mui/material";
import { FormattedMessage } from "react-intl";
import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AddCommentIcon from "@mui/icons-material/AddComment";
import PeopleIcon from "@mui/icons-material/People";
import SchoolIcon from "@mui/icons-material/School";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import HomeIcon from "@mui/icons-material/Home";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useChatStore } from "@/stores/Chat/ChatStore";
import { getUserFromStore } from "@/utils/user";
import { useState } from "react";
import { useWorkspaceStore } from "@/stores/Workspace/WorkspaceStore";
import InviteUserDialog from "@/components/Dialog/Workspace/AddUser";
import { IWorkspace } from "@/../../types/Workspace/Workspace";


type WorkspaceMenuItemsProps = {
  handleClose: () => void;
};

function WorkspaceMenuItems({ handleClose }: WorkspaceMenuItemsProps) {
  const { setSelectedContext, selectedContext } = useTopicStore();

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
        <FormattedMessage id="menu.workspace.chatroom" />
      </MenuItem>

      <Divider sx={{ my: 1 }} />

      <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
        <FormattedMessage id="menu.workspace.options" />
      </ListSubheader>
      <MenuItem disabled onClick={() => handleMenuItemClick('plans')} sx={{ minHeight: 36, fontSize: 14 }}>
        <AssignmentIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.workspace.plans" />
      </MenuItem>
      <MenuItem disabled onClick={() => handleMenuItemClick('calendar')} sx={{ minHeight: 36, fontSize: 14 }}>
        <CalendarMonthIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.workspace.calendar" />
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
        <FormattedMessage id="menu.workspace.members" />
      </MenuItem>
      <MenuItem disabled onClick={() => handleMenuItemClick('knowledgeBase')} sx={{ minHeight: 36, fontSize: 14 }}>
        <SchoolIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
        <FormattedMessage id="menu.workspace.knowledgeBase" />
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
  const { addUserToWorkspace } = useWorkspaceStore();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const handleInviteUser = async (email: string, role: string) => {
    if (selectedContext?.id && email) {
      try {
        await addUserToWorkspace(
          selectedContext.id, undefined, role, email);

        useWorkspaceStore.getState().getUsersByWorkspace(selectedContext.id);
        handleAction?.('userInvited');
      } catch (error) {
        console.error("Error inviting user:", error);
      }
    }
  };

  if (!selectedSection) return null;

  switch (selectedSection) {
    case 'chatroom':
      return (
        <Tooltip title={<FormattedMessage id="menu.workspace.newChatroom" />}>
          <IconButton
            size="small"
            onClick={async () => {
              if (currentUser && selectedContext?.id) {
                const newChat = await createChat(currentUser.id || "", "workspace", selectedContext.id);

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
    case 'members':
      return (
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
            onInvite={handleInviteUser}
            workspace={selectedContext as unknown as IWorkspace}
          />
        </>
      );
    default:
      return null;
  }
};

export default WorkspaceMenuItems;

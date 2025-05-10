import { MenuItem, ListSubheader, Divider, Tooltip, IconButton } from "@mui/material";
import { FormattedMessage } from "react-intl";
import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AddCommentIcon from "@mui/icons-material/AddComment";
import { useTopicStore } from "@/stores/Topic/TopicStore";

type WorkspaceMenuItemsProps = {
    handleClose: () => void;
};

function WorkspaceMenuItems({ handleClose }: WorkspaceMenuItemsProps) {
    const { setSelectedContext, selectedContext } = useTopicStore();

    const handleMenuItemClick = (section: string) => {
        const contextId = `workspace:${section}`;
        const workspaceName = selectedContext?.name || "workspace";

        setSelectedContext({
            id: contextId,
            name: workspaceName,
            type: "workspace",
            section: contextId
        });
        handleClose();
    };

    return (
        <>
            <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
                <FormattedMessage id="menu.workspace" />
            </ListSubheader>
            <MenuItem onClick={() => handleMenuItemClick('addNewChat')} sx={{ minHeight: 36, fontSize: 14 }}>
                <AddCommentIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
                <FormattedMessage id="menu.workspace.addNewChat" />
            </MenuItem>

            <Divider sx={{ my: 1 }} />

            <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
                <FormattedMessage id="menu.workspace.options" />
            </ListSubheader>
            <MenuItem onClick={() => handleMenuItemClick('plans')} sx={{ minHeight: 36, fontSize: 14 }}>
                <SettingsIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
                <FormattedMessage id="menu.workspace.plans" />
            </MenuItem>
            <MenuItem onClick={() => handleMenuItemClick('calendar')} sx={{ minHeight: 36, fontSize: 14 }}>
                <CalendarMonthIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
                <FormattedMessage id="menu.workspace.calendar" />
            </MenuItem>

            <Divider sx={{ my: 1 }} />

            <ListSubheader sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", bgcolor: "background.paper", lineHeight: 2, px: 2 }}>
                <FormattedMessage id="menu.workspace.manage" />
            </ListSubheader>
            <MenuItem onClick={() => handleMenuItemClick('exit')} sx={{ minHeight: 36, fontSize: 14, color: "error.main" }}>
                <ExitToAppIcon fontSize="small" sx={{ mr: 1.5, color: "error.main" }} />
                <FormattedMessage id="menu.workspace.exit" />
            </MenuItem>
        </>
    );
}

// Add actions that can be rendered elsewhere if needed
export const renderWorkspaceActions = ({
    selectedSection,
    handleAction
}: {
    selectedSection: string | null,
    handleAction?: (action: string) => void
}) => {
    if (!selectedSection) return null;

    switch (selectedSection) {
        case 'addNewChat':
            return (
                <Tooltip title={<FormattedMessage id="menu.workspace.newChat" />}>
                    <IconButton
                        size="small"
                        onClick={() => handleAction?.('newChat')}
                    >
                        <AddCommentIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            );
        default:
            return null;
    }
};

export default WorkspaceMenuItems;
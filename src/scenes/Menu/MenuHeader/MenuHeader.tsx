import { Box, Typography, IconButton, Menu, Divider } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useChatStore } from "@/stores/Chat/chatStore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import AddNewFriend from "@/components/Dialog/AddNewFriend";
import HomeMenuItems from "./MenuItems/HomeMenuItems";
import WorkspaceMenuItems from "./MenuItems/WorkspaceMenuItems";
import SettingsMenuItems from "./MenuItems/SettingsMenuItems";
import DefaultMenuItems from "./MenuItems/DefaultMenuItems";
import { useUserStore } from "@/stores/User/UserStore";

function MenuHeader() {
    const user = useUserStore((state) => state.user);
    const selectedContext = useTopicStore((state) => state.selectedContext);
    const createChat = useChatStore((state) => state.createChat);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleCreateChat = async () => {
        if (user?.id) {
            await createChat(user.id, 'agent');
        }
    };

    const renderMenuItems = () => {
        switch (selectedContext?.type) {
            case 'home':
                return <HomeMenuItems
                    handleClose={handleClose}
                    setShowAddFriendDialog={setShowAddFriendDialog}
                    handleCreateChat={handleCreateChat}
                />;
            case 'workspace':
                return <WorkspaceMenuItems
                    handleClose={handleClose}
                />;
            case 'settings':
                return <SettingsMenuItems
                    handleClose={handleClose}
                />;
            default:
                return <DefaultMenuItems
                    handleClose={handleClose}
                />;
        }
    };

    // Extract section name from the workspace:XXXX format
    const getSectionDisplayName = () => {
        if (selectedContext?.type === 'workspace' && selectedContext?.section) {
            const section = selectedContext.section.split(':')[1];
            if (section) {
                return `menu.workspace.${section}`;
            }
        }
        return null;
    };

    const sectionDisplayId = getSectionDisplayName();

    // Use specific workspace name for display
    const getHeaderText = () => {
        if (selectedContext?.type === 'workspace') {
            return selectedContext.name || 'workspace';
        }
        return selectedContext?.name;
    };

    return (
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                {selectedContext?.type === 'workspace' ? (
                    <>
                        {getHeaderText()}
                        {sectionDisplayId && (
                            <>
                                <span> / </span>
                                <FormattedMessage id={sectionDisplayId} />
                            </>
                        )}
                    </>
                ) : (
                    <FormattedMessage id={`menu.${selectedContext?.name}`} />
                )}
            </Typography>

            <IconButton onClick={handleClick} size="small">
                <MoreVertIcon />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                {renderMenuItems()}
                {selectedContext?.type === 'settings' && <Divider sx={{ my: 1 }} />}
            </Menu>

            <AddNewFriend open={showAddFriendDialog} onClose={() => setShowAddFriendDialog(false)} />
        </Box>
    );
}

export default MenuHeader;
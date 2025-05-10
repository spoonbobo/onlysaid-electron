import { Box, Typography, IconButton, Menu } from "@mui/material";
import { FormattedMessage } from "react-intl";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useChatStore } from "@/stores/Chat/chatStore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState, useEffect } from "react";
import AddNewFriend from "@/components/Dialog/AddNewFriend";
import HomeMenuItems, { renderCategoryActions } from "./MenuItems/HomeMenuItems";
import WorkspaceMenuItems, { renderWorkspaceActions } from "./MenuItems/WorkspaceMenuItems";
import SettingsMenuItems, { renderSettingsActions } from "./MenuItems/SettingsMenuItems";
import DefaultMenuItems from "./MenuItems/DefaultMenuItems";
import { useUserStore } from "@/stores/User/UserStore";

function MenuHeader() {
    const user = useUserStore((state) => state.user);
    const selectedContext = useTopicStore((state) => state.selectedContext);
    const setSelectedContext = useTopicStore((state) => state.setSelectedContext);
    const createChat = useChatStore((state) => state.createChat);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number, left: number } | null>(null);
    const open = Boolean(anchorEl) || Boolean(menuPosition);
    const [showAddFriendDialog, setShowAddFriendDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(
        selectedContext?.type === 'home' ? selectedContext.section || null : null
    );

    useEffect(() => {
        if (selectedContext?.type === 'home' && selectedContext.section) {
            setSelectedCategory(selectedContext.section);
        }
    }, [selectedContext]);

    const selectedSection = selectedContext?.type === 'workspace' ?
        selectedContext.section?.split(':')[1] || null :
        selectedContext?.type === 'settings' ?
            selectedContext.section || null : null;

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        if (selectedContext) {
            setSelectedContext({
                ...selectedContext,
                section: category
            });
        }
    };

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setMenuPosition(null);
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setMenuPosition(null);
    };

    const handleCreateChat = async () => {
        if (user?.id) {
            await createChat(user.id, 'agent');
        }
    };

    const handleWorkspaceAction = (action: string) => {
        console.log('Workspace action:', action);
    };

    const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => {
        event.preventDefault();
        setAnchorEl(null);
        setMenuPosition({
            top: event.clientY,
            left: event.clientX,
        });
    };

    const renderMenuItems = () => {
        switch (selectedContext?.type) {
            case 'home':
                return <HomeMenuItems
                    handleClose={handleClose}
                    setSelectedCategory={handleCategorySelect}
                    selectedCategory={selectedCategory}
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

    const renderHeaderTitle = () => {
        if (selectedContext?.type === 'workspace') {
            return (
                <>
                    <FormattedMessage id="menu.workspace" />
                    {selectedSection && (
                        <> / <FormattedMessage id={`menu.workspace.${selectedSection}`} /></>
                    )}
                </>
            );
        } else if (selectedContext?.type === 'settings') {
            return (
                <>
                    <FormattedMessage id="menu.settings" />
                    {selectedSection && (
                        <> / <FormattedMessage id={`settings.${selectedSection}`} /></>
                    )}
                </>
            );
        } else {
            return (
                <>
                    <FormattedMessage id={`menu.${selectedContext?.name}`} />
                    {selectedCategory && selectedContext?.type === 'home' && (
                        <> / <FormattedMessage id={`menu.home.${selectedCategory}`} /></>
                    )}
                </>
            );
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                overflow: 'hidden'
            }}
            onContextMenu={handleContextMenu}
        >
            <Box sx={{
                borderBottom: 1,
                borderColor: "divider",
                width: '100%',
                overflow: 'hidden'
            }}>
                <Box sx={{
                    px: 2,
                    py: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: '100%',
                    pb: ((selectedCategory && selectedContext?.type === 'home') ||
                        (selectedSection && (selectedContext?.type === 'workspace' || selectedContext?.type === 'settings'))) ? 0 : 1
                }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {renderHeaderTitle()}
                    </Typography>

                    <IconButton onClick={handleClick} size="small">
                        <MoreVertIcon />
                    </IconButton>

                    <Menu
                        anchorEl={anchorEl}
                        anchorReference={menuPosition ? 'anchorPosition' : 'anchorEl'}
                        anchorPosition={menuPosition || undefined}
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
                    </Menu>
                </Box>

                {(() => {
                    let actionContent = null;

                    if (selectedContext?.type === 'home' && selectedCategory) {
                        actionContent = renderCategoryActions({
                            selectedCategory,
                            setShowAddFriendDialog,
                            handleCreateChat
                        });
                    } else if (selectedContext?.type === 'workspace' && selectedSection) {
                        actionContent = renderWorkspaceActions({
                            selectedSection,
                            handleAction: handleWorkspaceAction
                        });
                    } else if (selectedContext?.type === 'settings' && selectedSection) {
                        actionContent = renderSettingsActions({
                            selectedSection,
                            handleAction: (action) => console.log('Settings action:', action)
                        });
                    }

                    return actionContent ? (
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
                            {actionContent}
                        </Box>
                    ) : null;
                })()}
            </Box>

            <AddNewFriend
                open={showAddFriendDialog}
                onClose={() => setShowAddFriendDialog(false)}
            />
        </Box>
    );
}

export default MenuHeader;
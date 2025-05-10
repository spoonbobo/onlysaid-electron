import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Avatar,
    IconButton
} from "@mui/material";
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useState, useEffect, useRef } from "react";
import { useTopicStore, TopicContext } from "@/stores/Topic/TopicStore";
import { useWorkspaceStore } from "@/stores/Workspace/WorkspaceStore";
import { FormattedMessage } from "react-intl";
import { getUserFromStore } from "@/utils/user";

interface AddWorkspaceDialogProps {
    open: boolean;
    onClose: () => void;
}

function AddWorkspaceDialog({ open, onClose }: AddWorkspaceDialogProps) {
    const [workspaceName, setWorkspaceName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [error, setError] = useState("");
    const [workspaceImage, setWorkspaceImage] = useState<string>("/workspace-icon.png");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { addContext, setSelectedContext } = useTopicStore();
    const { createWorkspace } = useWorkspaceStore();

    const generateInviteCode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };

    useEffect(() => {
        if (open) {
            setInviteCode(generateInviteCode());
            setWorkspaceImage("/workspace-icon.png");
        }
    }, [open]);

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setWorkspaceImage(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateWorkspace = async () => {
        if (!workspaceName.trim()) {
            setError("Workspace name is required");
            return;
        }

        try {
            const currentUser = getUserFromStore();
            const userId = currentUser?.id || "";

            const newWorkspace = await createWorkspace({
                name: workspaceName.trim(),
                image: workspaceImage,
                invite_code: inviteCode,
                members: [userId],
                super_admins: [userId],
                admins: [userId],
                settings: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            const newWorkspaceContext: TopicContext = {
                name: workspaceName.trim().toLowerCase(),
                type: "workspace" as const,
                id: newWorkspace.id
            };

            addContext(newWorkspaceContext);
            setSelectedContext(newWorkspaceContext);

            setWorkspaceName("");
            setInviteCode("");
            setWorkspaceImage("/workspace-icon.png");
            setError("");
            onClose();
        } catch (error: any) {
            setError(error.message || "Failed to create workspace");
        }
    };

    const handleCancel = () => {
        setWorkspaceName("");
        setInviteCode("");
        setWorkspaceImage("/workspace-icon.png");
        setError("");
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <FormattedMessage id="workspace.create.title" defaultMessage="Create Workspace" />
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <input
                        type="file"
                        hidden
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                    <Box
                        sx={{
                            position: 'relative',
                            cursor: 'pointer'
                        }}
                        onClick={handleImageClick}
                    >
                        <Avatar
                            src={workspaceImage}
                            alt="Workspace"
                            sx={{
                                width: 80,
                                height: 80
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.4)',
                                borderRadius: '50%'
                            }}
                        >
                            <PhotoCameraIcon sx={{ color: 'white' }} />
                        </Box>
                    </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                    <TextField
                        autoFocus
                        label={<FormattedMessage id="workspace.create.name" defaultMessage="Workspace Name" />}
                        fullWidth
                        value={workspaceName}
                        onChange={(e) => {
                            setWorkspaceName(e.target.value);
                            setError("");
                        }}
                        error={!!error}
                        helperText={error}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        label={<FormattedMessage id="workspace.create.inviteCode" defaultMessage="Invite Code" />}
                        fullWidth
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        slotProps={{ input: { attrs: { maxLength: 6 } } }}
                        sx={{ mb: 2 }}
                        helperText={<FormattedMessage id="workspace.create.inviteCodeHelp" defaultMessage="6-character code for others to join this workspace" />}
                    />
                    <Typography variant="body2" color="text.secondary">
                        <FormattedMessage id="workspace.create.description" defaultMessage="Create a new workspace to organize your content and collaborate with others." />
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>
                    <FormattedMessage id="common.close" />
                </Button>
                <Button onClick={handleCreateWorkspace} variant="contained" color="primary">
                    <FormattedMessage id="common.create" />
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default AddWorkspaceDialog;